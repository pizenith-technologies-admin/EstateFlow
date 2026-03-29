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
├── shared/
│   └── schema.ts     # Drizzle ORM schema + Zod types (shared by server & mobile)
├── api/_handler.ts   # Vercel handler source (bundled → api/index.js)
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
