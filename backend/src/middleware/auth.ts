import { Request, Response, NextFunction } from "express";
import { verifySession, SessionPayload } from "../lib/auth";

declare global {
  namespace Express {
    interface Request {
      session?: SessionPayload;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.soli_session || req.headers.authorization?.replace(/^Bearer\s+/, "");
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const session = await verifySession(token);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  req.session = session;
  next();
}

export function adminOnly(req: Request, res: Response, next: NextFunction) {
  if (req.session?.role !== "ADMIN") {
    return res.status(403).json({ error: "Admins only" });
  }
  next();
}
