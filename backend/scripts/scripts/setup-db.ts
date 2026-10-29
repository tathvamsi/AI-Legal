import "dotenv/config";
import { Pool } from "pg";
import { scrypt } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const SQL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS firms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL,
  firm_id UUID REFERENCES firms(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS matters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id),
  owner_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  client TEXT,
  court TEXT,
  case_number TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID NOT NULL REFERENCES matters(id),
  owner_id UUID NOT NULL REFERENCES users(id),
  filename TEXT NOT NULL,
  original_name TEXT,
  mime_type TEXT,
  size INTEGER,
  status TEXT NOT NULL DEFAULT 'UPLOADED',
  page_count INTEGER,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id),
  matter_id UUID NOT NULL REFERENCES matters(id),
  owner_id UUID NOT NULL REFERENCES users(id),
  scope TEXT NOT NULL,
  content TEXT NOT NULL,
  page INTEGER NOT NULL,
  chunk_id INTEGER NOT NULL,
  qdrant_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID REFERENCES matters(id),
  owner_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  owner_id UUID NOT NULL REFERENCES users(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id),
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  page INTEGER,
  section TEXT,
  excerpt TEXT NOT NULL,
  scope TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS acts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id),
  name TEXT NOT NULL,
  year INTEGER,
  version TEXT,
  source_url TEXT,
  provenance TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  act_id UUID NOT NULL REFERENCES acts(id),
  title TEXT NOT NULL,
  ordinal INTEGER
);

CREATE TABLE IF NOT EXISTS sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  act_id UUID NOT NULL REFERENCES acts(id),
  chapter_id UUID REFERENCES chapters(id),
  number TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  version TEXT,
  source_url TEXT,
  provenance TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subsections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES sections(id),
  label TEXT NOT NULL,
  content TEXT NOT NULL,
  ordinal INTEGER
);

CREATE INDEX IF NOT EXISTS idx_documents_matter ON documents(matter_id);
CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_chunks_matter_owner ON document_chunks(matter_id, owner_id);
CREATE INDEX IF NOT EXISTS idx_chunks_qdrant ON document_chunks(qdrant_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_sections_act ON sections(act_id);
CREATE INDEX IF NOT EXISTS idx_sections_published ON sections(is_published);
`;

async function hash(p: string) {
  const key = (await scryptAsync(p, "soli-salt", 64)) as Buffer;
  return key.toString("hex");
}

async function main() {
  await pool.query(SQL);
  console.log("Schema created.");

  const { rows } = await pool.query(
    `INSERT INTO firms (name, slug, owner_id)
     VALUES ('Soli Law Firm', 'soli-law-firm', gen_random_uuid())
     ON CONFLICT (slug) DO NOTHING
     RETURNING id, owner_id`
  );
  let firmId = rows[0]?.id;
  let ownerId = rows[0]?.owner_id;

  if (!firmId) {
    const f = await pool.query("SELECT id, owner_id FROM firms WHERE slug='soli-law-firm'");
    firmId = f.rows[0].id;
    ownerId = f.rows[0].owner_id;
  }

  const adminPw = await hash("admin123");
  const lawyerPw = await hash("lawyer123");

  await pool.query(
    `INSERT INTO users (email, password, name, role, firm_id)
     VALUES ($1,$2,'Admin Owner','ADMIN',$3),
            ($4,$5,'Rohan Mehta','LAWYER',$3)
     ON CONFLICT (email) DO NOTHING`,
    ["admin@soli.law", adminPw, firmId, "rohan@soli.law", lawyerPw]
  );

  const users = await pool.query("SELECT id, email, role, firm_id FROM users WHERE firm_id=$1", [firmId]);
  const admin = users.rows.find(u => u.role === 'ADMIN');
  const lawyer = users.rows.find(u => u.role === 'LAWYER');

  await pool.query("UPDATE firms SET owner_id=$1 WHERE id=$2", [admin.id, firmId]);

  const matter = await pool.query(
    `INSERT INTO matters (firm_id, owner_id, name, client, court, case_number, status)
     VALUES ($1,$2,'Vikram Mehta v. Union of India','Vikram Mehta','Supreme Court of India','W.P.(C) 112/2024','OPEN')
     RETURNING id`,
    [firmId, lawyer.id]
  );
  const matterId = matter.rows[0].id;

  console.log("Seed complete:");
  console.log("  firm_id:", firmId);
  console.log("  admin:", admin.email, "id:", admin.id);
  console.log("  lawyer:", lawyer.email, "id:", lawyer.id);
  console.log("  matter_id:", matterId);
  console.log("  login: admin@soli.law / admin123  |  rohan@soli.law / lawyer123");

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
