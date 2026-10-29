import "dotenv/config";
import { comparePassword, hashPassword } from "../src/lib/auth";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const r = await pool.query("SELECT email, password FROM users WHERE email='rohan@soli.law'");
  const row = r.rows[0];
  console.log("stored hash:", row.password);
  console.log("compare lawyer123:", await comparePassword("lawyer123", row.password));
  console.log("compare wrong:", await comparePassword("wrong", row.password));
  const nh = await hashPassword("lawyer123");
  console.log("new hash format:", nh);
  console.log("compare new:", await comparePassword("lawyer123", nh));
  await pool.end();
}
main();
