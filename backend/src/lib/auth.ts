import { scrypt, randomBytes } from "crypto";
import jwt, { type JwtPayload, SignOptions, VerifyOptions } from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "dev-secret-do-not-use-in-production";
const SALT = "soli-auth-salt";

async function scryptAsync(password: string, salt: string, keylen: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, keylen, (err, key) => (err ? reject(err) : resolve(key as Buffer)))
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${salt}:${buf.toString("hex")}`;
}

export async function comparePassword(password: string, hashed: string): Promise<boolean> {
  let salt: string, hashHex: string;
  const parts = hashed.split(":");
  if (parts.length === 2) {
    salt = parts[0];
    hashHex = parts[1];
  } else {
    salt = SALT;
    hashHex = hashed;
  }
  if (!hashHex) return false;
  const buf = await scryptAsync(password, salt, 64);
  return buf.toString("hex") === hashHex;
}

export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  firmId?: string;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" } as SignOptions);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const decoded = jwt.verify(token, SECRET, {} as VerifyOptions) as JwtPayload & SessionPayload;
    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      firmId: decoded.firmId,
    };
  } catch {
    return null;
  }
}

export function getSessionCookie(token: string): string {
  return `soli_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`;
}

export function clearSessionCookie(): string {
  return `soli_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
