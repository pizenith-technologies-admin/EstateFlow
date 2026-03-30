# EstateFlow

A full-stack real estate management platform for agents, clients, and brokerages. Built with Express.js, React, and React Native (Expo).

## What It Does

| Role | Capabilities |
|------|-------------|
| **Agent** | Manage clients, schedule tours, track offers, upload documents, chat |
| **Client** | Browse properties, join tours, submit rental applications, chat with agent |
| **Brokerage** | Monitor agents, view KPIs, manage teams |
| **Super Admin** | Manage all brokerages, agents, clients, and system reports |

## Project Structure

```
EstateFlow/
├── api/              # Vercel serverless function entry (pre-bundled)
├── client/           # React web frontend (landing page)
├── mobile/           # React Native app (Expo)
├── server/           # Express.js backend
│   ├── app.ts        # Express app — used by Vercel
│   ├── index.ts      # Local dev entry — adds Vite + listen()
│   ├── routes.ts     # All API routes (5,000+ lines)
│   ├── simpleAuth.ts # JWT + session auth
│   ├── storage.ts    # Database access layer
│   ├── db.ts         # Neon PostgreSQL connection
│   ├── cloudinary.ts # Image upload service
│   ├── emailService.ts # SendGrid integration
│   └── objectStorage.ts # Google Cloud Storage
├── docs/
│   └── images/        # Screenshots & legacy attached PNGs (not shipped in Docker)
├── shared/
│   └── schema.ts     # Drizzle ORM schema + Zod types (shared by server & mobile)
├── api/_handler.ts   # Vercel handler source (bundled → api/index.js)
├── docker-compose.yml              # Postgres + migrate + backend
├── docker-compose.mobile-web.yml   # Expo web UI only (optional API URL)
├── vercel.json       # Vercel deployment config
└── drizzle.config.ts # Database migration config
```

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in values
cp .env.example .env

# 3. Push schema to database
npm run db:push

# 4. Start development server
npm run dev
# → http://localhost:5000
```

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for full local setup instructions.

## Run with Docker

### Backend + database (default `docker-compose.yml`)

Starts **PostgreSQL**, runs **migrate** (`drizzle-kit push` once), then the **production API** and static **client/** landing page.

```bash
docker compose up --build
```

| URL | What |
|-----|------|
| http://localhost:5000 | API + marketing/landing UI (`client/`) |

Set strong secrets via environment or a `.env` next to the compose file:

- `JWT_SECRET`
- `SESSION_SECRET`

```bash
docker compose down          # stop
docker compose down -v       # stop and delete Postgres volume
```

### Mobile web only (`docker-compose.mobile-web.yml`)

Use this when the API runs **somewhere else** (remote server, staging, or another Docker host). The Expo web bundle is built with **`EXPO_PUBLIC_API_URL`** embedded — it must be a URL your **browser** can call (HTTPS for remote APIs).

```bash
# Talk to API on your machine (same host as Docker)
docker compose -f docker-compose.mobile-web.yml up --build

# Talk to a remote API (rebuild when you change the URL)
EXPO_PUBLIC_API_URL=https://your-api.example.com docker compose -f docker-compose.mobile-web.yml up --build
```

Open **http://localhost:8080** (static Expo web export behind nginx — not Metro/Expo Go).

You can run **only** `docker-compose.mobile-web.yml` locally while the stack from `docker-compose.yml` runs on a server, as long as that API allows CORS from `http://localhost:8080` (see **`ALLOWED_ORIGINS`** / production CORS in `server/app.ts`).

To test against the production Vercel API:
```
# mobile/.env
EXPO_PUBLIC_API_URL=https://estate-flow-deployment.vercel.app

## Documentation

| Document | Description |
|----------|-------------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, tech stack, data flow |
| [docs/API.md](docs/API.md) | All API endpoints with methods and auth |
| [docs/DATABASE.md](docs/DATABASE.md) | Database schema and table reference |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel deployment + mobile builds |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Local dev setup and workflow |

## Tech Stack

- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL via [Neon](https://neon.tech) (serverless), Drizzle ORM
- **Frontend**: React 18, Vite, TailwindCSS, Radix UI
- **Mobile**: React Native 0.81, Expo SDK 54
- **Deployment**: Vercel (backend + web), EAS Build (mobile)
- **Services**: Cloudinary, SendGrid, Google Maps, Google Cloud Storage

## Test Credentials (Development Only)

| Role | Email | Password |
|------|-------|----------|
| Agent | agent@example.com | password123 |
| Client | client@example.com | password123 |
| Brokerage | brokerage@example.com | password123 |
| Super Admin | admin@example.com | password123 |
