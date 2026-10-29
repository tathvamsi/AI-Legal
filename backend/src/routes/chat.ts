import { Router, Request, Response } from "express";
import { query, queryOne, transaction } from "../lib/db";
import { authMiddleware } from "../middleware/auth";
import { getEmbeddingProvider } from "../lib/embedding";
import { searchChunks } from "../lib/qdrant";
import { getLLMProvider } from "../lib/llm";

const router = Router();
router.use(authMiddleware);

const MAX_CASE_RESULTS = 6;
const MAX_LEG_RESULTS = 4;

function snippet(text: string, len = 260): string {
  const t = (text || "").replace(/\s+/g, " ").trim();
  return t.length > len ? t.slice(0, len).trim() + "…" : t;
}

async function retrieveCaseFiles({
  queryText,
  ownerId,
  matterId,
  vector,
}: {
  queryText: string;
  ownerId: string;
  matterId?: string;
  vector: number[];
}) {
  const semantic = await searchChunks(vector, {
    ownerId,
    matterId,
    scope: "PRIVATE",
    limit: MAX_CASE_RESULTS,
  });

  const keywordRows = await query(
    `SELECT id, matter_id, owner_id, scope, content, page, chunk_id, qdrant_id,
            ts_rank_cd(to_tsvector('english', content), plainto_tsquery('english', $3)) AS rank
     FROM document_chunks
     WHERE owner_id = $1::uuid
       AND ($2::text IS NULL OR matter_id = $2::uuid)
       AND scope = 'PRIVATE'
       AND plainto_tsquery('english', $3) @@ to_tsvector('english', content)
     ORDER BY rank DESC
     LIMIT $4`,
    [ownerId, matterId ?? null, queryText, MAX_CASE_RESULTS]
  );

  const seen = new Set<string>();
  const results: any[] = [];
  const add = (r: any, source: string) => {
    const sid = r.sourceId || r.qdrant_id || r.id;
    if (seen.has(sid)) return;
    seen.add(sid);
    results.push({ ...r, sourceId: sid, _matchSource: source });
  };
  const isMockEmbedding = (process.env.EMBEDDING_PROVIDER || "mock").toLowerCase() === "mock";
  for (const r of semantic) {
    // Only accept semantic results if confidence score is genuinely high, or not mock
    if ((!isMockEmbedding && (r.score ?? 0) >= 0.72) || keywordRows.length > 0) {
      add({ ...r.payload, sourceId: r.id }, "semantic");
    }
  }
  for (const r of keywordRows) add({ ...r, sourceId: r.qdrant_id }, "keyword");

  return results
    .map((r) => ({
      sourceId: r.sourceId,
      sourceName: r.filename || "Case file",
      page: r.page,
      section: null,
      excerpt: snippet(r.content),
      scope: r.scope || "PRIVATE",
      content: r.content,
      sourceType: "CASE_FILE" as const,
    }))
    .slice(0, MAX_CASE_RESULTS);
}

async function retrieveLegislation({ queryText }: { queryText: string }) {
  const rows = await query(
    `SELECT s.id, s.number, s.title, s.content, s.provenance, s.source_url, a.name AS act_name, a.year
     FROM sections s
     JOIN acts a ON a.id = s.act_id
     WHERE s.is_published = TRUE
       AND (plainto_tsquery('english', $1) @@ to_tsvector('english', s.content)
            OR s.number ILIKE $2 OR s.title ILIKE $2)
     ORDER BY s.number
     LIMIT $3`,
    [`${queryText}:*`, `%${queryText}%`, MAX_LEG_RESULTS]
  );
  return rows.map((r) => ({
    sourceId: r.id,
    sourceName: `${r.act_name || "Act"}, ${r.year ? r.year + ", " : ""}Section ${r.number}${r.title ? ` — ${r.title}` : ""}`,
    page: null,
    section: r.number,
    excerpt: snippet(r.content),
    scope: "SHARED",
    content: r.content,
    sourceType: "LEGISLATION" as const,
    actName: r.act_name,
    actYear: r.year,
    sectionNumber: r.number,
  }));
}

function buildContext(sources: any[]): string {
  if (!sources || sources.length === 0) return "";
  return (
    "[CONTEXT]\n" +
    sources
      .map(
        (s, i) =>
          `[${i + 1}] ${s.sourceType === "LEGISLATION" ? "LEGISLATION" : "CASE FILE"} | ${s.sourceName}` +
          (s.section ? ` | §${s.section}` : "") +
          (s.page ? ` | p.${s.page}` : "") +
          ` | ${s.scope}\n${s.excerpt}`
      )
      .join("\n\n")
  );
}

router.post("/", async (req: Request, res: Response) => {
  const session = req.session!;
  const { conversationId, matterId, message } = req.body || {};

  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Message required" });
  }

  let convId = conversationId;
  if (convId) {
    const conv = await queryOne<{ id: string; owner_id: string; matter_id: string | null }>(
      "SELECT id, owner_id, matter_id FROM conversations WHERE id = $1::uuid",
      [convId]
    );
    if (!conv || conv.owner_id !== session.userId) {
      return res.status(404).json({ error: "Conversation not found" });
    }
  } else {
    if (!matterId) {
      return res.status(400).json({ error: "Matter required for new conversation" });
    }
    const matter = await queryOne<{ id: string }>(
      `SELECT id FROM matters WHERE id = $1::uuid AND ($2::text IS NULL OR firm_id = $2::uuid) AND (owner_id = $3::uuid OR $4 = 'ADMIN')`,
      [matterId, session.firmId ?? null, session.userId, session.role]
    );
    if (!matter) return res.status(404).json({ error: "Matter not found or access denied" });
    const created = await queryOne<{ id: string }>(
      "INSERT INTO conversations (matter_id, owner_id, title) VALUES ($1, $2, $3) RETURNING id",
      [matterId, session.userId, message.trim().slice(0, 60)]
    );
    if (!created) return res.status(500).json({ error: "Failed to create conversation" });
    convId = created.id;
  }

  // Save user message
  await query(
    "INSERT INTO messages (conversation_id, owner_id, role, content) VALUES ($1, $2, 'USER', $3)",
    [convId, session.userId, message.trim()]
  );

  // Setup SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Load matter context
  const matter = await queryOne<{ name: string; client: string | null; court: string | null; case_number: string | null }>(
    "SELECT name, client, court, case_number FROM matters WHERE id = $1::uuid",
    [matterId]
  );

  // Load prior conversation history for multi-turn conversational reasoning
  const historyRows = await query<{ role: string; content: string }>(
    "SELECT role, content FROM messages WHERE conversation_id = $1::uuid AND role IN ('USER', 'ASSISTANT') ORDER BY created_at ASC LIMIT 10",
    [convId]
  );
  const historyMessages = (historyRows || [])
    .slice(0, -1)
    .map((m) => ({
      role: (m.role === "USER" ? "user" : "assistant") as "user" | "assistant",
      content: m.content,
    }));

  // Retrieval
  const provider = getEmbeddingProvider();
  const [queryVector] = await provider.embed([message.trim()]);
  const [caseFiles, legislation] = await Promise.all([
    retrieveCaseFiles({ queryText: message.trim(), ownerId: session.userId, matterId, vector: queryVector }),
    retrieveLegislation({ queryText: message.trim() }),
  ]);

  const sources = [...caseFiles, ...legislation];
  const context = buildContext(sources);
  const hasSources = sources.length > 0;
  const isGreeting = /^(hi|hello|hey|good morning|good afternoon|good evening|greetings|howdy|sup|yo)\b/i.test(message.trim());

  let systemInstructions = "";
  if (isGreeting) {
    systemInstructions = `You are Soli, a premier AI litigation counsel and research paralegal for Indian advocates. Respond with an executive, professional, and welcoming tone. State that you are ready to assist with case filings${matter?.name ? ` for "${matter.name}"` : ""}, statutory interpretations, and litigation drafting.`;
  } else {
    systemInstructions = `You are Soli, a premier AI Litigation Counsel and Research Paralegal specialized in Indian Law.
Active Matter: "${matter?.name || "Legal Consultation"}"${matter?.court ? ` | Forum: ${matter.court}` : ""}${matter?.case_number ? ` | Case No: ${matter.case_number}` : ""}${matter?.client ? ` | Client: ${matter.client}` : ""}.

OPERATING PRINCIPLES:
1. GROUNDED EVIDENCE: When case-specific records or statutory text appear in [CONTEXT], ground factual findings in those records and cite them with exact numerical tags like [1], [2].
2. GENERAL LEGAL INTELLIGENCE: You possess exhaustive knowledge of Indian Law (CPC 1908, Indian Contract Act 1872, Arbitration and Conciliation Act 1996, Specific Relief Act 1963, Limitation Act 1963, Companies Act 2013, Commercial Courts Act 2015, IPC/BNS, CrPC/BNSS, Indian Evidence Act/BSA, and Constitutional Law).
3. NEVER REFUSE GENERAL QUESTIONS: If the user asks a general legal question, procedural inquiry (such as limitation, bail parameters, interim injunctions, plaint rejection, arbitral appointments), or legal drafting request, NEVER state that documents could not be found. Provide a thorough, authoritative legal analysis citing relevant sections, landmark Supreme Court / High Court precedents, and tactical checklists.
4. LEGAL DRAFTING: When asked to draft notices, plaints, applications, or affidavits, produce structured, formal drafts formatted to Indian court conventions (Court name, Parties, Averments, Grounds, Prayer).
5. STRUCTURE & TONE: Professional, authoritative, executive legal tone. Use Markdown headings, bullet points, and statutory references.`;
  }

  const llm = getLLMProvider();
  let fullText = "";
  let citations: any[] = [];
  const abortController = new AbortController();

  req.on("close", () => {
    abortController.abort();
  });

  try {
    const result = await llm.streamText({
      messages: [
        { role: "system" as const, content: systemInstructions },
        ...(hasSources && !isGreeting
          ? [{ role: "system" as const, content: `[CONTEXT]\n${context}` }]
          : []),
        ...historyMessages,
        { role: "user" as const, content: message.trim() },
      ],
      signal: abortController.signal,
      onToken: (token: string) => {
        fullText += token;
        if (!res.writableEnded && !abortController.signal.aborted) {
          try {
            res.write(`data: ${JSON.stringify({ type: "token", delta: token })}\n\n`);
          } catch {}
        }
      },
    });

    if (result.text && !fullText) {
      fullText = result.text;
    }
    citations = result.citations || [];
  } catch (err: any) {
    if (!res.writableEnded && !abortController.signal.aborted) {
      try {
        res.write(`data: ${JSON.stringify({ type: "error", error: err.message || "Failed to generate response" })}\n\n`);
      } catch {}
    }
  }

  // Map inline citations to sources
  const citedSources: any[] = [];
  if (!isGreeting && hasSources) {
    const citationIndexMap: Record<number, any> = {};
    sources.forEach((s, i) => { citationIndexMap[i + 1] = s; });
    const found = [...fullText.matchAll(/\[(\d+)\]/g)].map((m) => parseInt(m[1], 10));
    for (const n of found) {
      if (citationIndexMap[n] && !citedSources.some((c) => c.index === n)) {
        citedSources.push({ index: n, ...citationIndexMap[n] });
      }
    }
  }

  // Save assistant message + citations
  if (fullText.trim()) {
    try {
      await transaction(async (client) => {
        const msg = (await client.query(
          "INSERT INTO messages (conversation_id, owner_id, role, content) VALUES ($1, $2, 'ASSISTANT', $3) RETURNING id",
          [convId, session.userId, fullText.trim()]
        )).rows[0];
        const messageId = msg.id;
        for (const c of citedSources) {
          await client.query(
            `INSERT INTO citations (message_id, source_type, source_id, source_name, page, section, excerpt, scope)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [messageId, c.sourceType, c.sourceId, c.sourceName, c.page ?? null, c.section ?? null, c.excerpt, c.scope]
          );
        }
      });
    } catch (err: any) {
      console.error("[SOLI] failed to persist assistant message:", err.message);
    }
  }

  if (!res.writableEnded && !abortController.signal.aborted) {
    try {
      res.write(`data: ${JSON.stringify({ type: "done", citations: citedSources, messageId: convId })}\n\n`);
      res.end();
    } catch {}
  }
});

export default router;
