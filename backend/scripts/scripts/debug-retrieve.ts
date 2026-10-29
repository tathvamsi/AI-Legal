import "dotenv/config";
import { getEmbeddingProvider } from "../src/lib/embedding";
import { searchChunks } from "../src/lib/qdrant";
import { query } from "../src/lib/db";

async function main() {
  const ownerId = "581f8268-bb5a-425c-901a-70230ef7ada5"; // rohan
  const matterId = "26d4f5f1-f6f6-48d9-9f90-98d3a999c561";
  const provider = getEmbeddingProvider();
  const [v] = await provider.embed(["compensation petitioner"]);
  console.log("query vector dim:", v.length);

  // Qdrant collection count
  try {
    const coll = await (fetch as any)("http://localhost:6333/collections/soli_documents");
    const j = await coll.json();
    console.log("qdrant collection:", JSON.stringify(j, null, 1).slice(0, 600));
  } catch (e) {
    console.log("qdrant err", e);
  }

  const semantic = await searchChunks(v, { ownerId, matterId, scope: "PRIVATE", limit: 6 });
  console.log("semantic results:", semantic.length);
  semantic.forEach((r) => console.log("  -", r.payload.filename, "p", r.payload.page, "score", r.score, "excerpt:", (r.payload.content || "").slice(0, 80)));

  // keyword
  const rows = await query(
    `SELECT id, content, page, ts_rank_cd(to_tsvector('english', content), plainto_tsquery('english', $1)) AS rank
     FROM document_chunks
     WHERE owner_id = $2::uuid AND scope = 'PRIVATE'
       AND plainto_tsquery('english', $1) @@ to_tsvector('english', content)
     ORDER BY rank DESC LIMIT 6`,
    ["compensation petitioner", ownerId]
  );
  console.log("keyword results:", rows.length);
  rows.forEach((r) => console.log("  - p", r.page, "rank", r.rank, (r.content || "").slice(0, 80)));
}
main().catch((e) => { console.error(e); process.exit(1); });
