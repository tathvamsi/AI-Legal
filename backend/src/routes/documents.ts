import { Router, Request, Response } from "express";
import multer from "multer";
import { query, queryOne, transaction } from "../lib/db";
import { authMiddleware } from "../middleware/auth";
import { getEmbeddingProvider } from "../lib/embedding";
import { ensureCollection, upsertChunks } from "../lib/qdrant";
import { extractPages } from "../lib/extract";
import { chunkPages } from "../lib/chunk";
import { writeFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import crypto from "crypto";

const router = Router();
router.use(authMiddleware);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB
});

const STORAGE_DIR = process.env.STORAGE_DIR || "./uploads";

// Get documents for matter
router.get("/:matterId/documents", async (req: Request, res: Response) => {
  const session = req.session!;
  const matterId = req.params.matterId as string;

  try {
    let matterSql = `SELECT id FROM matters WHERE id = $1::uuid`;
    const mParams: any[] = [matterId];
    if (session.role !== "ADMIN") {
      matterSql += ` AND owner_id = $2::uuid`;
      mParams.push(session.userId);
    } else {
      matterSql += ` AND firm_id = $2::uuid`;
      mParams.push(session.firmId);
    }
    const matter = await queryOne(matterSql, mParams);
    if (!matter) return res.status(404).json({ error: "Matter not found" });

    const docs = await query(
      `SELECT id, filename, original_name, mime_type, size, status, page_count, error, created_at, updated_at
       FROM documents WHERE matter_id = $1::uuid ORDER BY created_at DESC`,
      [matterId]
    );
    return res.json({ documents: docs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch documents" });
  }
});

// Upload document to matter
router.post("/:matterId/documents", upload.single("file"), async (req: Request, res: Response) => {
  const session = req.session!;
  const matterId = req.params.matterId as string;
  const file = req.file;

  if (!file) return res.status(400).json({ error: "No file provided" });

  try {
    let matterSql = `SELECT id, owner_id FROM matters WHERE id = $1::uuid`;
    const mParams: any[] = [matterId];
    if (session.role !== "ADMIN") {
      matterSql += ` AND owner_id = $2::uuid`;
      mParams.push(session.userId);
    } else {
      matterSql += ` AND firm_id = $2::uuid`;
      mParams.push(session.firmId);
    }
    const matter = await queryOne(matterSql, mParams);
    if (!matter) return res.status(404).json({ error: "Matter not found or access denied" });

    const dir = join(STORAGE_DIR, matterId, session.userId);
    await mkdir(dir, { recursive: true });
    const filename = `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = join(dir, filename);
    await writeFile(filePath, file.buffer);

    const doc = await queryOne<{ id: string }>(
      `INSERT INTO documents (matter_id, owner_id, filename, original_name, mime_type, size, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'UPLOADED')
       RETURNING id`,
      [matterId, session.userId, filename, file.originalname, file.mimetype, file.size]
    );
    if (!doc) return res.status(500).json({ error: "Failed to record document" });

    try {
      await processDocument(doc.id, matterId, session.userId, filePath, file.mimetype, file.originalname);
    } catch (err: any) {
      await query("UPDATE documents SET status = 'FAILED', error = $2 WHERE id = $1::uuid", [doc.id, err.message]);
      return res.status(500).json({ error: "Uploaded but processing failed", detail: err.message, documentId: doc.id });
    }

    const updated = await queryOne<{ id: string; status: string; page_count: number | null }>(
      "SELECT id, status, page_count FROM documents WHERE id = $1::uuid",
      [doc.id]
    );
    return res.status(201).json({ document: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to upload document" });
  }
});

async function processDocument(
  documentId: string,
  matterId: string,
  ownerId: string,
  filePath: string,
  mimeType: string,
  originalName: string
) {
  await query("UPDATE documents SET status = 'PROCESSING' WHERE id = $1::uuid", [documentId]);

  const buffer = await readFile(filePath);
  const pages = await extractPages(buffer, { mimeType, filename: originalName });

  const chunks = chunkPages(pages, { chunkSize: 900, overlap: 150 });
  if (chunks.length === 0) {
    await query("UPDATE documents SET status = 'READY', page_count = $2 WHERE id = $1::uuid", [documentId, pages.length]);
    return;
  }

  const provider = getEmbeddingProvider();
  const vectors = await provider.embed(chunks.map((c) => c.content));

  await ensureCollection();

  const pointBatch: any[] = [];
  const rowBatch: any[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const qdrantId = crypto.randomUUID();
    pointBatch.push({
      id: qdrantId,
      vector: vectors[i],
      payload: {
        document_id: documentId,
        matter_id: matterId,
        owner_id: ownerId,
        scope: "PRIVATE",
        filename: originalName,
        page: chunks[i].page,
        chunk_id: chunks[i].chunkId,
        content: chunks[i].content,
      },
    });
    rowBatch.push([documentId, matterId, ownerId, "PRIVATE", chunks[i].content, chunks[i].page, chunks[i].chunkId, qdrantId]);
  }

  await upsertChunks(pointBatch);

  await transaction(async (client) => {
    for (const row of rowBatch) {
      await client.query(
        `INSERT INTO document_chunks (document_id, matter_id, owner_id, scope, content, page, chunk_id, qdrant_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        row
      );
    }
    await client.query("UPDATE documents SET status = 'READY', page_count = $2 WHERE id = $1::uuid", [documentId, pages.length]);
  });
}

export default router;
