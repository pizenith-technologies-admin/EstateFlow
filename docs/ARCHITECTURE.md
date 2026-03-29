# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                        Clients                          │
│   React Native App (iOS/Android)   Browser (Web)        │
└────────────────┬──────────────────────────┬─────────────┘
                 │ HTTPS + JWT Bearer        │ HTTPS + Cookie Session
                 ▼                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Vercel Edge Network                   │
│   Static files (dist/public)   Serverless Function      │
│                                (api/index.js)           │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                  Express.js Application                 │
│   CORS → Auth → Routes → Storage → Response             │
└──────┬──────────┬─────────────┬──────────┬──────────────┘
       │          │             │          │
       ▼          ▼             ▼          ▼
  Neon DB    Cloudinary    SendGrid    Google Cloud
 (Postgres)  (Images)      (Email)   (Files + Maps)
```

## Deployment Architecture

### Production (Vercel)
- **Frontend**: Static React app served from `dist/public/` via Vercel CDN
- **Backend**: Single serverless function at `api/index.js` — handles all `/api/*` routes
- **Database**: Neon serverless PostgreSQL (connection pooling built-in)
- **Sessions**: PostgreSQL-backed via `connect-pg-simple` (survives cold starts)
- **Routing**: `vercel.json` rewrites `/api/*` → function, `/*` → `index.html`

### Local Development
- Single Node.js process on port 5000
- Vite dev server with HMR for the React frontend
- Entry point: `server/index.ts`

### Why Two Entry Points?
| File | Used When | Imports Vite? |
|------|-----------|---------------|
| `server/index.ts` | Local dev | Yes (Vite dev server) |
| `server/app.ts` | Vercel | No (Vite is a devDependency, not installed in prod) |
| `api/_handler.ts` | Vercel (bundled → `api/index.js`) | No |

`api/_handler.ts` is bundled with esbuild into `api/index.js` during `npm run build:vercel`. This creates a single self-contained file with no runtime module resolution issues.

## Request Lifecycle

```
Incoming request to /api/login (POST)
│
├─ Vercel rewrite: /api/(.*) → /api/index
│
├─ api/index.js handler:
│   ├─ Set CORS headers (immediate, before init)
│   ├─ Handle OPTIONS preflight → 204, done
│   └─ await initPromise (waits for auth + routes to register)
│
├─ Express middleware stack:
│   ├─ cors()
│   ├─ express.json()
│   ├─ Request logger
│   └─ isAuthenticated (for protected routes)
│
├─ Route handler (simpleAuth.ts → POST /api/login)
│   ├─ Validate email + password
│   ├─ Query database for user
│   ├─ Sign JWT token (7 day expiry)
│   ├─ Save session
│   └─ Return { user, accessToken }
│
└─ Response
```

## Authentication

Two mechanisms work in parallel:

**Sessions (Web browser)**
- `express-session` with PostgreSQL store
- Cookie: `httpOnly`, `secure` in production, `sameSite: lax`
- TTL: 7 days

**JWT (Mobile app)**
- Bearer token in `Authorization` header
- `isAuthenticated` middleware checks header first, falls back to session
- Token contains: `{ id, email, role }`
- Expiry: 7 days

## Tech Stack

### Backend
| Package | Version | Purpose |
|---------|---------|---------|
| express | 4.21.2 | HTTP server |
| drizzle-orm | 0.39.1 | TypeScript ORM |
| @neondatabase/serverless | 0.10.4 | Neon PostgreSQL driver |
| connect-pg-simple | 10.0.0 | PostgreSQL session store |
| jsonwebtoken | 9.0.2 | JWT signing/verification |
| cloudinary | 2.8.0 | Image uploads |
| @sendgrid/mail | 8.1.6 | Transactional email |
| @google-cloud/storage | 7.17.1 | File storage |
| @googlemaps/google-maps-services-js | 3.4.2 | Route optimization |
| multer | 2.0.2 | File upload middleware |
| zod | 3.24.2 | Schema validation |

### Frontend (Web)
| Package | Version | Purpose |
|---------|---------|---------|
| react | 18.3.1 | UI library |
| vite | 5.4.20 | Build tool |
| tailwindcss | 3.4.17 | Utility CSS |
| @radix-ui/* | various | Headless UI components |
| @tanstack/react-query | 5.60.5 | Data fetching |
| framer-motion | 11.13.1 | Animations |

### Mobile
| Package | Version | Purpose |
|---------|---------|---------|
| expo | 54.0.30 | React Native framework |
| react-native | 0.81.5 | Native runtime |
| @react-navigation/* | 7.x | Navigation |
| react-native-maps | 1.20.1 | Maps |
| expo-location | 18.1.5 | GPS |
| expo-secure-store | 14.2.3 | Secure token storage |
| expo-image-picker | 16.1.4 | Photo selection |
| axios | 1.7.9 | HTTP client |

## External Services

| Service | Purpose | Fallback if missing |
|---------|---------|---------------------|
| Neon PostgreSQL | Primary database | App won't start |
| Cloudinary | Image/video uploads | Upload endpoints fail |
| SendGrid | Email notifications | Emails logged to console |
| Google Maps | Route optimization | Mock distances returned |
| Google Cloud Storage | Document storage | Upload endpoints fail |

## Key Design Decisions

1. **Serverless-first**: No persistent connections — Neon's HTTP driver and PG session store ensure stateless operation
2. **Dual auth**: JWT for mobile (stateless), sessions for web (stateful) — same codebase handles both
3. **Pre-bundled function**: esbuild bundles the entire server into `api/index.js` to avoid ESM module resolution issues on Vercel (`"type": "module"` in `package.json` prevents `@vercel/node` from bundling)
4. **Shared schema**: `shared/schema.ts` is the single source of truth for types — used by server, and can be imported by mobile
