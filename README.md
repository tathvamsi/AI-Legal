# Soli — AI Litigation Counsel & Research Desk

> **Confidential AI legal workspace for Indian litigation lawyers and law firms.**
> Tagline: *Counsel, meet your tireless paralegal.*

Soli is a monorepo full-stack application that provides Indian advocates with a confidential AI assistant that answers legal questions grounded in (a) Indian statutes and (b) the firm's own case files, with pinpoint citations on every answer. If it cannot ground an answer in a source, it says so plainly instead of guessing.

## Project Structure

```
legal/
├── package.json              # Monorepo root (orchestrates backend + frontend)
├── backend/                  # Node.js/Express API server
│   ├── src/
│   │   ├── server.ts         # Express app entry point
│   │   ├── lib/
│   │   │   ├── agent.ts      # Soli Legal Intelligence Engine (hybrid RAG + general law)
│   │   │   ├── auth.ts       # JWT session signing + bcrypt password hashing
│   │   │   ├── chunk.ts      # Per-page document chunking with boundary awareness
│   │   │   ├── db.ts         # PostgreSQL pool + transaction helper
│   │   │   ├── embedding.ts  # Mock + OpenAI embedding providers
│   │   │   ├── extract.ts    # PDF/DOCX/TXT per-page text extraction
│   │   │   ├── llm.ts        # OpenAI / Anthropic / NVIDIA NIM / mock LLM providers
│   │   │   └── qdrant.ts     # Qdrant vector-store REST client
│   │   ├── middleware/
│   │   │   └── auth.ts       # Session cookie verification (soli_session)
│   │   ├── routes/
│   │   │   ├── auth.ts       # Login / Signup / Logout / Me
│   │   │   ├── matters.ts    # Matter CRUD
│   │   │   ├── documents.ts  # Upload + extract + chunk + embed pipeline
│   │   │   ├── conversations.ts # Conversation + message history
│   │   │   ├── chat.ts       # SSE-streamed cited chat
│   │   │   ├── acts.ts       # Legislation ingestion + publish
│   │   │   └── memos.ts      # DOCX / PDF memo export
│   │   └── uploads/          # Local file storage (runtime)
│   ├── prisma/schema.prisma  # Database schema (PostgreSQL)
│   ├── scripts/              # Seed / setup / debug utilities
│   ├── .env                  # Backend environment variables
│   └── package.json
├── frontend/                 # Next.js 16 App Router (React 19)
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx    # Root layout (Inter, Fraunces, Geist Mono)
│   │   │   ├── page.tsx      # Redirects to /dashboard or /login
│   │   │   ├── globals.css   # Tailwind design system
│   │   │   ├── login/        # Sign-in page (1-click demo + email/password)
│   │   │   ├── signup/       # Account creation (Lawyer / Admin roles)
│   │   │   ├── dashboard/    # Litigation command center + matter list
│   │   │   ├── matters/[id]/ # Matter workspace (chat + documents)
│   │   │   └── admin/        # Statutory library (ingest/publish acts)
│   │   ├── components/
│   │   │   ├── chat/         # Chat pane, message bubbles, citation chips, sources panel, document list, matter view
│   │   │   └── ui/           # Base UI primitives (button, input, card, badge, etc.)
│   │   ├── lib/
│   │   │   ├── api.ts        # Server-side fetch helpers (session, matters, acts)
│   │   │   └── utils.ts      # cn(), safeDate(), formatDate(), formatTime(), formatRelative()
│   │   └── proxy.ts
│   ├── .env.local            # Frontend environment variables
│   ├── next.config.ts
│   └── package.json
├── .gitignore
├── AGENTS.md
└── README.md
```

## Features

### 1. Authentication & Workspaces
- Email/password signup and login with role-based access control (`LAWYER` | `ADMIN`)
- JWT session stored in an HttpOnly `soli_session` cookie (7-day expiry)
- Each lawyer has a private workspace; each firm has one shared knowledge base managed by admins
- **Strict per-user isolation:** Lawyers can never see each other's private uploads (enforced at the query/vector-filter level, not just in the UI)

### 2. Matters (Case Folders)
- Create, list, open, update, delete matters (case name, client, court, case number, status)
- Upload PDF / DOCX / TXT case documents per matter (private by default)
- Ingestion pipeline: store file → extract text per page → chunk (preserving page numbers) → embed → store in Qdrant with metadata: `owner_id`, `matter_id`, `scope` (private | shared), `filename`, `page`, `chunk_id`
- Per-document processing status (`uploaded` → `processing` → `ready` → `failed`)

### 3. Chat with Cited Answers (Core Feature)
- ChatGPT-style UI: left sidebar of matters/conversations, main chat area, right "Sources" panel
- Agentic retrieval loop: `searchCaseFiles` tool + `searchLegislation` tool; merges results and streams the answer
- Every claim carries an inline citation chip (`[1]`, `[2]`, ...). Clicking one opens the Sources panel showing: filename or statute name, page or section, the exact excerpt, and a "Private" vs "Shared firm library" badge
- Hard rule: answer only from retrieved sources. If sources are insufficient, respond with "I couldn't find this in the available documents" and state what is missing. Never invent case names, citations, or section numbers
- Streaming Server-Sent Events (SSE) responses with a stop button
- Optional structured "Case Analysis" mode: Facts, Issues, Applicable Laws, Relevant Judgments, Arguments (for/against), Citations, and a short Memo

### 4. Legislation Knowledge Base (Admin)
- Admin UI to upload a statute PDF and run an ingestion pipeline: upload → extract text → parse legal structure → validate → human review → publish
- Legislation stored as **structured data**, not raw chunks only: act metadata (name, year, version, source URL, provenance), preamble, chapters, sections, subsections, clauses, provisos, explanations
- Review screen shows parsed structure as a tree next to the original text, so the admin can fix and approve before publishing
- Only published acts are searchable. Retrieval can fetch an exact provision (e.g. "Section 73, Indian Contract Act, 1872") with its exact text, location, version, and source
- First supported document: **Indian Contract Act, 1872**. Designed so Arbitration & Conciliation Act 1996, Specific Relief Act 1963, Limitation Act 1963, CPC 1908, Commercial Courts Act 2015, Sale of Goods Act 1930, Indian Partnership Act 1932 can be added without code changes

### 5. Document Generation (Basic)
- From a chat answer or analysis, "Export as memo" produces a clean, court-style DOCX and PDF with citations included

### 6. AI Provider Abstraction
- Swappable LLM provider (OpenAI, Anthropic, NVIDIA NIM) with a local fallback ("Soli Legal Intelligence Engine")
- Hybrid retrieval (semantic + keyword) with reranking
- All secrets kept in environment variables

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL 16 (+ pgcrypto extension) |
| Vector Store | Qdrant (Cosine similarity, 384-dim vectors) |
| LLM Providers | NVIDIA NIM (Nemotron), OpenAI, Anthropic, Local Mock |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS |
| Styling | Tailwind CSS v4, Lucide React icons |
| Fonts | Inter (sans), Fraunces (serif headings), Geist Mono |
| Auth | JWT + bcrypt (scrypt), HttpOnly session cookie |
| File Processing | pdf-parse, mammoth, multer |
| Document Generation | docx, pdfkit |

---

## Prerequisites

- **Node.js** 20+
- **npm** (comes with Node.js)
- **PostgreSQL** 14+ (with `pgcrypto` extension)
- **Qdrant** (vector database) — can run via Docker
- **Docker** (optional, for running Postgres + Qdrant containers)

---

## Quick Start

### 1. Clone the repository

```bash
git clone <repository-url>
cd legal
```

### 2. Install dependencies

From the monorepo root:

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 3. Start infrastructure (PostgreSQL + Qdrant)

Using Docker:

```bash
docker network create soli 2>/dev/null || true

docker run -d --name soli-postgres --network soli \
  -e POSTGRES_USER=soli -e POSTGRES_PASSWORD=soli -e POSTGRES_DB=soli \
  -p 5432:5432 postgres:16

docker run -d --name soli-qdrant --network soli \
  -p 6333:6333 -p 6334:6334 qdrant/qdrant:latest
```

Wait for readiness:
```bash
# Postgres
docker exec soli-postgres pg_isready -U soli

# Qdrant
curl http://localhost:6333/collections
```

### 4. Configure environment variables

#### Backend (`backend/.env`)

```env
PORT=5000
FRONTEND_URL=http://localhost:3000
NEXTAUTH_SECRET=change-me-in-production-32-chars-min

# Database
DATABASE_URL="postgresql://soli:soli@localhost:5432/soli?schema=public"

# Qdrant
QDRANT_URL=http://localhost:6333

# LLM (at least one provider recommended; mock works without keys)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
NVIDIA_API_KEY=your-nvidia-api-key
NVIDIA_MODEL=nvidia/nemotron-3.5-super-vl-120b-a12b
NVIDIA_FALLBACK_MODEL=nvidia/nemotron-3.5-bolt-e4b
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
DEFAULT_LLM_PROVIDER=nvidia
LLM_CONNECT_TIMEOUT_MS=20000

# Embedding
EMBEDDING_PROVIDER=mock
EMBEDDING_DIM=384

# File storage
STORAGE_DIR=./uploads
```

#### Frontend (`frontend/.env.local`)

```env
BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Note:** `.env` and `.env.local` are gitignored. Copy from examples or create them manually.

### 5. Set up the database

From the `backend/` directory:

```bash
npx prisma db push   # creates tables if Prisma migrations are configured
# OR run the seed script directly:
npx tsx scripts/setup-db.ts
```

The seed script creates:
- **Firm:** Soli Law Firm
- **Admin:** `admin@soli.law` / `admin123`
- **Lawyer:** `rohan@soli.law` / `password123`
- **Sample Matter:** `Vikram Mehta v. Union of India` (Supreme Court of India, W.P.(C) 112/2024)
- **Sample Document:** Affidavit (seeded into Qdrant)

### 6. Run the development servers

From the monorepo root:

```bash
npm run dev
```

This starts both:
- **Backend:** `http://localhost:5000` (Express + SSE)
- **Frontend:** `http://localhost:3001` (Next.js)

Open `http://localhost:3001` in your browser.

### 7. Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Lawyer | `rohan@soli.law` | `password123` |
| Admin | `admin@soli.law` | `admin123` |

The login page also has a **1-Click Demo Login** button pre-filled with the lawyer account.

---

## API Reference

All backend routes are prefixed with `/api` and require a valid `soli_session` cookie (except auth routes).

### Authentication

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| `POST` | `/api/auth/login` | Sign in | `{ email, password }` |
| `POST` | `/api/auth/signup` | Create account | `{ email, password, name, role }` |
| `POST`/`ALL` | `/api/auth/logout` | Clear session cookie | — |
| `GET` | `/api/auth/me` | Get current session | — |

### Matters

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/matters` | List matters (role-scoped) |
| `POST` | `/api/matters` | Create matter |
| `GET` | `/api/matters/:id` | Get matter by ID |
| `PATCH` | `/api/matters/:id` | Update matter |
| `DELETE` | `/api/matters/:id` | Delete matter |

### Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/matters/:matterId/documents` | List documents for a matter |
| `POST` | `/api/matters/:matterId/documents` | Upload + extract + embed document (multipart/form-data) |

### Conversations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/conversations?matterId=...` | List conversations for a matter |
| `POST` | `/api/conversations` | Create conversation |
| `GET` | `/api/conversations/:id/messages` | Get messages + citations for a conversation |

### Chat (SSE)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | Streamed cited answer (`text/event-stream`) |

### Legislation (Acts)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/acts` | List acts (published only for non-admins) | — |
| `POST` | `/api/acts` | Create act (draft) | Admin |
| `POST` | `/api/acts/ingest` | Upload PDF + parse sections | Admin |
| `GET` | `/api/acts/:id` | Get act with chapters/sections | — |
| `PATCH` | `/api/acts/:id` | Update act (publish toggle) | Admin |
| `POST` | `/api/acts/:id/publish` | Publish/unpublish act | Admin |
| `DELETE` | `/api/acts/:id` | Delete act | Admin |

### Memo Export

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/memos` | Export DOCX or PDF memo with citations |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |

---

## Database Schema (Prisma)

Key models:

- **Firm** — `id`, `name`, `slug`, `ownerId`, `createdAt`
- **User** — `id`, `email` (unique), `password`, `name`, `role` (ADMIN\|LAWYER), `firmId`, `createdAt`
- **Matter** — `id`, `firmId`, `ownerId`, `name`, `client`, `court`, `caseNumber`, `status` (OPEN\|CLOSED\|ARCHIVED), `createdAt`, `updatedAt`
- **Document** — `id`, `matterId`, `ownerId`, `filename`, `originalName`, `mimeType`, `size`, `status` (UPLOADED\|PROCESSING\|READY\|FAILED), `pageCount`, `error`, `createdAt`, `updatedAt`
- **DocumentChunk** — `id`, `documentId`, `matterId`, `ownerId`, `scope` (PRIVATE\|SHARED), `content`, `page`, `chunkId`, `qdrantId`, `createdAt`
- **Conversation** — `id`, `matterId?`, `ownerId`, `title`, `createdAt`, `updatedAt`
- **Message** — `id`, `conversationId`, `ownerId`, `role` (USER\|ASSISTANT\|SYSTEM), `content`, `createdAt`
- **Citation** — `id`, `messageId`, `sourceType` (CASE_FILE\|LEGISLATION), `sourceId`, `sourceName`, `page`, `section`, `excerpt`, `scope`, `createdAt`
- **Act** — `id`, `firmId?`, `name`, `year`, `version`, `sourceUrl`, `provenance`, `isPublished`, `createdAt`, `updatedAt`
- **Chapter** — `id`, `actId`, `title`, `ordinal`
- **Section** — `id`, `actId`, `chapterId?`, `number`, `title`, `content`, `version`, `sourceUrl`, `provenance`, `isPublished`, `createdAt`, `updatedAt`
- **Subsection** — `id`, `sectionId`, `label`, `content`, `ordinal`

---

## Key Design Decisions

### Strict Per-User Isolation
Private documents are filtered at the Qdrant vector level (`owner_id` + `matter_id` filters in `searchChunks`) and at the SQL level for document listings. Lawyers can never query another lawyer's private chunks, even if they guess a vector ID.

### Hybrid Retrieval
Chat retrieval combines:
1. **Semantic search** over Qdrant (cosine similarity on embedded chunks)
2. **Keyword search** over PostgreSQL full-text (`plainto_tsquery` + `ts_rank_cd`)
Results are merged, deduplicated, and capped (6 case files + 4 legislation sections).

### LLM Provider Fallback Chain
1. Primary NVIDIA NIM model (with configurable connection timeout)
2. Fallback NVIDIA model
3. Local "Soli Legal Intelligence Engine" — a deterministic legal knowledge base covering Indian Contract Act, CPC injunctions, Order VII Rule 11, Arbitration Act, Section 138 NI Act, bail/CrPC, and legal drafting templates

If no API keys are configured, the mock engine handles greetings and general legal questions gracefully.

### SSE Streaming
The chat endpoint uses Server-Sent Events (`text/event-stream`) with a robust incremental parser that accumulates bytes, splits on `\n\n` boundaries, preserves incomplete data between reads, and handles `[DONE]` and error events.

---

## Scripts

### Root (`package.json`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start backend + frontend concurrently |
| `npm run build` | Build both backend and frontend |
| `npm run start` | Start both in production mode |

### Backend (`backend/package.json`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Watch-mode dev server (`tsx watch src/server.ts`) |
| `npm run build` | TypeScript compile (`tsc`) |
| `npm run start` | Run compiled output (`node dist/server.js`) |

### Frontend (`frontend/package.json`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Next.js dev on port 3001 |
| `npm run build` | Next.js production build |
| `npm run start` | Next.js production server on port 3001 |
| `npm run lint` | ESLint |

### Backend utility scripts (`backend/scripts/`)

| Script | Description |
|--------|-------------|
| `scripts/setup-db.ts` | Create tables + seed firm, users, sample matter |
| `scripts/seed-sample-document.ts` | Ingest a sample affidavit into Qdrant |
| `scripts/reset-pw.ts` | Reset demo user passwords |
| `scripts/check-auth.ts`, `check-insert.ts`, `check-msgs.ts`, `debug-retrieve.ts` | Debug utilities |

---

## Design & Accessibility

- **Palette:** Slate-50 background, slate-900 primary text, blue-600 accent, restrained terracotta/amber for status states
- **Typography:** Inter (body), Fraunces (headings), Geist Mono (code/data)
- **Responsive:** Collapsible sidebar, mobile drawer, fixed-bottom composer
- **Accessibility:** Semantic HTML, focus-visible rings, keyboard navigation, ARIA labels on interactive elements
- **No excessive borders:** Cards use subtle shadows and separators rather than borders-on-everything
- **No raw SSE in UI:** All stream parsing happens in the client; transport metadata is never rendered

---

## Deployment

### Backend
Build and run:
```bash
cd backend
npm run build
npm start
```
Requires `DATABASE_URL`, `QDRANT_URL`, and LLM provider keys in the environment.

### Frontend
```bash
cd frontend
npm run build
npm start
```
Requires `BACKEND_URL` pointing to the deployed backend.

### Docker (infrastructure only)
The application itself is not containerized, but Postgres and Qdrant are expected to run as Docker containers (see Quick Start).

---

## Security Notes

- Session cookies are `HttpOnly`, `SameSite=Lax`, 7-day expiry
- Passwords are hashed with bcrypt (scrypt-derived, 64-byte key, random 16-byte salt)
- All API routes (except auth) require a valid session cookie
- Admin-only routes (`/api/acts/*` write operations) require `role === ADMIN`
- Matter access is enforced by `owner_id` (lawyers) or `firm_id` (admins) in every SQL query
- No secrets are logged to the browser or console
- Legal document contents are never logged server-side beyond debug retrieval metadata

---

## License

Proprietary — Soli AI Litigation Workspace.