# URL Shortener

A portfolio project demonstrating system-design fundamentals: URL shortening with Base62 encoding, Redis caching, rate limiting, JWT auth, and click analytics.

See [`../DESIGN.md`](../DESIGN.md) for the full system design doc (requirements, capacity estimation, API contract, DB schema, encoding strategy, architecture) and [`../PROGRESS.md`](../PROGRESS.md) for build progress.

## Stack
- Backend: Node.js + Express + PostgreSQL
- Frontend: React (Vite)
- Cache: Redis (Phase 2)
- Deploy target: Render/Railway

## Project structure
```
URL-Shortner/
├── backend/     Express API
└── frontend/    React UI
```

## Local setup

### 1. Database (Neon)
1. Create a free project at [neon.tech](https://neon.tech).
2. Copy the connection string from the Neon dashboard (includes `?sslmode=require`).
3. Paste it into `backend/.env` as `DATABASE_URL` (see step 2 below), then run:
```
cd backend
npm run migrate
```
This applies every file in `migrations/` against whatever `DATABASE_URL` points to. Re-running it is always safe (all statements are `IF NOT EXISTS`).

(Local Postgres also works — see `.env.example` for the local connection string format.)

### 2. Backend
```
cd backend
cp .env.example .env   # paste your Neon DATABASE_URL
npm install
npm run migrate         # applies the DB schema — do this once (or after adding new migrations)
npm run dev
```
API runs on `http://localhost:4000`.

### 3. Frontend
```
cd frontend
cp .env.example .env   # points at the backend URL
npm install
npm run dev
```
UI runs on `http://localhost:5173`.

## Current status: MVP (Phase 2)
- [x] `POST /api/shorten` — Base62-encoded short codes + custom alias support
- [x] `GET /:code` — 302 redirect, async click_count increment, expiry check
- [ ] Redis caching in front of redirect lookups
- [ ] Rate limiting
- [ ] JWT auth + per-user link management
- [ ] Analytics dashboard

Full roadmap: see `../url-shortener-project-plan.md`.
