import "dotenv/config";
import { hashPassword } from "../src/lib/auth";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query("UPDATE users SET password = $1 WHERE email = $2", [await hashPassword("lawyer123"), "rohan@soli.law"]);
  await pool.query("UPDATE users SET password = $1 WHERE email = $2", [await hashPassword("admin123"), "admin@soli.law"]);
  console.log("Passwords reset for rohan@soli.law and admin@soli.law");
  await pool.end();
}
main();
