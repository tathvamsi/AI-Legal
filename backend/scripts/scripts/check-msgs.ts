import "dotenv/config";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const r = await pool.query(
    `SELECT role, left(content,50) AS c,
            (SELECT count(*) FROM citations c2 WHERE c2.message_id = m.id) AS nc
     FROM messages m
     ORDER BY created_at DESC LIMIT 8`
  );
  console.table(r.rows);
  await pool.end();
}
main();
