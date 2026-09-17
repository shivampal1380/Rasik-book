# Rasid Book – Book Amount Entry System

Production-ready web application for entering book amounts (receipts) for
**Sant Nirankari Mandal (Regd.), Mumbai Branch**, with automatic numbering,
head-wise summaries, an audit trail, and statement PDF generation.

## Stack

| Layer    | Technology |
| -------- | ---------- |
| Frontend | React 18, Vite, Tailwind CSS, TanStack Query, React Router, React Hook Form + Zod |
| Backend  | Node.js, Express, Prisma ORM, PostgreSQL |
| Auth     | JWT in httpOnly cookie, bcrypt, role-based access (SUPER_ADMIN / ADMIN / OPERATOR) |
| PDF      | Playwright (headless Chromium) rendering an A4 landscape statement |
| Quality  | Zod validation, structured logging (pino), rate limiting, unified error handling |

## Layout

```
rasid-book/
├─ backend/
│  ├─ prisma/           # schema, migration, seed
│  └─ src/
│     ├─ config/        # env + constants (heads, labels)
│     ├─ controllers/   # HTTP handlers
│     ├─ middleware/    # auth, audit, error, rate-limit
│     ├─ pdf/           # statement HTML template + Playwright renderer
│     ├─ routes/        # API routes
│     ├─ services/      # business logic (books, entries, users, audit, dashboard)
│     ├─ utils/         # prisma client, errors, http helpers
│     └─ validators/    # zod schemas
├─ frontend/
│  └─ src/
│     ├─ components/    # ui primitives
│     ├─ features/      # auth, books, entries, users, dashboard
│     ├─ layouts/       # app shell with sidebar
│     └─ lib/           # axios client, query client
```

## Prerequisites

- Node.js 20+ and npm
- PostgreSQL 16/18 running locally

## 1. Database

Create the database (example for PostgreSQL 18 on port 5433):

```powershell
psql -U postgres -h localhost -p 5433 -c "CREATE DATABASE rasid_book;"
```

## 2. Backend

```powershell
cd backend
Copy-Item .env.example .env      # then edit DATABASE_URL / JWT_SECRET
npm install
npx playwright install chromium  # downloads headless browser for PDF
npm run prisma:migrate         # apply migrations
npm run seed                   # admin + operator + 2 demo books
npm run dev                    # http://localhost:4000
```

## 3. Frontend

```powershell
cd frontend
npm install
npm run dev   # http://localhost:5173  (proxies /api to backend :4000)
```

For production, `npm run build` produces a static bundle in `frontend/dist/`
that can be served by nginx with `/api` proxied to the backend.

## Deploy to Vercel (via GitHub)

The repo is structured as two independent Vercel projects sharing one GitHub
repository. Prisma uses its native engine with a `rhel-openssl` binary target so
the backend runs on Vercel serverless; PDF rendering falls back to the prebuilt
`@sparticuz/chromium` binary when `VERCEL=1`.

### 0. One-time: hosted PostgreSQL

Create a Postgres database on a provider like Vercel Postgres, Neon or
Supabase, and copy its connection string (the `DATABASE_URL`) somewhere safe.
**Run the migrations and seed against it once** (local machine, from the
`backend/` folder — temporary):

```powershell
cd backend
$env:DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require"
npx prisma migrate deploy
npm run seed
Remove-Item Env:DATABASE_URL   # restore the local .env values
```

### 1. Backend project

Create a Vercel project (New Project → Import the GitHub repo → Root Directory:
`backend`). Framework default; Build Command can stay default (install runs
`prisma generate` for you). Then set these **Environment Variables**
(Production):

| Var             | Value                                      |
| --------------- | ------------------------------------------ |
| `DATABASE_URL`  | hosted Postgres connection string          |
| `JWT_SECRET`    | long random string (e.g. `openssl rand -hex 32`) |
| `JWT_EXPIRES_IN`| `12h`                                      |
| `CORS_ORIGIN`   | `https://<your-frontend>.vercel.app`       |
| `COOKIE_SECURE` | `1`                                        |
| `NODE_ENV`      | `production` (set automatically by Vercel) |

Deploy. Note the resulting URL (e.g. `https://rasid-book-api.vercel.app`) —
you need it for the frontend project.

### 2. Frontend project

Create a second Vercel project from the same repo with Root Directory:
`frontend` (Vite detected automatically; output `dist`).

Set `frontend/vercel.json` so `/api/*` is proxied to the deployed backend:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://rasid-book-api.vercel.app/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Replace the destination with your real backend URL, then deploy. The SPA
fallback rewrite keeps React Router client-side routes like `/books` working.

### Notes

- No separate `VITE_API_URL` is needed: the frontend calls `/api` on its own
  domain and Vercel proxies it to the backend.
- The JWT stays in an httpOnly cookie on the frontend domain (same-origin), so
  `COOKIE_SECURE=1` works with HTTPS.
- The rate limiter uses an in-process store; on serverless each instance keeps
  its own counter, so limits are per-instance rather than global.
- Local dev is unchanged (`npm run dev` in both folders).

## Key design decisions

- **Automatic receipt numbering.** The server assigns each entry its receipt
  number inside a `SELECT ... FOR UPDATE` transaction so simultaneous
  submissions never get duplicates. A unique `(bookId, entryNumber)`
  constraint is the final backstop. A book becomes `COMPLETED` automatically
  when the 100th receipt is entered.
- **Nine heads:** BHETA, B.F. (B_FUND), S.B.F. (SBF), ASS, MSS, Langar
  (LANGAR), PCS, FF, MED. Amounts are whole rupees only.
- **Statement PDF** reproduces the Sant Nirankari *Statement of Receipts*
  form: left panel receipts 1–47, right panel a **T. B/F** line covering
  48–55, receipts 56–100, and a **G.T.** grand total row. The PDF summary
  section shows exactly BHETA, B.FUND, S.B.F., TOTAL Rs.
- **Corrections are admin-only and audited.** Every create and correction
  writes an audit log record with the old and new values.
- **CORS + cookies.** JWT is stored in an httpOnly, SameSite=Lax cookie;
  the frontend sends it automatically with `withCredentials`.

## API overview

| Method | Endpoint                          | Access        |
| ------ | --------------------------------- | ------------- |
| POST   | `/api/auth/login`                 | public        |
| POST   | `/api/auth/logout`                | any user      |
| GET    | `/api/auth/me`                    | any user      |
| GET    | `/api/dashboard`                  | any user      |
| GET    | `/api/books` · POST `/api/books`  | any user      |
| GET    | `/api/books/:id`                  | any user      |
| GET    | `/api/books/:id/summary`          | any user      |
| POST   | `/api/books/:id/entries`          | any user      |
| GET    | `/api/books/:id/entries`          | any user      |
| PATCH  | `/api/books/:id/entries/:entryId` | ADMIN only    |
| POST   | `/api/books/:id/complete`         | ADMIN only    |
| POST   | `/api/books/:id/close`            | SUPER_ADMIN only |
| GET    | `/api/books/:id/pdf`              | any user      |
| GET    | `/api/books/:id/audit`            | ADMIN only    |
| GET    | `/api/users` · POST `/api/users` · PATCH `/api/users/:id` | SUPER_ADMIN / ADMIN |
| GET    | `/api/audit-logs`                 | ADMIN only    |
| GET    | `/api/health`                     | public        |

## Scripts (backend)

- `npm run dev` — watch mode with `.env` loaded
- `npm run start` — production start
- `npm run prisma:migrate` — apply migrations (`prisma migrate dev`)
- `npm run prisma:deploy` — apply migrations in production (`prisma migrate deploy`)
- `npm run seed` — seed users and demo books
