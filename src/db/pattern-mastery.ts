import fs from "node:fs";
import path from "node:path";
import {
  adminDb,
  isAdminDbAvailable,
  markAdminDbUnavailable,
} from "../lib/firebase-admin";
import { getCache, setCache } from "../lib/redis-cache";
import {
  createEmptyUserPatternProfile,
  enforceProfileBounds,
} from "../lib/master-patterns/scheduler";
import {
  UserPatternProfileSchema,
  type PatternQuestionCard,
  type PatternSessionState,
  type UserPatternProfile,
} from "../lib/master-patterns/types";

const DATA_DIR = process.env.VERCEL
  ? path.join("/tmp", ".data")
  : path.join(process.cwd(), ".data");
const PROFILES_FILE = path.join(DATA_DIR, "pattern-mastery-profiles.json");

const MAX_PROFILES_IN_MEMORY = 2000;
const MAX_SESSIONS_IN_MEMORY = 1500;
const SESSION_TTL_SECONDS = 60 * 60 * 4; // 4 hours

const memoryProfiles = new Map<string, UserPatternProfile>();
const memorySessions = new Map<
  string,
  { state: PatternSessionState; expiresAt: number }
>();

function setBoundedProfile(uid: string, profile: UserPatternProfile): void {
  if (!memoryProfiles.has(uid) && memoryProfiles.size >= MAX_PROFILES_IN_MEMORY) {
    const oldest = memoryProfiles.keys().next().value;
    if (oldest) memoryProfiles.delete(oldest);
  }
  memoryProfiles.set(uid, profile);
}

function setBoundedSession(sessionId: string, state: PatternSessionState): void {
  if (!memorySessions.has(sessionId) && memorySessions.size >= MAX_SESSIONS_IN_MEMORY) {
    const oldest = memorySessions.keys().next().value;
    if (oldest) memorySessions.delete(oldest);
  }
  memorySessions.set(sessionId, {
    state,
    expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000,
  });
}

// Hydrate local dev profile cache if present
try {
  if (fs.existsSync(PROFILES_FILE)) {
    const raw = fs.readFileSync(PROFILES_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const [uid, val] of Object.entries(parsed)) {
      const checked = UserPatternProfileSchema.safeParse(val);
      if (checked.success) {
        setBoundedProfile(uid, enforceProfileBounds(checked.data));
      }
    }
  }
} catch {
  // Non-fatal local hydration fallback
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;
let isPersisting = false;

function scheduleLocalProfileFlush(): void {
  if (persistTimer) return;
  persistTimer = setTimeout(async () => {
    persistTimer = null;
    if (isPersisting) return;
    isPersisting = true;
    try {
      const dir = path.dirname(PROFILES_FILE);
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
      }
      const snapshot: Record<string, UserPatternProfile> = {};
      for (const [uid, prof] of memoryProfiles.entries()) {
        snapshot[uid] = prof;
      }
      await fs.promises.writeFile(
        PROFILES_FILE,
        JSON.stringify(snapshot, null, 2),
        "utf-8",
      );
    } catch {
      // Non-fatal local disk persistence fallback
    } finally {
      isPersisting = false;
    }
  }, 400);
  if (typeof persistTimer.unref === "function") {
    persistTimer.unref();
  }
}

function normalizeLoadedProfile(
  uid: string,
  candidate: unknown,
): UserPatternProfile | null {
  const parsed = UserPatternProfileSchema.safeParse(candidate);
  if (!parsed.success) return null;
  return enforceProfileBounds({ ...parsed.data, userId: uid });
}

/**
 * Loads the single O(1)-bounded pattern mastery profile for a user.
 * Read precedence: memory -> Redis -> Firestore (`users/{uid}/pattern_mastery/profile`) -> fresh profile.
 */
export async function getUserPatternProfile(
  uid: string,
): Promise<UserPatternProfile> {
  if (!uid) return createEmptyUserPatternProfile("anonymous");

  const mem = memoryProfiles.get(uid);
  if (mem) return mem;

  try {
    const cached = await getCache<unknown>(`pattern_profile:${uid}`);
    const normalized = normalizeLoadedProfile(uid, cached);
    if (normalized) {
      setBoundedProfile(uid, normalized);
      return normalized;
    }
  } catch {
    // Fall through to Firestore
  }

  if (isAdminDbAvailable()) {
    try {
      const docRef = adminDb
        .collection("users")
        .doc(uid)
        .collection("pattern_mastery")
        .doc("profile");
      const snap = await docRef.get();
      if (snap && snap.exists) {
        const normalized = normalizeLoadedProfile(uid, snap.data());
        if (normalized) {
          setBoundedProfile(uid, normalized);
          await setCache(`pattern_profile:${uid}`, normalized, 1800).catch(
            () => {},
          );
          return normalized;
        }
      }
    } catch {
      markAdminDbUnavailable();
    }
  }

  const fresh = createEmptyUserPatternProfile(uid);
  setBoundedProfile(uid, fresh);
  return fresh;
}

/**
 * Atomically persists the O(1)-bounded UserPatternProfile as a single Firestore
 * document (overwriting with merge: false so pruned/evicted signatures never linger).
 */
export async function saveUserPatternProfile(
  uid: string,
  profile: UserPatternProfile,
): Promise<UserPatternProfile> {
  const bounded = enforceProfileBounds({ ...profile, userId: uid });
  setBoundedProfile(uid, bounded);
  scheduleLocalProfileFlush();

  await setCache(`pattern_profile:${uid}`, bounded, 1800).catch(() => {});

  if (isAdminDbAvailable()) {
    try {
      await adminDb
        .collection("users")
        .doc(uid)
        .collection("pattern_mastery")
        .doc("profile")
        .set(bounded);
    } catch {
      markAdminDbUnavailable();
    }
  }

  return bounded;
}

// ─── Ephemeral TTL-Bounded Session Store ─────────────────────────────────────

export async function getPatternSession(
  sessionId: string,
): Promise<PatternSessionState | null> {
  if (!sessionId) return null;

  const entry = memorySessions.get(sessionId);
  if (entry) {
    if (entry.expiresAt > Date.now()) {
      return entry.state;
    }
    memorySessions.delete(sessionId);
  }

  try {
    const cached = await getCache<PatternSessionState>(
      `pattern_session:${sessionId}`,
    );
    if (cached && cached.sessionId === sessionId) {
      setBoundedSession(sessionId, cached);
      return cached;
    }
  } catch {
    // Non-fatal
  }
  return null;
}

export async function savePatternSession(
  session: PatternSessionState,
): Promise<PatternSessionState> {
  const updated: PatternSessionState = {
    ...session,
    processedAttemptIds: session.processedAttemptIds.slice(-60),
    questionHistory: session.questionHistory.slice(-40),
    updatedAt: new Date().toISOString(),
  };
  setBoundedSession(updated.sessionId, updated);
  await setCache(
    `pattern_session:${updated.sessionId}`,
    updated,
    SESSION_TTL_SECONDS,
  ).catch(() => {});
  return updated;
}

export async function deletePatternSession(sessionId: string): Promise<void> {
  memorySessions.delete(sessionId);
}

/**
 * Strips server-committed grading rubrics before sending a question card to
 * the browser (LearnHarness Commitment Rule / anti-leakage).
 */
export function stripRubricFromCard(
  card: PatternQuestionCard | null,
): PatternQuestionCard | null {
  if (!card) return null;
  const { rubric: _rubric, ...publicCard } = card;
  return publicCard;
}
