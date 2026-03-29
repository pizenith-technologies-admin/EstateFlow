# Estate Vista - Localhost & Custom Deployment Guide

## Overview
Your application now uses **standard JWT-based authentication** that works on localhost and any hosting service (AWS, Heroku, DigitalOcean, etc.).

---

## 🚀 Quick Start - Localhost Setup

### 1. Prerequisites
```bash
Node.js 18+ 
npm or yarn
PostgreSQL (local or remote via Neon)
```

### 2. Environment Setup
Create a `.env` file in the root directory:
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/estate_vista

# JWT & Session
JWT_SECRET=your-secure-random-key-here-min-32-chars
SESSION_SECRET=your-session-secret-here

# Optional: SendGrid for email
SENDGRID_API_KEY=your-sendgrid-key

# Optional: Google Maps
GOOGLE_MAPS_API_KEY=your-google-maps-key

# Node Environment
NODE_ENV=development
PORT=5000
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Setup Database
If using Neon (cloud PostgreSQL):
```bash
# Push schema to your Neon database
npm run db:push
```

Or if using local PostgreSQL, create the database first:
```bash
createdb estate_vista
npm run db:push
```

### 5. Run Locally
```bash
npm run dev
```

The app will start at `http://localhost:5000`

---

## 🔑 Authentication

### Default Test Users
Your app comes with two pre-configured test users:

| Role | Email | Password |
|------|-------|----------|
| Agent | agent@example.com | password123 |
| Client | client@example.com | password123 |

### How to Sign In

#### Option 1: Quick Login (Development)
Navigate to:
- **Client:** `http://localhost:5000/api/login?role=client`
- **Agent:** `http://localhost:5000/api/login?role=agent`

#### Option 2: POST Login (Production-ready)
```bash
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "agent@example.com",
    "password": "password123"
  }'
```

Response:
```json
{
  "message": "Login successful",
  "user": {
    "id": "agent-test-001",
    "email": "agent@example.com",
    "firstName": "John",
    "lastName": "Agent",
    "role": "agent"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Add More Users
Edit `server/simpleAuth.ts` and add users to the `TEST_USERS` object:

```typescript
const TEST_USERS = {
  agent: { ... },
  client: { ... },
  newUser: {
    id: "unique-id",
    email: "user@example.com",
    firstName: "First",
    lastName: "Last",
    role: "agent", // or "client"
    password: "password123",
  },
};
```

---

## 📦 Production Deployment

### Option 1: Heroku
```bash
# Install Heroku CLI
heroku login
heroku create your-app-name

# Set environment variables
heroku config:set JWT_SECRET=your-secure-key
heroku config:set SESSION_SECRET=your-session-secret
heroku config:set DATABASE_URL=your-database-url
heroku config:set NODE_ENV=production

# Deploy
git push heroku main
```

### Option 2: DigitalOcean App Platform
1. Connect your GitHub repository
2. Set environment variables in Dashboard:
   - `JWT_SECRET`
   - `SESSION_SECRET`
   - `DATABASE_URL`
   - `NODE_ENV=production`
3. Build command: `npm install`
4. Run command: `npm run start`

### Option 3: AWS Elastic Beanstalk
```bash
# Install EB CLI
eb init -p node.js-20 estate-vista
eb create estate-vista-env

# Set environment variables
eb setenv JWT_SECRET=your-secure-key SESSION_SECRET=your-session-secret NODE_ENV=production

# Deploy
eb deploy
```

### Option 4: Docker (Any Cloud)
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
```

Then deploy the container to:
- Google Cloud Run
- AWS ECS
- DigitalOcean Container Registry
- Any Docker hosting service

---

## 🗄️ Database Options

### 1. Neon (Cloud PostgreSQL) - Recommended
```bash
# Sign up at https://neon.tech
# Get connection string from Neon Dashboard
export DATABASE_URL="postgresql://user:password@neon.tech/database"
npm run db:push
```

### 2. Local PostgreSQL
```bash
brew install postgresql  # macOS
# or apt-get install postgresql  # Linux

createdb estate_vista
npm run db:push
```

### 3. AWS RDS
```bash
# Create RDS instance in AWS Console
# Get endpoint and credentials
export DATABASE_URL="postgresql://user:pass@your-rds-endpoint:5432/estate_vista"
npm run db:push
```

---

## 🔒 Security Checklist

Before deploying to production:

- [ ] Change `JWT_SECRET` to a strong random string (min 32 chars)
- [ ] Change `SESSION_SECRET` to a different strong string
- [ ] Set `NODE_ENV=production`
- [ ] Use HTTPS (all hosting services provide SSL)
- [ ] Enable secure cookies in production (already configured)
- [ ] Keep dependencies updated: `npm audit fix`
- [ ] Set strong database password
- [ ] Enable database backups
- [ ] Consider rate limiting for `/api/login` endpoint
- [ ] Use environment secrets manager (not plain .env files)

---

## 📝 Configuration Files

### Available Scripts
```json
{
  "dev": "NODE_ENV=development tsx server/index.ts",
  "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
  "start": "NODE_ENV=production node dist/index.js",
  "check": "tsc",
  "db:push": "drizzle-kit push"
}
```

### Build for Production
```bash
npm run build
npm start
```

---

## 🆘 Troubleshooting

### Issue: "JWT_SECRET not set"
**Solution:** Add `JWT_SECRET` to your `.env` file or environment variables

### Issue: "Cannot connect to database"
**Solution:** 
1. Check `DATABASE_URL` is correct
2. Verify PostgreSQL is running
3. Test connection: `psql $DATABASE_URL`

### Issue: "Login fails with invalid credentials"
**Solution:** Check email and password match test users in `server/simpleAuth.ts`

### Issue: "Session not persisting"
**Solution:** Ensure cookies are enabled and `secure: false` for localhost

---

## 📚 Auth System Details

### How It Works
1. User submits email/password via POST `/api/login`
2. System validates against test users
3. JWT token is generated (7-day expiry)
4. Session is created with user info
5. Frontend stores token for API requests
6. Middleware validates token on protected routes

### Customization
To use a different auth system:
1. Edit `server/simpleAuth.ts`
2. Replace test users with your user database
3. Change password validation logic
4. Modify JWT payload as needed

### Protected Routes
All routes using `isAuthenticated` middleware require valid session:
```typescript
app.get('/api/protected-route', isAuthenticated, (req, res) => {
  const userId = (req.session as any).user.id;
  // Handle request
});
```

---

## 🚀 Ready to Deploy!

Your app is now ready for production. Choose your hosting platform and follow the deployment steps above.

**Questions?** Check the troubleshooting section or review the code in `server/simpleAuth.ts`.
