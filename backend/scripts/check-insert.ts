import "dotenv/config";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  // get latest conversation
  const c = await pool.query("SELECT id FROM conversations ORDER BY created_at DESC LIMIT 1");
  const convId = c.rows[0].id;
  console.log("convId", convId);
  const msg = await pool.query(
    "INSERT INTO messages (conversation_id, owner_id, role, content) VALUES ($1,$2,'ASSISTANT',$3) RETURNING id",
    [convId, "581f8268-bb5a-425c-901a-70230ef7ada5", "test content"]
  );
  console.log("message id", msg.rows[0].id);
  const cit = await pool.query(
    `INSERT INTO citations (message_id, source_type, source_id, source_name, page, section, excerpt, scope)
     VALUES ($1,'CASE_FILE',$2,'Affidavit.pdf',1,null,'excerpt text','PRIVATE')`,
    [msg.rows[0].id, "cf7b8c2a-0c27-4546-8c22-c25beea7ab66"]
  );
  console.log("citation inserted", cit.rowCount);
  await pool.end();
}
main();
