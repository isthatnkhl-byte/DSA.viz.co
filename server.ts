import crypto from 'crypto';
import express, { Request, Response } from "express";
import { requireAuth, AuthRequest } from './src/middleware/auth';
import { getOrCreateUser } from './src/db/users';
import { getProfile, updateProfile } from './src/db/profiles';
import { getSubmissions, addSubmission, deleteSubmission } from './src/db/submissions';
import { processReviewPseudocode, processDatasetVisualization } from './src/lib/review.functions';
import { processPlaygroundReview } from './src/lib/playground.functions';
import { runSecureCpp } from './src/lib/compiler/index';
import { fetchLeetCodeStats } from './src/lib/leetcode-service';
import { statementForSlug } from './src/lib/statements';
import localStatementsJson from './src/data/statements.json';


import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";

import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';

import dotenv from "dotenv";

dotenv.config();


const getEncryptionKey = () => {
  const encKey = process.env.ENCRYPTION_KEY || process.env.VITE_ENCRYPTION_KEY;
  if (encKey) return Buffer.from(encKey.padEnd(32, '0').slice(0, 32));
  const secret = process.env.GITHUB_CLIENT_SECRET || process.env.VITE_GITHUB_CLIENT_SECRET || 'default_secret';
  return crypto.scryptSync(secret, 'salt', 32);
};

function encryptToken(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
}

function decryptToken(text) {
  try {
    const parts = text.split(':');
    if (parts.length !== 3) return text; // Fallback for old unencrypted tokens
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch(e) {
    return text;
  }
}

const app = express();
app.set("trust proxy", 1);
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  message: { error: "Too many requests, please try again later." },
  validate: { trustProxy: false, xForwardedForHeader: false, forwardedHeader: false }
});

const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60,
  message: { error: "AI rate limit exceeded. Please wait a moment and try again." },
  validate: { trustProxy: false, xForwardedForHeader: false, forwardedHeader: false }
});

app.use("/api/", apiLimiter);


// Server-side Gemini AI Client
function getGeminiClient(): GoogleGenAI {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.VITE_GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Initialize problem statements in memory from statically bundled JSON
const memoryStatements: Record<string, string> = {
  ...(((localStatementsJson as any)?.default || localStatementsJson || {}) as Record<string, string>),
};

// Health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "DSA.viz Full-Stack Intelligence & Workspace Platform",
  });
});

// Debug endpoint to check environment variables
app.get("/api/debug/env", (_req: Request, res: Response) => {
  res.json({
    gemini: !!(
      process.env.GEMINI_API_KEY ||
      process.env.VITE_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.VITE_GOOGLE_API_KEY
    ),
    openrouter: !!(
      process.env.OPENROUTER_API_KEY ||
      process.env.VITE_OPENROUTER_API_KEY ||
      process.env.OPEN_ROUTER_API_KEY ||
      process.env.VITE_OPEN_ROUTER_API_KEY ||
      process.env.Openrouterapi ||
      process.env.VITE_Openrouterapi
    ),
    github: !!(process.env.GITHUB_CLIENT_ID || process.env.VITE_GITHUB_CLIENT_ID),
    firebase: !!(process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID),
    nodeEnv: process.env.NODE_ENV,
  });
});

// API: Get problem statement
app.get("/api/statement", async (req: Request, res: Response) => {
  try {
    const slug = String(req.query.slug || "").trim();
    if (!slug) {
      return res.json({ statement: "" });
    }

    let s = "";
    try {
      s = decodeURIComponent(slug).toLowerCase().trim().replace(/\/+$/, "");
    } catch {
      s = slug.toLowerCase().trim().replace(/\/+$/, "");
    }

    const normalizedSlug = s.replace(/_/g, "-");

    // 1. Direct in-memory lookup
    let statement = memoryStatements[s] || memoryStatements[normalizedSlug] || "";

    // 2. Fallback: Synthesize statement from problem database
    if (!statement) {
      statement = statementForSlug(slug);
    }

    return res.json({ statement: statement || "" });
  } catch (error: any) {
    console.error("Error in /api/statement:", error);
    const fallback = statementForSlug(String(req.query.slug || ""));
    return res.json({ statement: fallback || "" });
  }
});


// API: List entire repository file tree

// --- DB API Routes ---
app.get("/api/profile", requireAuth, async (req: any, res) => {
  try {
    const user = await getOrCreateUser(req.user.uid, req.user.email || null).catch(() => null);
    const profile = await getProfile(req.user.uid).catch(() => null);
    res.json({
      uid: req.user.uid,
      email: req.user.email,
      displayName: user?.displayName || req.user.email?.split("@")[0] || "Explorer",
      avatarUrl: req.user.picture || null,
      ...user,
      ...profile,
    });
  } catch (error) {
    res.json({
      uid: req.user.uid,
      email: req.user.email,
      displayName: req.user.email?.split("@")[0] || "Explorer",
      avatarUrl: req.user.picture || null,
      createdAt: new Date().toISOString(),
    });
  }
});

app.post("/api/profile/update", requireAuth, async (req: any, res) => {
  try {
    const { username } = req.body;
    if (typeof username !== "string" || !username.trim()) {
      return res.status(400).json({ error: "Username is required." });
    }
    const clean = username.trim().replace(/^@+/, "");
    if (clean.length < 2 || clean.length > 30) {
      return res.status(400).json({ error: "Username must be between 2 and 30 characters." });
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(clean)) {
      return res.status(400).json({ error: "Username can only contain letters, numbers, underscores, dashes, and periods." });
    }
    const updated = await updateProfile(req.user.uid, { displayName: clean }).catch(() => null);
    res.json({
      ok: true,
      profile: {
        uid: req.user.uid,
        displayName: clean,
        ...(updated || {}),
      },
    });
  } catch (error) {
    console.error("Failed to update profile:", error);
    res.status(500).json({ error: "Failed to update profile username" });
  }
});

app.post("/api/sync-leetcode", requireAuth, async (req: any, res) => {
  try {
    const { username } = req.body;
    if (!username || typeof username !== "string" || !username.trim()) {
      return res.status(400).json({ error: "Valid LeetCode username is required." });
    }
    const cleanUsername = username.trim().replace(/^@+/, "");

    const fetchedStats = await fetchLeetCodeStats(cleanUsername);

    if (!fetchedStats) {
      return res.status(404).json({ error: `Could not load LeetCode data for "${cleanUsername}". Please verify the username is public.` });
    }

    // Persist via DB if available
    try {
      if (req.user?.uid) {
        await updateProfile(req.user.uid, { leetcodeUsername: cleanUsername, leetcodeStats: fetchedStats }).catch(() => null);
      }
    } catch (e) {
      console.warn("Server-side DB update warning in /api/sync-leetcode:", e);
    }

    res.json({ success: true, stats: fetchedStats });
  } catch (error: any) {
    console.error("Failed to sync LeetCode profile:", error);
    res.status(500).json({ error: error?.message || "Failed to sync" });
  }
});


app.get("/api/submissions", requireAuth, async (req: any, res) => {
  try {
    const subs = await getSubmissions(req.user.uid).catch(() => []);
    res.json(subs);
  } catch (error) {
    console.error("Failed to get submissions:", error);
    res.json([]);
  }
});

app.post("/api/submissions", requireAuth, async (req: any, res) => {
  try {
    const sub = await addSubmission(req.user.uid, req.body).catch(() => ({
      id: "sub-" + Date.now(),
      ...req.body,
      createdAt: new Date().toISOString(),
    }));
    res.json(sub);
  } catch (error) {
    console.error("Failed to add submission:", error);
    res.json({ id: "sub-" + Date.now(), ...req.body, createdAt: new Date().toISOString() });
  }
});

app.delete("/api/submissions/:id", requireAuth, async (req: any, res) => {
  try {
    await deleteSubmission(req.user.uid, req.params.id).catch(() => {});
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete submission:", error);
    res.json({ success: true });
  }
});
// ---------------------

// API: Multi-turn Chatbot endpoint
app.post("/api/chat", aiLimiter, async (req: Request, res: Response) => {
  try {
    const {
      messages = [],
      systemInstruction = "You are the expert lead architect and DSA educator for the DSA.viz project. You provide clear, technically accurate, and structured insights into data structures, algorithms, system architecture, AI contract normalizers, and interview coaching.",
      model = "gemini-3.5-flash",
      temperature = 0.7,
    } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    const ai = getGeminiClient();
    const allowedModels = [
      "gemini-3.1-pro-preview",
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
      "gemini-3.7-flash",
    ];
    const selectedModel = allowedModels.includes(model) ? model : "gemini-3.5-flash";

    const formattedContents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" || m.role === "model" ? "model" : "user",
      parts: [{ text: m.content || "" }],
    }));

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: formattedContents,
      config: {
        systemInstruction,
        temperature: Number(temperature) || 0.7,
      },
    });

    const replyText = response.text || "I was unable to generate a response.";

    return res.json({
      role: "assistant",
      content: replyText,
      modelUsed: selectedModel,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return res.status(500).json({
      error: error.message || "Failed to process chat request.",
      details: error.toString(),
    });
  }
});

// API: High-Quality Image Generation
app.post("/api/generate-image", aiLimiter, async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      aspectRatio = "16:9",
      imageSize,
      size,
      model = "gemini-3-pro-image-preview",
    } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Valid prompt is required." });
    }

    const ai = getGeminiClient();
    const validAspectRatios = ["1:1", "3:4", "4:3", "9:16", "16:9", "1:4", "1:8", "4:1", "8:1"];
    const validSizes = ["512px", "1K", "2K", "4K"];

    const selectedRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : "16:9";
    const requestedSize = size || imageSize || "2K";
    const selectedSize = validSizes.includes(requestedSize) ? requestedSize : "1K";

    let selectedModel = "gemini-3.1-flash-image";
    if (model === "gemini-3-pro-image-preview" || model === "gemini-3-pro-image") {
      selectedModel = "gemini-3-pro-image-preview";
    }

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: {
        parts: [
          {
            text: `High-resolution professional software architecture diagram and technical illustration: ${prompt}. Clean minimalist vector style, crisp high contrast technical graphics, developer documentation aesthetics, no blurry artifacts.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: selectedRatio,
          imageSize: selectedSize,
        },
      },
    });

    let imageUrl: string | null = null;
    let caption: string = "";

    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const mimeType = part.inlineData.mimeType || "image/png";
          imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
        } else if (part.text) {
          caption += part.text;
        }
      }
    }

    if (!imageUrl) {
      return res.status(500).json({
        error: "No image was returned from the generative model.",
        caption,
      });
    }

    return res.json({
      imageUrl,
      caption,
      aspectRatio: selectedRatio,
      imageSize: selectedSize,
      modelUsed: model,
    });
  } catch (error: any) {
    console.error("Image generation error:", error);
    return res.status(500).json({
      error: error.message || "Failed to generate image.",
      details: error.toString(),
    });
  }
});

// AI Review Endpoint
app.post("/api/review", async (req: Request, res: Response) => {
  try {
    const result = await processReviewPseudocode(req.body);
    res.json(result);
  } catch (err: any) {
    console.error("Error in /api/review:", err);
    res.status(500).json({ error: err?.message || "Failed to process pseudocode review" });
  }
});

// AI Dataset Visualization Endpoint
app.post("/api/visualize-dataset", async (req: Request, res: Response) => {
  try {
    const result = await processDatasetVisualization(req.body);
    res.json(result);
  } catch (err: any) {
    console.error("Error in /api/visualize-dataset:", err);
    res.status(500).json({ error: err?.message || "Failed to generate dataset visualization" });
  }
});

// AI Playground Review Endpoint
app.post("/api/playground-review", async (req: Request, res: Response) => {
  try {
    const result = await processPlaygroundReview(req.body);
    res.json(result);
  } catch (err: any) {
    console.error("Error in /api/playground-review:", err);
    res.status(500).json({ error: err?.message || "Failed to process playground review" });
  }
});

// C++ Sandboxed Online Compiler Endpoint
app.post("/api/compiler/execute", async (req: Request, res: Response) => {
  try {
    const { code = "", stdin = "" } = req.body || {};
    const result = await runSecureCpp(code, stdin);
    res.json(result);
  } catch (err: any) {
    console.error("Error in /api/compiler/execute:", err);
    res.status(500).json({
      stdout: "",
      stderr: err?.message || "Internal compilation error",
      exitCode: 1,
      status: "error",
      statusMessage: "Execution Error",
      timestamp: new Date().toISOString(),
    });
  }
});

// Vite Middleware for Dev / Static Serving for Production
// GitHub OAuth
app.get("/api/github/url", requireAuth, (req, res) => {
  const uid = req.user.uid;
  const clientId = process.env.GITHUB_CLIENT_ID || process.env.VITE_GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: "GITHUB_CLIENT_ID is not configured" });
  }

  // Use the origin from the request to construct the redirect URI
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const origin = req.headers.origin || `${proto}://${host}`;
  const redirectUri = `${origin}/api/github/callback`;
  
  // Create state combining uid and redirectUri
  const payload = JSON.stringify({ uid, redirectUri });
  const secret = process.env.GITHUB_CLIENT_SECRET || process.env.VITE_GITHUB_CLIENT_SECRET || 'fallback-secret';
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const signature = hmac.digest('hex');
  const state = Buffer.from(JSON.stringify({ payload, signature })).toString('base64');

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    scope: 'repo',
    state: state,
  });

  const authUrl = `https://github.com/login/oauth/authorize?${params}`;
  res.json({ url: authUrl });
});

app.get("/api/github/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) {
    return res.status(400).send("Missing code or state");
  }

  let uid, redirectUri;
  try {
    const decodedWrapper = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
    const { payload, signature } = decodedWrapper;
    
    // Verify signature
    const secret = process.env.GITHUB_CLIENT_SECRET || process.env.VITE_GITHUB_CLIENT_SECRET || 'fallback-secret';
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    
    if (signature !== expectedSignature) {
      return res.status(403).send("State signature mismatch - possible CSRF attack");
    }
    
    const decoded = JSON.parse(payload);
    uid = decoded.uid;
    redirectUri = decoded.redirectUri;
  } catch (e) {
    return res.status(400).send("Invalid state");
  }

  try {
    const clientId = process.env.GITHUB_CLIENT_ID || process.env.VITE_GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET || process.env.VITE_GITHUB_CLIENT_SECRET;
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      })
    });
    
    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      console.error("GitHub token error:", tokenData);
      return res.status(400).send(`Error: ${tokenData.error_description}`);
    }

    const accessToken = tokenData.access_token;
    
    // Save to DB
    await updateProfile(uid, { githubToken: encryptToken(accessToken) });

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GITHUB_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>GitHub connected successfully. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Failed to connect GitHub:", error);
    res.status(500).send("Failed to connect GitHub");
  }
});

app.post("/api/github/push", requireAuth, async (req, res) => {
  try {
    
    const pushSchema = z.object({
      code: z.string().max(50000, "Code is too large"),
      titleSlug: z.string().max(255),
      lang: z.string().max(50)
    });
    
    const parsed = pushSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.format() });
    }
    const { code, titleSlug, lang } = parsed.data;

    const uid = req.user.uid;
    
    const profile = await getProfile(uid);
    const githubToken = profile?.githubToken ? decryptToken(profile.githubToken) : null;
    
    if (!githubToken) {
      return res.status(401).json({ error: "GitHub account not connected" });
    }

    const extMap = {
      "cpp": "cpp",
      "java": "java",
      "python": "py",
      "python3": "py",
      "javascript": "js",
      "typescript": "ts"
    };
    const ext = extMap[lang] || "txt";
    const repoName = "LeetCode-Solutions";
    const path = `${titleSlug}/${titleSlug}.${ext}`;
    const message = `Add solution for ${titleSlug}`;

    // 1. Get GitHub Username
    const userRes = await fetch("https://api.github.com/user", {
      headers: { "Authorization": `Bearer ${githubToken}` }
    });
    const userData = await userRes.json();
    if (!userRes.ok) return res.status(400).json({ error: "Invalid GitHub token" });
    const owner = userData.login;

    // 2. Check if repo exists, create if not
    let repoRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
      headers: { "Authorization": `Bearer ${githubToken}` }
    });
    if (repoRes.status === 404) {
      repoRes = await fetch("https://api.github.com/user/repos", {
        method: "POST",
        headers: { "Authorization": `Bearer ${githubToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: repoName,
          description: "My LeetCode solutions synced automatically",
          private: false,
          auto_init: true
        })
      });
      if (!repoRes.ok) {
        return res.status(500).json({ error: "Failed to create repository" });
      }
      // wait a bit for initialization
      await new Promise(r => setTimeout(r, 2000));
    }

    // 3. Check if file exists to get SHA (for updates)
    let sha = undefined;
    const fileRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${path}`, {
      headers: { "Authorization": `Bearer ${githubToken}` }
    });
    if (fileRes.ok) {
      const fileData = await fileRes.json();
      sha = fileData.sha;
    }

    // 4. Create/Update file
    const content = Buffer.from(code).toString("base64");
    const pushRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${path}`, {
      method: "PUT",
      headers: { "Authorization": `Bearer ${githubToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        content,
        sha
      })
    });

    if (!pushRes.ok) {
      const err = await pushRes.json();
      return res.status(500).json({ error: "Failed to push code: " + err.message });
    }

    res.json({ success: true, url: `https://github.com/${owner}/${repoName}/blob/main/${path}` });

  } catch (error) {
    console.error("GitHub push error:", error);
    res.status(500).json({ error: "Failed to push to GitHub" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  

app.listen(PORT, "0.0.0.0", () => {
    console.log(`DSA.viz Workspace & Intelligence Platform running at http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export { app };
export default app;
