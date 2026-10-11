import fs from 'fs';
import path from 'path';
import { adminDb } from '../lib/firebase-admin';
import { getCache, setCache, deleteCache } from '../lib/redis-cache';

const DATA_DIR = process.env.VERCEL ? path.join('/tmp', '.data') : path.join(process.cwd(), '.data');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');
const memorySubmissionsStore = new Map<string, any[]>();

// Load persistent submissions if present
try {
  if (fs.existsSync(SUBMISSIONS_FILE)) {
    const raw = fs.readFileSync(SUBMISSIONS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    for (const [k, v] of Object.entries(parsed)) {
      if (Array.isArray(v)) {
        memorySubmissionsStore.set(k, v);
      }
    }
  }
} catch {
  // Silent fallback
}

function persistSubmissions() {
  try {
    const dir = path.dirname(SUBMISSIONS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const obj: Record<string, any[]> = {};
    for (const [k, v] of memorySubmissionsStore.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch {
    // Non-blocking fallback
  }
}

export async function getSubmissions(userId: string) {
  if (!userId) return [];

  // 1. Check Redis cache first
  try {
    const cached = await getCache<any[]>(`submissions:${userId}`);
    if (cached && Array.isArray(cached)) return cached;
  } catch {
    // Fall through
  }

  // 2. Try Firestore if configured
  try {
    const snapshot = await adminDb.collection('users').doc(userId).collection('submissions')
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get();

    if (snapshot && snapshot.docs) {
      const dbSubs = snapshot.docs.map((doc: any) => {
        const r = doc.data();
        return {
          id: doc.id,
          userId: userId,
          slug: r.slug,
          title: r.title || r.slug,
          code: r.code,
          pseudocode: r.pseudocode || r.code,
          lang: r.lang || "pseudocode",
          classification: r.classification,
          difficulty: r.difficulty,
          timeTakenMs: r.timeTakenMs,
          timeComplexity: r.timeComplexity,
          spaceComplexity: r.spaceComplexity,
          time_complexity: r.timeComplexity,
          space_complexity: r.spaceComplexity,
          praise: r.praise,
          nudge: r.nudge,
          review: r.review,
          viz_steps: r.vizSteps,
          test_case: r.testCase,
          code_lines: r.codeLines,
          created_at: r.createdAt || new Date().toISOString(),
          createdAt: r.createdAt || new Date().toISOString(),
        };
      });
      memorySubmissionsStore.set(userId, dbSubs);
      persistSubmissions();
      await setCache(`submissions:${userId}`, dbSubs, 600).catch(() => {});
      return dbSubs;
    }
  } catch {
    // Admin DB credentials not present or network unavailable
  }

  // 3. Fall back to local storage
  const local = memorySubmissionsStore.get(userId) || [];
  if (local.length > 0) {
    await setCache(`submissions:${userId}`, local, 600).catch(() => {});
  }
  return local;
}

export async function addSubmission(userId: string, data: any) {
  if (!userId) return null;

  const code = data.code || data.pseudocode || "";
  const pseudocode = data.pseudocode || data.code || "";
  const lang = data.lang || data.language || "pseudocode";
  const classification = data.classification || data.status || "Incomplete";
  const difficulty = data.difficulty || "Medium";
  const timeComplexity =
    data.timeComplexity || data.time_complexity || data.complexity?.time || null;
  const spaceComplexity =
    data.spaceComplexity || data.space_complexity || data.complexity?.space || null;
  const timeTakenMs = data.timeTakenMs || data.time_taken_ms || null;
  const createdAt = data.createdAt || data.created_at || new Date().toISOString();

  const newSub = {
    slug: data.slug,
    title: data.title || data.slug || null,
    code,
    pseudocode,
    lang,
    classification,
    difficulty,
    timeTakenMs,
    timeComplexity,
    spaceComplexity,
    review: data.review || null,
    praise: data.praise || null,
    nudge: data.nudge || null,
    vizSteps: data.viz_steps || data.vizSteps || null,
    testCase: data.test_case || data.testCase || null,
    codeLines: data.code_lines || data.codeLines || null,
    createdAt,
  };

  const localId = "sub-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
  const formattedLocal = {
    ...newSub,
    id: localId,
    userId,
    title: newSub.title || newSub.slug,
    pseudocode: newSub.pseudocode || newSub.code,
    time_complexity: newSub.timeComplexity,
    space_complexity: newSub.spaceComplexity,
    viz_steps: newSub.vizSteps,
    test_case: newSub.testCase,
    code_lines: newSub.codeLines,
    created_at: newSub.createdAt,
  };

  const existing = memorySubmissionsStore.get(userId) || [];
  const updatedList = [formattedLocal, ...existing];
  memorySubmissionsStore.set(userId, updatedList);
  persistSubmissions();
  await setCache(`submissions:${userId}`, updatedList, 600).catch(() => {});

  try {
    const docRef = await adminDb.collection('users').doc(userId).collection('submissions').add(newSub);
    const doc = await docRef.get();
    if (doc && doc.exists) {
      const r = doc.data() as any;
      const formatted = {
        ...r,
        id: doc.id,
        userId: userId,
        title: r.title || r.slug,
        pseudocode: r.pseudocode || r.code,
        time_complexity: r.timeComplexity,
        space_complexity: r.spaceComplexity,
        viz_steps: r.vizSteps,
        test_case: r.testCase,
        code_lines: r.codeLines,
        created_at: r.createdAt || new Date().toISOString(),
      };
      return formatted;
    }
  } catch {
    // Fall back to local submission record
  }

  return formattedLocal;
}

export async function deleteSubmission(userId: string, id: string) {
  if (!userId) return;

  const existing = memorySubmissionsStore.get(userId) || [];
  const updated = existing.filter(s => String(s.id) !== String(id));
  memorySubmissionsStore.set(userId, updated);
  persistSubmissions();
  await setCache(`submissions:${userId}`, updated, 600).catch(() => {});

  try {
    await adminDb.collection('users').doc(userId).collection('submissions').doc(id).delete();
  } catch {
    // Silently continue
  }
}

