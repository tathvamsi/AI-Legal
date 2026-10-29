import { Router, Request, Response } from "express";
import { query, queryOne } from "../lib/db";
import { authMiddleware } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

// List conversations
router.get("/", async (req: Request, res: Response) => {
  const session = req.session!;
  const matterId = req.query.matterId as string | undefined;

  try {
    let sql = `
      SELECT c.id, c.matter_id, c.title, c.created_at, c.updated_at,
             m.name AS matter_name
      FROM conversations c
      LEFT JOIN matters m ON m.id = c.matter_id
      WHERE c.owner_id = $1::uuid
    `;
    const params: any[] = [session.userId];
    if (matterId) {
      sql += ` AND c.matter_id = $2::uuid`;
      params.push(matterId);
    }
    sql += ` ORDER BY c.updated_at DESC`;

    const conversations = await query(sql, params);
    return res.json({ conversations });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch conversations" });
  }
});

// Create conversation
router.post("/", async (req: Request, res: Response) => {
  const session = req.session!;
  const { matterId, title } = req.body || {};
  if (!matterId) return res.status(400).json({ error: "Matter required" });

  try {
    const created = await queryOne<{ id: string }>(
      "INSERT INTO conversations (matter_id, owner_id, title) VALUES ($1, $2, $3) RETURNING id",
      [matterId, session.userId, title || "New consultation"]
    );
    if (!created) return res.status(500).json({ error: "Failed to create conversation" });
    return res.status(201).json({ conversation: { id: created.id, title: title || "New consultation" } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create conversation" });
  }
});

// Get messages for conversation
router.get("/:id/messages", async (req: Request, res: Response) => {
  const session = req.session!;
  const { id } = req.params;

  try {
    const conv = await queryOne<{ id: string; owner_id: string }>(
      "SELECT id, owner_id FROM conversations WHERE id = $1::uuid",
      [id]
    );
    if (!conv || conv.owner_id !== session.userId) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const messages = await query(
      `SELECT id, role, content, created_at FROM messages WHERE conversation_id = $1::uuid ORDER BY created_at ASC`,
      [id]
    );

    const messagesWithCitations = await Promise.all(
      messages.map(async (m) => {
        let citations: any[] = [];
        if (m.role === "ASSISTANT") {
          citations = await query(
            `SELECT id, source_type, source_name, page, section, excerpt, scope FROM citations WHERE message_id = $1::uuid ORDER BY id ASC`,
            [m.id]
          );
        }
        return { ...m, citations };
      })
    );

    return res.json({ messages: messagesWithCitations });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch messages" });
  }
});

export default router;
