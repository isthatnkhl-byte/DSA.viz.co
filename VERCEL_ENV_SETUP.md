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

### Step 3: Redeploy on Vercel
After adding or modifying environment variables in Vercel:
1. Go to the **Deployments** tab on Vercel
2. Click **...** on your latest deployment and select **Redeploy** (ensure **"Use existing Build Cache" is unchecked** if you want to rebuild with new Vite env vars).
3. Alternatively, push a new commit to trigger a fresh build.

### Step 4: Verify Setup
Test if environment variables are loaded correctly:
```bash
curl https://your-vercel-url.vercel.app/api/debug/env
```

Expected response:
```json
{
  "gemini": true,
  "openrouter": true,
  "github": true,
  "firebase": true,
  "nodeEnv": "production"
}
```

If any values are `false`, that environment variable is not set in Vercel.

## Troubleshooting

### Issue: Still getting "No API keys configured" error

1. **Check Vercel logs**: Go to **Deployments** → Select latest → **Logs**
2. **Verify variable names**: Make sure exact variable names match above (case-sensitive)
3. **Redeploy after changes**: Vercel doesn't auto-reload env vars on existing deployments
4. **Clear browser cache**: CTRL+Shift+Delete and refresh

### Issue: API keys work locally but not on Vercel

- Local uses `.env` file which Vercel doesn't have
- Vercel must use the Environment Variables settings
- Never commit sensitive keys to Git

### Issue: CORS or fetch errors

- Ensure API endpoints are server-side routes (in `server.ts`)
- Client-side code should call `/api/review`, `/api/chat`, etc. via fetch

## Working Endpoints

After setup, these should work:
- `POST /api/review` - Pseudocode review with AI
- `POST /api/visualize-dataset` - Dataset visualization
- `POST /api/chat` - Interview chat with Gemini
- `POST /api/playground-review` - Playground code review
- `GET /api/debug/env` - Check environment variables

---

**Questions?** Check your Vercel project logs for detailed error messages.
