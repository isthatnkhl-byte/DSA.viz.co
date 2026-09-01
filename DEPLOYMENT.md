# DSA.viz - Complete GitHub & Vercel Deployment Guide

This guide provides exhaustive, end-to-end instructions for deploying the **DSA.viz Full-Stack Platform** to **GitHub**, **Vercel**, and **GitHub Codespaces**.

---

## 🏗️ Architecture Overview

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + TanStack Router & Monaco Editor.
- **Backend / API**: Express.js API handlers mapped to Vercel Serverless Functions (`/api/index.ts` & `vercel.json`).
- **Database & Auth**: Firebase Authentication (Google Sign-In) & Cloud Firestore (`firebase-applet-config.json`).
- **AI Engine**: Google Gemini API (`@google/genai`) for intelligent pseudocode review, dataset visualizer, and interview assistance.
- **C++ Compiler Sandbox**: Dual-tier remote compilation (Godbolt Compiler Explorer GCC 13.2/14.1 & Wandbox) — requires **no local GCC binary installation**.

---

## 🚀 Quick Step-by-Step Deployment Workflow

```
[ Download ZIP ] ──> [ Push to GitHub ] ──> [ Import to Vercel ] ──> [ Add Env Vars ] ──> [ Live in 60s ]
```

---

## Part 1: Push Code to GitHub

### 1. Extract the downloaded ZIP
Extract the ZIP archive to a folder on your computer (e.g. `dsa-viz-platform`).

### 2. Initialize Git and Push to GitHub
Open your terminal (or VS Code / Command Prompt) inside the extracted directory and run:

```bash
# 1. Initialize local repository
git init -b main

# 2. Stage all project files
git add .

# 3. Create initial commit
git commit -m "feat: initial commit of DSA.viz workspace platform"

# 4. Create a new repository on https://github.com/new (e.g., dsa-viz)
# 5. Link and push to your GitHub repo (replace with your repo URL):
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>.git
git push -u origin main
```

---

## Part 2: Deploying to Vercel (1-Click Setup)

The repository already includes pre-configured `vercel.json` and `/api/index.ts` files that bridge all Express API endpoints and Vite frontend routes seamlessly on Vercel.

### Step 1: Import Project into Vercel
1. Log in to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **"Add New..."** $\rightarrow$ **"Project"**.
3. Select your newly pushed GitHub repository (`dsa-viz`).

### Step 2: Configure Build & Output Settings
Vercel will auto-detect Vite. Confirm the settings:
- **Framework Preset**: `Vite`
- **Root Directory**: `./` (leave default)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Step 3: Add Environment Variables in Vercel
Under **Environment Variables**, add the following keys:

| Key | Required? | Description / Value |
|---|---|---|
| `GEMINI_API_KEY` | **Required** | Your Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `OPENROUTER_API_KEY` | Optional | OpenRouter API Key (for alternative LLM providers) |
| `GITHUB_CLIENT_ID` | Optional | GitHub OAuth App Client ID (for 1-click GitHub push sync) |
| `GITHUB_CLIENT_SECRET` | Optional | GitHub OAuth App Client Secret |
| `ENCRYPTION_KEY` | Optional | 32-character random string for securing OAuth tokens |

### Step 4: Click Deploy
Click **"Deploy"**. Vercel will build the frontend into `dist/` and package `/api` into serverless functions in ~45 seconds.

---

## Part 3: Firebase Google Sign-In Authorization (Crucial Step!)

When your app deploys on Vercel, it receives a domain like `dsa-viz.vercel.app` (or custom domain). You must allow this domain in Firebase for Google Sign-In to work.

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select the project: `seventh-cabinet-mq6d2` (or your own Firebase project if migrated).
3. In the left navigation, click **Authentication** $\rightarrow$ **Settings** tab.
4. Select **Authorized domains** in the sidebar.
5. Click **"Add domain"** and enter your Vercel URL (e.g. `dsa-viz.vercel.app` and any custom domains).
6. Click **Save**. Google Sign-In will now work seamlessly on your live URL!

---

## Part 4: Running Locally or in GitHub Codespaces

If you or Codespaces AI want to run and develop the project:

### 1. Open in GitHub Codespaces
1. On your GitHub repository page, click the green **"<> Code"** button.
2. Select the **"Codespaces"** tab $\rightarrow$ Click **"Create codespace on main"**.

### 2. Install Dependencies
```bash
npm install
```

### 3. Create `.env` File
Create a `.env` file in the root directory:
```bash
cp .env.example .env
```
Open `.env` and paste your `GEMINI_API_KEY`:
```env
GEMINI_API_KEY="AIzaSy..."
```

### 4. Start the Development Server
```bash
npm run dev
```
- The development server starts at **http://localhost:3000** (or port forwarded automatically in Codespaces).
- API routes (`/api/health`, `/api/chat`, `/api/compiler/execute`, `/api/statement`) and the Vite client run concurrently.

---

## Part 5: Complete Verification Checklist

After deploying on Vercel, verify these key features:

- [ ] **Home & Problem Catalog**: Navigate to `/problems` and confirm problems load with tags and filters.
- [ ] **Compiler Sandbox**: Open `/problem/two-sum`, switch to the **C++ (Online Compiler)** tab, and click **"Run Code (Compiler)"**. Verify that output returns from the sandbox.
- [ ] **AI Review / Chat**: Open the AI Assistant / Review tab to verify Gemini API connection.
- [ ] **Authentication**: Click **"Sign In with Google"** and confirm login status updates.
- [ ] **Data Persistence**: Confirm your LeetCode profile sync or solved problems persist to Firestore.

---

## 🛠️ Alternative Hosting Options (Docker / Railway / Render / VPS)

If you prefer a standalone continuous Node.js server instead of Vercel Serverless:

### Option A: Railway / Render (Zero-Config Node Service)
1. Push to GitHub and connect to [Railway](https://railway.app) or [Render](https://render.com).
2. Set Build Command: `npm run build`
3. Set Start Command: `npm start`
4. Set Environment Variable: `NODE_ENV=production`, `GEMINI_API_KEY=...`

### Option B: Docker Container
You can build and run using Docker:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```
Run container:
```bash
docker build -t dsa-viz .
docker run -p 3000:3000 -e GEMINI_API_KEY="your_key" dsa-viz
```

---

## ❓ Frequently Asked Questions & Troubleshooting

#### 1. Why do API routes return 404 on Vercel?
Ensure `vercel.json` is located in the root of the repository. It redirects all `/api/*` requests to `/api/index.ts`.

#### 2. Why does Google Sign-In fail with `auth/unauthorized-domain`?
Follow **Part 3** above to add your `*.vercel.app` deployment domain into Firebase Console $\rightarrow$ Authentication $\rightarrow$ Authorized domains.

#### 3. Do I need to install GCC / g++ on Vercel?
**No.** The built-in compiler sandbox dispatches execution to isolated high-performance Godbolt Compiler Explorer & Wandbox sandboxes over secure HTTPS APIs, so no local compiler is needed on Vercel.
