# CareForAb (Monorepo)

CareForAb is a monorepo containing:

- **frontend**: Next.js app
- **backend**: Express + TypeScript API (reminders, auth helpers, cron jobs)

## Repo structure

- **frontend/**: Next.js app (port **3000**)
- **backend/**: Express API (port **3001**)
- **supabase/**: Supabase project/config (SQL, etc.)

## Prerequisites

- **Node.js 18+**
- **npm**

## Install

From the repo root:

```bash
npm run install:all
```

## Environment variables

Create environment files (they are referenced by `docker-compose.yml`):

- **frontend/.env**
- **backend/.env**

### Frontend (`frontend/.env`)

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Backend (`backend/.env`)

Required:

- `SUPABASE_URL` (or `VITE_SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY`
- `BREVO_API_KEY`

Optional:

- `PORT` (default: `3001`)
- `SUPABASE_JWT_SECRET` (enables local JWT verification; otherwise backend falls back to `supabase.auth.getUser()`)
- `BREVO_SENDER_EMAIL` (default is set in code)
- `NODE_ENV` (`development` | `test` | `production`)
- `LOG_LEVEL` (default: `info`)

## Run (local dev)

Start both apps from the repo root:

```bash
npm run dev
```

Or run separately:

```bash
npm run dev:frontend
npm run dev:backend
```

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:3001/health`

## Build

```bash
npm run build
```

## Docker

This repo includes `docker-compose.yml` which builds and runs both services:

```bash
docker compose up --build
```

Notes:

- Compose loads env files from `./frontend/.env` and `./backend/.env`.
- Exposed ports are `3000` (frontend) and `3001` (backend).

## Backend endpoints (high-level)

- `GET /health`
- `POST /api/auth/send-code`
- `POST /api/auth/verify-code`
- `POST /api/reminders/test` (auth required)
- `POST /api/reminders/inventory` (auth required)
- `POST /api/reminders/summary` (auth required)
