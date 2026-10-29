import { Router, Request, Response } from "express";
import { query, queryOne } from "../lib/db";
import { authMiddleware } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

// List matters
router.get("/", async (req: Request, res: Response) => {
  const session = req.session!;
  try {
    const matters = await query(
      `SELECT m.id, m.name, m.client, m.court, m.case_number, m.status, m.created_at, m.updated_at,
              COUNT(d.id) AS doc_count
       FROM matters m
       LEFT JOIN documents d ON d.matter_id = m.id
       WHERE ${session.role === "ADMIN" ? "m.firm_id = $1::uuid" : "m.owner_id = $1::uuid"}
       GROUP BY m.id
       ORDER BY m.updated_at DESC`,
      [session.role === "ADMIN" ? session.firmId : session.userId]
    );
    return res.json({ matters });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch matters" });
  }
});

// Create matter
router.post("/", async (req: Request, res: Response) => {
  const session = req.session!;
  const { name, client, court, caseNumber, status = "OPEN" } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Matter name required" });
  }

  try {
    const matter = await queryOne<{ id: string }>(
      `INSERT INTO matters (firm_id, owner_id, name, client, court, case_number, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [session.firmId, session.userId, name.trim(), client || null, court || null, caseNumber || null, status]
    );
    if (!matter) return res.status(500).json({ error: "Failed to create matter" });
    return res.status(201).json({ matter: { id: matter.id, name, client, court, caseNumber, status } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create matter" });
  }
});

// Get matter by id
router.get("/:id", async (req: Request, res: Response) => {
  const session = req.session!;
  const { id } = req.params;

  try {
    let sql = `SELECT * FROM matters WHERE id = $1::uuid`;
    const vals: any[] = [id];
    if (session.role !== "ADMIN") {
      sql += ` AND owner_id = $2::uuid`;
      vals.push(session.userId);
    } else {
      sql += ` AND firm_id = $2::uuid`;
      vals.push(session.firmId);
    }

    const matter = await queryOne(sql, vals);
    if (!matter) return res.status(404).json({ error: "Matter not found" });
    return res.json({ matter });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch matter" });
  }
});

// Update matter
router.patch("/:id", async (req: Request, res: Response) => {
  const session = req.session!;
  const { id } = req.params;
  const { name, client, court, caseNumber, status } = req.body || {};

  try {
    let sql = `UPDATE matters SET updated_at = now()`;
    const vals: any[] = [];
    let idx = 0;
    if (name !== undefined) { sql += `, name = $${++idx}`; vals.push(name); }
    if (client !== undefined) { sql += `, client = $${++idx}`; vals.push(client); }
    if (court !== undefined) { sql += `, court = $${++idx}`; vals.push(court); }
    if (caseNumber !== undefined) { sql += `, case_number = $${++idx}`; vals.push(caseNumber); }
    if (status !== undefined) { sql += `, status = $${++idx}`; vals.push(status); }

    sql += ` WHERE id = $${++idx}::uuid`;
    vals.push(id);
    if (session.role !== "ADMIN") {
      sql += ` AND owner_id = $${++idx}::uuid`;
      vals.push(session.userId);
    } else {
      sql += ` AND firm_id = $${++idx}::uuid`;
      vals.push(session.firmId);
    }
    sql += ` RETURNING id, name, client, court, case_number, status`;

    const updated = await queryOne(sql, vals);
    if (!updated) return res.status(404).json({ error: "Matter not found or denied" });
    return res.json({ matter: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update matter" });
  }
});

// Delete matter
router.delete("/:id", async (req: Request, res: Response) => {
  const session = req.session!;
  const { id } = req.params;

  try {
    let sql = `DELETE FROM matters WHERE id = $1::uuid`;
    const vals: any[] = [id];
    if (session.role !== "ADMIN") {
      sql += ` AND owner_id = $2::uuid`;
      vals.push(session.userId);
    } else {
      sql += ` AND firm_id = $2::uuid`;
      vals.push(session.firmId);
    }
    await query(sql, vals);
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete matter" });
  }
});

export default router;
