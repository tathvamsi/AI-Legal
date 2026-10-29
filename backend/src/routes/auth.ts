import { Router, Request, Response } from "express";
import { query, queryOne } from "../lib/db";
import { comparePassword, hashPassword, signSession } from "../lib/auth";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  try {
    const user = await queryOne<{
      id: string;
      email: string;
      password: string;
      name: string | null;
      role: string;
      firm_id: string | null;
    }>(
      "SELECT id, email, password, name, role, firm_id FROM users WHERE email = $1",
      [email.toLowerCase().trim()]
    );

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = await signSession({
      userId: user.id,
      email: user.email,
      role: user.role,
      firmId: user.firm_id ?? undefined,
    });

    res.cookie("soli_session", token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        firmId: user.firm_id,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Login failed" });
  }
});

router.post("/signup", async (req: Request, res: Response) => {
  const { email, password, name, role = "LAWYER", firmSlug } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  try {
    let firmId: string | null = null;
    if (firmSlug) {
      const f = await queryOne<{ id: string }>("SELECT id FROM firms WHERE slug = $1", [firmSlug]);
      if (f) firmId = f.id;
    } else {
      const created = await queryOne<{ id: string }>(
        "INSERT INTO firms (name, slug, owner_id) VALUES ($1, $2, gen_random_uuid()) RETURNING id",
        [name ? `${name}'s Firm` : "Firm", `${email.split("@")[0]}-firm-${Date.now()}`]
      );
      if (!created) throw new Error("Failed to create firm");
      firmId = created.id;
    }

    const existing = await queryOne<{ id: string }>("SELECT id FROM users WHERE email = $1", [email]);
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await hashPassword(password);
    const user = await queryOne<{ id: string; email: string; role: string; firm_id: string }>(
      `INSERT INTO users (email, password, name, role, firm_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, role, firm_id`,
      [email.toLowerCase().trim(), passwordHash, name || null, role, firmId]
    );
    if (!user) throw new Error("Failed to create user");

    if (role === "ADMIN") {
      await query("UPDATE firms SET owner_id = $1::uuid WHERE id = $2::uuid", [user.id, firmId]);
    }

    const token = await signSession({
      userId: user.id,
      email: user.email,
      role: user.role,
      firmId: user.firm_id,
    });

    res.cookie("soli_session", token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name,
        role: user.role,
        firmId: user.firm_id,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Signup failed" });
  }
});

router.all("/logout", (_req: Request, res: Response) => {
  res.clearCookie("soli_session", { path: "/" });
  return res.json({ ok: true });
});

router.get("/me", authMiddleware, (req: Request, res: Response) => {
  return res.json({ session: req.session });
});

export default router;
