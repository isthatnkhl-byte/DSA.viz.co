# Environment Variables Setup Guide

## Issue: Features Not Working After Deployment

Your Firebase login works because Firestore rules allow it, but LeetCode, problem statements, and GitHub connectivity require specific server-side environment variables to be properly configured.

---

## ✅ Vercel Environment Variables Setup

### 1. **Problem Statements & LeetCode Profiles**
These endpoints are **server-only** and do NOT need the `VITE_` prefix.

**Required in Vercel Settings:**
```
GEMINI_API_KEY=your_gemini_api_key_here
```

**Optional (for fallback):**
```
OPENROUTER_API_KEY=your_openrouter_key_here
```

**How to get Gemini API Key:**
- Go to [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
- Create a new API key
- Copy it to Vercel

### 2. **GitHub Connectivity**
These are the **critical missing pieces** for GitHub push functionality.

**Required in Vercel Settings:**
```
GITHUB_CLIENT_ID=your_github_oauth_app_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_app_client_secret
```

**How to set up GitHub OAuth App:**

1. Go to [https://github.com/settings/developers](https://github.com/settings/developers)
2. Click **"New OAuth App"** (or "Register a new application")
3. Fill in the form:
   - **Application name:** `DSA.viz` (or your preferred name)
   - **Homepage URL:** `https://your-vercel-domain.vercel.app`
   - **Authorization callback URL:** `https://your-vercel-domain.vercel.app/api/github/callback`
4. Click "Register application"
5. You'll see:
   - **Client ID** → Copy this to `GITHUB_CLIENT_ID` in Vercel
   - **Client Secret** → Click "Generate a new client secret" and copy to `GITHUB_CLIENT_SECRET` in Vercel

### 3. **Firebase Configuration (Client-Side)**
These need the `VITE_` prefix because they're exposed to the browser.

**Currently in your `.env.example`:**
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_DATABASE_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

✅ These are already working for you since Firebase login is functioning.

### 4. **Token Encryption (Recommended)**
```
ENCRYPTION_KEY=your_32_char_random_string
```
Generate with: `node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"`

---

## 🔧 Deployment Checklist

### Step 1: Add Environment Variables to Vercel

1. Go to your Vercel project settings: [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click **Settings** → **Environment Variables**
4. Add each variable:
   - `GEMINI_API_KEY`
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `ENCRYPTION_KEY` (optional but recommended)

### Step 2: Redeploy After Adding Variables

**Important:** Environment variables only take effect on new deployments.

```bash
git add .
git commit -m "chore: add environment variables"
git push origin main
```

Or manually redeploy from Vercel dashboard:
- Go to Deployments
- Click the latest deployment
- Click "Redeploy" at the top right

### Step 3: Verify Variables Are Set

After redeployment, check:
1. **Health Check:** Visit `https://your-vercel-domain.vercel.app/api/health`
2. **Problem Statements:** Should load when viewing a problem
3. **LeetCode Sync:** Try syncing your LeetCode profile from your profile page
4. **GitHub:** Click "Connect GitHub" on your profile page

---

## 🐛 Troubleshooting

### Problem Statements Not Loading
- ✓ Check `GEMINI_API_KEY` is set in Vercel
- ✓ Verify it's a valid key from [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
- ✓ Check browser console (F12) for errors
- ✓ Try the health check endpoint

### LeetCode Profile Not Syncing
- ✓ Try with a valid LeetCode username
- ✓ Check if account is public
- ✓ The endpoint tries two methods (GraphQL + REST API fallback)
- ✓ Watch for CORS or rate limit errors in console

### GitHub Connection Fails
- ✓ Verify `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are in Vercel
- ✓ Check the OAuth app callback URL matches exactly: `https://your-vercel-domain.vercel.app/api/github/callback`
- ✓ Make sure you've authorized the app to access your repos
- ✓ Check browser console for any error messages

### After Adding Variables, Features Still Not Working
1. Did you **redeploy**? New env vars don't activate until redeployment
2. Hard refresh your browser: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
3. Check Vercel logs: Go to Deployments → Select your deployment → Function Logs
4. Verify variables are actually set: In Vercel Settings, they should appear (values hidden)

---

## 📝 Quick Reference: Variable Names & Prefixes

| Variable | Type | Purpose | Prefix? |
|----------|------|---------|---------|
| `GEMINI_API_KEY` | Server | AI reviews, problem insights | ❌ No |
| `OPENROUTER_API_KEY` | Server | Fallback AI provider | ❌ No |
| `GITHUB_CLIENT_ID` | Server | GitHub OAuth login | ❌ No |
| `GITHUB_CLIENT_SECRET` | Server | GitHub OAuth security | ❌ No |
| `ENCRYPTION_KEY` | Server | Token encryption | ❌ No |
| `VITE_FIREBASE_*` | Client | Firebase config | ✅ Yes |

**Key Insight:** Server-side vars (used by `server.ts`) don't need `VITE_` prefix. Client-side vars (used by React) need `VITE_` prefix.

---

## 🚀 Local Testing

To test locally before deployment:

1. Create a `.env` file in your project root:
```bash
cp .env.example .env
```

2. Fill in your variables:
```
GEMINI_API_KEY=your_key_here
GITHUB_CLIENT_ID=your_id_here
GITHUB_CLIENT_SECRET=your_secret_here
VITE_FIREBASE_API_KEY=...
# etc.
```

3. Run locally:
```bash
npm run dev
```

4. Test features at `http://localhost:5173` (or your dev port)

---

## 🔐 Security Notes

- **NEVER** commit `.env` file to git
- **NEVER** share `GITHUB_CLIENT_SECRET` or `GEMINI_API_KEY`
- Vercel shows variable names but hides values for security
- The `ENCRYPTION_KEY` is used to encrypt GitHub tokens before storing them

