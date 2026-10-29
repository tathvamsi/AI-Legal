import { Router, Request, Response } from "express";
import multer from "multer";
import { query, queryOne, transaction } from "../lib/db";
import { authMiddleware, adminOnly } from "../middleware/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const router = Router();
router.use(authMiddleware);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
});

// List acts
router.get("/", async (req: Request, res: Response) => {
  const session = req.session!;
  try {
    let sql = `SELECT id, name, year, version, source_url, provenance, is_published, created_at, updated_at FROM acts WHERE 1=1`;
    const params: any[] = [];
    if (session.role !== "ADMIN") {
      sql += ` AND is_published = TRUE`;
    } else if (session.firmId) {
      sql += ` AND (firm_id IS NULL OR firm_id = $1::uuid)`;
      params.push(session.firmId);
    }
    sql += ` ORDER BY name, year`;

    const acts = await query(sql, params);
    return res.json({ acts });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch acts" });
  }
});

// Create act (admin)
router.post("/", adminOnly, async (req: Request, res: Response) => {
  const session = req.session!;
  const { name, year, version, sourceUrl, provenance } = req.body || {};
  if (!name) return res.status(400).json({ error: "Act name required" });

  try {
    const act = await queryOne<{ id: string }>(
      `INSERT INTO acts (firm_id, name, year, version, source_url, provenance, is_published)
       VALUES ($1,$2,$3,$4,$5,$6,FALSE) RETURNING id`,
      [session.firmId, name, year || null, version || null, sourceUrl || null, provenance || null]
    );
    if (!act) return res.status(500).json({ error: "Failed to create act" });
    return res.status(201).json({ act: { id: act.id, isPublished: false } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create act" });
  }
});

// Ingest act PDF (admin)
router.post("/ingest", adminOnly, upload.single("file"), async (req: Request, res: Response) => {
  const session = req.session!;
  const file = req.file;
  const { name, year, version } = req.body || {};

  if (!file || !name) {
    return res.status(400).json({ error: "File and act name required" });
  }

  try {
    const dir = join(process.env.STORAGE_DIR || "./uploads", "acts");
    await mkdir(dir, { recursive: true });
    const filename = `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    await writeFile(join(dir, filename), file.buffer);

    const pdfParse = ((await import("pdf-parse")) as any).default || (await import("pdf-parse"));
    const data = await (pdfParse as any)(file.buffer);
    const fullText = data.text || "";

    const act = await queryOne<{ id: string }>(
      `INSERT INTO acts (firm_id, name, year, version, source_url, provenance, is_published)
       VALUES ($1,$2,$3,$4,$5,$6,FALSE) RETURNING id`,
      [session.firmId, name, year ? parseInt(year, 10) : null, version || null, null, `Uploaded: ${file.originalname}`]
    );
    if (!act) return res.status(500).json({ error: "Failed to record act" });

    const sections = parseSections(fullText);

    await transaction(async (client) => {
      for (const s of sections) {
        await client.query(
          `INSERT INTO sections (act_id, number, title, content, is_published)
           VALUES ($1,$2,$3,$4,FALSE)`,
          [act.id, s.number, s.title, s.content]
        );
      }
    });

    return res.json({
      act: { id: act.id, name, isPublished: false, sectionCount: sections.length },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Ingest failed" });
  }
});

// Get act by id
router.get("/:id", async (req: Request, res: Response) => {
  const session = req.session!;
  const { id } = req.params;

  try {
    const act = await queryOne<{ id: string; firm_id: string | null; is_published: boolean }>(
      "SELECT id, firm_id, is_published FROM acts WHERE id = $1",
      [id]
    );
    if (!act) return res.status(404).json({ error: "Act not found" });
    if (session.role !== "ADMIN") {
      if (!act.is_published) return res.status(403).json({ error: "Not published" });
    } else if (session.firmId && act.firm_id && act.firm_id !== session.firmId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const chapters = await query(
      "SELECT id, title, ordinal FROM chapters WHERE act_id = $1 ORDER BY COALESCE(ordinal, 9999), id",
      [id]
    );
    const sections = await query(
      `SELECT s.id, s.chapter_id, s.number, s.title, s.content, s.version, s.is_published
       FROM sections s WHERE s.act_id = $1 ORDER BY s.number`,
      [id]
    );
    return res.json({ act: { ...act, chapters, sections } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch act" });
  }
});

// Update act (admin)
router.patch("/:id", adminOnly, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { isPublished } = req.body || {};

  try {
    const act = await queryOne<{ id: string }>(
      "UPDATE acts SET is_published = $1, updated_at = now() WHERE id = $2::uuid RETURNING id",
      [isPublished === true, id]
    );
    if (!act) return res.status(404).json({ error: "Act not found" });
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update act" });
  }
});

// Publish act (admin)
router.post("/:id/publish", adminOnly, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { isPublished } = req.body || {};

  try {
    await query("UPDATE acts SET is_published = $1, updated_at = now() WHERE id = $2::uuid", [isPublished === true, id]);
    return res.json({ ok: true, id, isPublished: isPublished === true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Publish failed" });
  }
});

// Delete act (admin)
router.delete("/:id", adminOnly, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await query("DELETE FROM acts WHERE id = $1", [id]);
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete act" });
  }
});

function parseSections(text: string): { number: string; title: string; content: string }[] {
  const lines = text.split(/\r?\n/);
  const sections: { number: string; title: string; content: string }[] = [];
  let current: { number: string; title: string; content: string[] } | null = null;

  for (const line of lines) {
    const m = line.match(/^\s*(?:Section|Sec\.)?\s*(\d+[A-Za-z-]*)\.?\s*[-—–]?\s*(.*)$/i);
    if (m && m[1]) {
      if (current) {
        sections.push({
          number: current.number,
          title: current.title,
          content: current.content.join("\n").trim(),
        });
      }
      current = {
        number: m[1],
        title: (m[2] || "").trim(),
        content: [],
      };
    } else if (current) {
      current.content.push(line);
    }
  }
  if (current) {
    sections.push({
      number: current.number,
      title: current.title,
      content: current.content.join("\n").trim(),
    });
  }
  return sections;
}

export default router;
