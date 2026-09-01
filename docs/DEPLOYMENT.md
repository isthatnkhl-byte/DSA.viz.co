# DSA.viz Deployment & Production Guide

This guide covers production deployment for **DSA.viz.co** across Cloud Run, Vercel, Docker, and Supabase.

---

## 1. Environment Configuration

Create a production `.env` file with the following variables:

```env
# Google Gemini API
GEMINI_API_KEY=AIzaSy...

# Optional OpenRouter Fallback Pool
OPENROUTER_API_KEY=sk-or-v1-...

# Supabase Auth & Database
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Host & Port Settings
NODE_ENV=production
PORT=3000
```

---

## 2. Docker Deployment

```dockerfile
# Multi-stage build for optimal image size
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production runtime
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["npm", "run", "start"]
```

Build and run container:
```bash
docker build -t dsa-viz:latest .
docker run -p 3000:3000 --env-file .env dsa-viz:latest
```

---

## 3. Google Cloud Run Deployment

```bash
# Build and submit container to Google Artifact Registry
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/dsa-viz

# Deploy to Cloud Run
gcloud run deploy dsa-viz \
  --image gcr.io/YOUR_PROJECT_ID/dsa-viz \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,PORT=3000" \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest,VITE_SUPABASE_URL=SUPABASE_URL:latest,VITE_SUPABASE_ANON_KEY=SUPABASE_KEY:latest"
```

---

## 4. Performance & Caching Strategy

1. **Static Asset Caching:** All immutable chunks in `/assets` are served with `Cache-Control: public, max-age=31536000, immutable`.
2. **Server Function Invalidation:** RPC responses for static problem statements are cached at the edge for 24 hours.
3. **AI Quota Rate Limiting:** Client requests are throttled to a maximum of 30 review queries per minute per IP to prevent quota exhaustion.
