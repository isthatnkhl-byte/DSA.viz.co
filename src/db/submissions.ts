import fs from 'fs';
import path from 'path';
import { adminDb, isAdminDbAvailable, markAdminDbUnavailable } from '../lib/firebase-admin';
import { getCache, setCache } from '../lib/redis-cache';

const DATA_DIR = process.env.VERCEL ? path.join('/tmp', '.data') : path.join(process.cwd(), '.data');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');
const MAX_SUBMISSION_USERS_IN_MEMORY = 2000;
const MAX_SUBMISSIONS_PER_USER = 200;
const memorySubmissionsStore = new Map<string, any[]>();

function setMemorySubmissions(userId: string, list: any[]) {
  if (!memorySubmissionsStore.has(userId) && memorySubmissionsStore.size >= MAX_SUBMISSION_USERS_IN_MEMORY) {
    const oldest = memorySubmissionsStore.keys().next().value;
    if (oldest) memorySubmissionsStore.delete(oldest);
  }
  memorySubmissionsStore.set(userId, list.slice(0, MAX_SUBMISSIONS_PER_USER));
}

// Load persistent submissions if present
try {
  if (fs.existsSync(SUBMISSIONS_FILE)) {
    const raw = fs.readFileSync(SUBMISSIONS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    for (const [k, v] of Object.entries(parsed)) {
      if (Array.isArray(v)) {
        setMemorySubmissions(k, v);
      }
    }
  }
} catch {
  // Silent fallback
}

let persistSubmissionsTimer: ReturnType<typeof setTimeout> | null = null;
let isPersistingSubmissions = false;

function persistSubmissions() {
  if (persistSubmissionsTimer) return;
  persistSubmissionsTimer = setTimeout(async () => {
    persistSubmissionsTimer = null;
    if (isPersistingSubmissions) return;
    isPersistingSubmissions = true;
    try {
      const dir = path.dirname(SUBMISSIONS_FILE);
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
      }
      const obj: Record<string, any[]> = {};
      for (const [k, v] of memorySubmissionsStore.entries()) {
        obj[k] = v;
      }
      await fs.promises.writeFile(SUBMISSIONS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch {
      // Non-blocking fallback
    } finally {
      isPersistingSubmissions = false;
    }
  }, 500);
  if (typeof persistSubmissionsTimer.unref === 'function') {
    persistSubmissionsTimer.unref();
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

  // 2. Try Firestore ONLY if configured with service account credentials
  if (isAdminDbAvailable()) {
    try {
      const snapshot = await adminDb.collection('users').doc(userId).collection('submissions')
        .orderBy('createdAt', 'desc')
        .limit(MAX_SUBMISSIONS_PER_USER)
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
        setMemorySubmissions(userId, dbSubs);
        persistSubmissions();
        await setCache(`submissions:${userId}`, dbSubs, 600).catch(() => {});
        return dbSubs;
      }
    } catch {
      markAdminDbUnavailable();
    }
  }

  // 3. Fall back to local storage
  const local = memorySubmissionsStore.get(userId) || [];
  if (local.length > 0) {
    await setCache(`submissions:${userId}`, local, 600).catch(() => {});
  }
  return local;
}

export async function addSubmission(userId: string, data: any) {
  if (!userId || !data || typeof data !== 'object') return null;

  const rawCode = String(data.code || data.pseudocode || "").slice(0, 50000);
  const rawPseudocode = String(data.pseudocode || data.code || "").slice(0, 50000);
  const lang = String(data.lang || data.language || "pseudocode").slice(0, 40);
  const classification = String(data.classification || data.status || "Incomplete").slice(0, 40);
  const difficulty = String(data.difficulty || "Medium").slice(0, 20);
  const timeComplexity =
    data.timeComplexity || data.time_complexity || data.complexity?.time || null;
  const spaceComplexity =
    data.spaceComplexity || data.space_complexity || data.complexity?.space || null;
  const timeTakenMs = data.timeTakenMs || data.time_taken_ms || null;
  const createdAt = data.createdAt || data.created_at || new Date().toISOString();
  const rawVizSteps = data.viz_steps || data.vizSteps || null;
  const boundedVizSteps = Array.isArray(rawVizSteps) ? rawVizSteps.slice(0, 120) : null;
  const rawCodeLines = data.code_lines || data.codeLines || null;
  const boundedCodeLines = Array.isArray(rawCodeLines) ? rawCodeLines.slice(0, 200) : null;

  const newSub = {
    slug: String(data.slug || "problem").slice(0, 255),
    title: String(data.title || data.slug || "Problem").slice(0, 255),
    code: rawCode,
    pseudocode: rawPseudocode,
    lang,
    classification,
    difficulty,
    timeTakenMs: typeof timeTakenMs === "number" ? timeTakenMs : null,
    timeComplexity: timeComplexity ? String(timeComplexity).slice(0, 60) : null,
    spaceComplexity: spaceComplexity ? String(spaceComplexity).slice(0, 60) : null,
    review: data.review ? String(data.review).slice(0, 4000) : null,
    praise: data.praise ? String(data.praise).slice(0, 2000) : null,
    nudge: data.nudge ? String(data.nudge).slice(0, 2000) : null,
    vizSteps: boundedVizSteps,
    testCase: data.test_case || data.testCase || null,
    codeLines: boundedCodeLines,
    createdAt: String(createdAt).slice(0, 64),
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
  const updatedList = [formattedLocal, ...existing].slice(0, MAX_SUBMISSIONS_PER_USER);
  setMemorySubmissions(userId, updatedList);
  persistSubmissions();
  await setCache(`submissions:${userId}`, updatedList, 600).catch(() => {});

  if (isAdminDbAvailable()) {
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
      markAdminDbUnavailable();
    }
  }

  return formattedLocal;
}

export async function deleteSubmission(userId: string, id: string) {
  if (!userId) return;

  const existing = memorySubmissionsStore.get(userId) || [];
  const updated = existing.filter(s => String(s.id) !== String(id));
  setMemorySubmissions(userId, updated);
  persistSubmissions();
  await setCache(`submissions:${userId}`, updated, 600).catch(() => {});

  if (isAdminDbAvailable()) {
    try {
      await adminDb.collection('users').doc(userId).collection('submissions').doc(id).delete();
    } catch {
      markAdminDbUnavailable();
    }
  }
}

