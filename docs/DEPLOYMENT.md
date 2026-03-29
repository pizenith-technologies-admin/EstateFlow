# Deployment

## Overview

| Target | Platform | Entry Point |
|--------|----------|-------------|
| Backend + Web | Vercel (serverless) | `api/index.js` (pre-bundled) |
| Mobile (Android) | EAS Build → APK | `mobile/` |
| Mobile (iOS) | EAS Build → TestFlight | `mobile/` |

---

## Backend + Web (Vercel)

### How It Works

1. `npm run build:vercel` runs on Vercel:
   - `vite build` → builds React frontend to `dist/public/`
   - `esbuild api/_handler.ts --bundle ...` → bundles entire server into `api/index.js`
2. Vercel serves `dist/public/` as static files
3. All `/api/*` requests are routed to the `api/index.js` serverless function

### First-Time Setup

**1. Push to GitHub**
```bash
git add .
git commit -m "Deploy"
git push origin main
```

**2. Run DB migration**
```bash
DATABASE_URL="<your-neon-url>" npm run db:push
```

**3. Import project on Vercel**
- Go to [vercel.com/new](https://vercel.com/new)
- Import your GitHub repository
- Framework preset: **Other**
- Build command: `npm run build:vercel` *(auto-detected from vercel.json)*
- Output directory: `dist/public` *(auto-detected)*

**4. Add environment variables**

In Vercel → Project → Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Neon connection string |
| `JWT_SECRET` | Random 48-char string |
| `SESSION_SECRET` | Different random 48-char string |
| `NODE_ENV` | `production` |
| `SENDGRID_API_KEY` | From SendGrid dashboard |
| `VITE_GOOGLE_MAPS_API_KEY` | From Google Cloud Console |
| `CLOUDINARY_CLOUD_NAME` | `dano2nast` |
| `CLOUDINARY_API_KEY` | From Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | From Cloudinary dashboard |
| `GOOGLE_CLOUD_PROJECT_ID` | GCP project ID |
| `GOOGLE_CLOUD_KEY_BASE64` | base64 of service account JSON |
| `PRIVATE_OBJECT_DIR` | `/bucket-name/objects` |
| `ALLOWED_ORIGINS` | `https://yourdomain.com` (optional) |

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**5. Deploy**
Click **Deploy** in Vercel dashboard. Takes ~2 minutes.

### Subsequent Deploys

Vercel auto-deploys on every push to `main`. To manually redeploy:
```bash
# Via CLI
vercel --prod

# Or push any commit
git push origin main
```

### Updating the Pre-bundled Function

`api/index.js` is committed to git and rebuilt on every Vercel deploy via the build command. If you make changes to server code locally, rebuild before committing:

```bash
cd EstateFlow
npx esbuild api/_handler.ts --bundle --platform=node --format=esm --packages=external --outfile=api/index.js
git add api/index.js
git commit -m "Rebuild server bundle"
git push
```

### vercel.json Reference

```json
{
  "version": 2,
  "buildCommand": "npm run build:vercel",
  "outputDirectory": "dist/public",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## Mobile App (Expo / EAS Build)

### Prerequisites

```bash
npm install -g eas-cli
eas login          # Expo account (free at expo.dev)
```

### Configuration Files

**`mobile/eas.json`** — build profiles:
- `preview` → Android APK for direct install, iOS Simulator
- `production` → Android AAB for Play Store, iOS for App Store

**`mobile/app.json`** — app metadata:
- Bundle ID: `com.estatevista.app`
- Expo project ID: linked to your `expo.dev` account

### Build Android APK (for testing)

```bash
cd mobile
eas build --platform android --profile preview
```

- Builds in Expo's cloud (~10–15 min)
- No Android SDK needed locally
- Download link appears when done
- Install `.apk` directly on any Android device (enable "Install from unknown sources")

### Build iOS (for testing on Simulator — Mac only)

```bash
cd mobile
eas build --platform ios --profile preview
```

Downloads a `.tar.gz` containing the `.app` file. Drag into Xcode Simulator.

### Build for App Stores (Production)

```bash
# Android — generates .aab for Google Play
eas build --platform android --profile production

# iOS — generates .ipa for App Store (requires Apple Developer account)
eas build --platform ios --profile production
```

### Submit to App Stores

```bash
eas submit --platform android    # Google Play
eas submit --platform ios        # Apple App Store
```

### Updating the API URL

The mobile app reads `EXPO_PUBLIC_API_URL` from `mobile/.env`. Update it to your production Vercel URL before building:

```
# mobile/.env
EXPO_PUBLIC_API_URL=https://estate-flow-deployment.vercel.app
```

This is also hardcoded in `mobile/eas.json` under each build profile's `env` section.

### Quick Testing Without a Build (Expo Go)

Install **Expo Go** from the App Store or Google Play, then:

```bash
cd mobile
npx expo start
```

Scan the QR code with the Expo Go app. The app loads instantly — no build needed. Best for day-to-day development.

---

## Environment Variables Reference

See [.env.example](../.env.example) for the full annotated list.

### Generating Secrets

```bash
# JWT_SECRET and SESSION_SECRET — run twice, use different values
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Google Cloud Key (base64)

```bash
# Linux/Mac
base64 -i service-account-key.json

# Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account-key.json"))
```

Set the output as `GOOGLE_CLOUD_KEY_BASE64` in Vercel.

---

## Known Limitations

| Issue | Detail |
|-------|--------|
| Cold starts | First request after inactivity may take 2–5s while the function initialises |
| Function timeout | Default 10s on Vercel Hobby plan — long DB operations may hit this |
| No WebSocket | Vercel serverless doesn't support persistent WebSocket connections — chat uses HTTP polling |
| iOS builds | Real device testing requires an Apple Developer account ($99/yr) |
