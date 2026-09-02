# Vercel Environment Variables Setup Guide

## Problem
API calls are not working on Vercel because environment variables are not properly configured.

## Solution

### Step 1: Add Environment Variables to Vercel
1. Go to your Vercel project dashboard: https://vercel.com/dashboard
2. Select your `DSA.viz.co` project
3. Go to **Settings** → **Environment Variables**
4. Add the following variables with their values from your `.env` file:

| Variable Name | Alternative / Alias | Scope |
|---|---|---|
| `GEMINI_API_KEY` | `VITE_GEMINI_API_KEY` / `GOOGLE_API_KEY` | Production, Preview, Development |
| `OPENROUTER_API_KEY` | `VITE_OPENROUTER_API_KEY` | Production, Preview, Development |
| `GITHUB_CLIENT_ID` | `VITE_GITHUB_CLIENT_ID` | Production, Preview, Development |
| `GITHUB_CLIENT_SECRET` | `VITE_GITHUB_CLIENT_SECRET` | Production, Preview, Development |
| `ENCRYPTION_KEY` | `VITE_ENCRYPTION_KEY` | Production, Preview, Development |
| `VITE_FIREBASE_API_KEY` | `FIREBASE_API_KEY` | Production, Preview, Development |
| `VITE_FIREBASE_AUTH_DOMAIN` | `FIREBASE_AUTH_DOMAIN` | Production, Preview, Development |
| `VITE_FIREBASE_PROJECT_ID` | `FIREBASE_PROJECT_ID` | Production, Preview, Development |
| `VITE_FIREBASE_STORAGE_BUCKET` | `FIREBASE_STORAGE_BUCKET` | Production, Preview, Development |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `FIREBASE_MESSAGING_SENDER_ID` | Production, Preview, Development |
| `VITE_FIREBASE_APP_ID` | `FIREBASE_APP_ID` | Production, Preview, Development |

### Step 2: Compatibility Pattern
The codebase has been configured to **automatically resolve both naming conventions**:
- If you entered `VITE_GEMINI_API_KEY`, both the Vite build and the serverless Express engine will recognize it.
- If you entered `GEMINI_API_KEY`, the serverless backend will automatically recognize it.
- To ensure 100% coverage across both SSR, Serverless functions, and Client-side fallbacks on Vercel, you can add both (or simply set `VITE_GEMINI_API_KEY` and `VITE_OPENROUTER_API_KEY`).

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
