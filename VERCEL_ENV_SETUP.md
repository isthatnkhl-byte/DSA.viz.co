# Vercel Environment Variables Setup Guide

## Problem
API calls are not working on Vercel because environment variables are not properly configured.

## Solution

### Step 1: Add Environment Variables to Vercel
1. Go to your Vercel project dashboard: https://vercel.com/dashboard
2. Select your `DSA.viz.co` project
3. Go to **Settings** → **Environment Variables**
4. Add the following variables with their values from your `.env` file:

### 🔒 Server Secrets (NEVER prefix with VITE_ to prevent public browser bundle leakage)
| Variable Name | Description | Scope |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini AI API Key | Production, Preview, Development |
| `OPENROUTER_API_KEY` | OpenRouter AI Multi-Model Key | Production, Preview, Development |
| `GITHUB_CLIENT_ID` | GitHub OAuth Client ID | Production, Preview, Development |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Client Secret | Production, Preview, Development |
| `ENCRYPTION_KEY` | AES-256 Token Encryption Key (≥ 32 chars) | Production, Preview, Development |
| `LIVEKIT_URL` | LiveKit Cloud WebSocket URL (`wss://nikhil-2fnvf789.livekit.cloud`) | Production, Preview, Development |
| `LIVEKIT_API_KEY` | LiveKit Cloud Project API Key (`APISRx8GpvZyxXd`) | Production, Preview, Development |
| `LIVEKIT_API_SECRET` | LiveKit Cloud Project API Secret | Production, Preview, Development |

### 🌐 Public Client Variables (Exposed to browser bundle)
| Variable Name | Description | Scope |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Client API Key | Production, Preview, Development |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | Production, Preview, Development |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID | Production, Preview, Development |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket | Production, Preview, Development |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID | Production, Preview, Development |
| `VITE_FIREBASE_APP_ID` | Firebase Web App ID | Production, Preview, Development |

> ⚠️ **CRITICAL SECURITY RULE:** Never add the `VITE_` prefix to server secrets (`GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `GITHUB_CLIENT_SECRET`, `ENCRYPTION_KEY`). Vite embeds all `VITE_*` variables into client-side JS bundles, which exposes them to any visitor viewing browser DevTools.

### Step 3: Authorize Your Vercel Domain in Firebase (Required for Google Sign-In)
1. Open the [Firebase Console](https://console.firebase.google.com/) and select your project (`gen-lang-client-0136275577` or your configured `VITE_FIREBASE_PROJECT_ID`).
2. Navigate to **Authentication** → **Settings** → **Authorized domains**.
3. Click **Add domain** and add your Vercel deployment domain (e.g. `dsa-viz-co.vercel.app` or your custom domain).

### Step 4: Redeploy on Vercel
After adding or modifying environment variables in Vercel:
1. Go to the **Deployments** tab on Vercel
2. Click **...** on your latest deployment and select **Redeploy** (ensure **"Use existing Build Cache" is unchecked** if you want to rebuild with new Vite env vars).
3. Alternatively, push a new commit to trigger a fresh build.

### Step 5: Verify Setup
Test if the production server and API are healthy:
```bash
curl https://your-vercel-url.vercel.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-10-11T12:00:00.000Z"
}
```

## Working Endpoints (Protected by Google OAuth Bearer Token)

All functional endpoints require `Authorization: Bearer <Firebase_Google_ID_Token>`:
- `GET /api/health` - Public health check
- `GET /api/profile` & `POST /api/profile` - Authenticated user profile & telemetry
- `GET /api/user-keys/status` & `POST /api/user-keys` - Zero-knowledge AES-256-GCM API Key Vault
- `POST /api/problem-run-tests` & `POST /api/problem-submit` - AI + Sandbox LeetCode Judge
- `POST /api/compiler/execute` - Multi-language C/C++/Java/Python sandbox compiler
- `POST /api/review` - Pseudocode review with AI
- `POST /api/visualize-dataset` - Dataset visualization
- `POST /api/chat` - Socratic AI Tutor & Interviewer chat
- `POST /api/playground-review` - Playground code review
- `POST /api/interview-evaluate` - Multi-tier code evaluation (Brute Force / Better / Optimal)
- `POST /api/interview-respond` - Real-time conversational interviewer responses
- `POST /api/interview-scorecard` - Comprehensive FAANG-grade interview scorecard
- `GET /api/livekit-token` - LiveKit WebRTC access token generator for real-time voice

