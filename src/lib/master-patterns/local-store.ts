import type {
  MasteryScorecard,
  PatternCodeLanguage,
  PatternId,
  PatternQuestionCard,
  PatternSessionState,
  StructuredPatternNotes,
  SubmissionEvaluation,
} from "./types";

export interface LocalTranscriptEntry {
  id: string;
  timestamp: string;
  strandId: string;
  question: PatternQuestionCard;
  submittedAnswer: {
    selectedOptions?: string[];
    choseIdk?: boolean;
    verbalAnswer?: string;
    code?: string;
    language?: PatternCodeLanguage;
    claimedTimeComplexity?: string;
    claimedSpaceComplexity?: string;
  };
  evaluation: SubmissionEvaluation;
}

export interface LocalPatternSessionArchive {
  sessionId: string;
  userId: string;
  patternId: PatternId;
  session: PatternSessionState;
  notes: StructuredPatternNotes | null;
  transcript: LocalTranscriptEntry[];
  codeDrafts: Record<string, string>;
  verbalDrafts: Record<string, string>;
  sideDrafts?: Record<string, string>;
  scorecard: MasteryScorecard | null;
  updatedAt: string;
}

const DB_NAME = "dsaviz_master_patterns_v1";
const DB_VERSION = 1;
const STORE_SESSIONS = "sessions";
const LS_FALLBACK_PREFIX = "dsaviz:mp:session:";
const LS_ACTIVE_BY_PATTERN_PREFIX = "dsaviz:mp:active:";

function hasIndexedDb(): boolean {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        const store = db.createObjectStore(STORE_SESSIONS, {
          keyPath: "sessionId",
        });
        store.createIndex("byUserPattern", ["userId", "patternId"], {
          unique: false,
        });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function activePatternKey(userId: string, patternId: PatternId): string {
  return `${LS_ACTIVE_BY_PATTERN_PREFIX}${userId}:${patternId}`;
}

export async function saveLocalPatternArchive(
  archive: LocalPatternSessionArchive,
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      activePatternKey(archive.userId, archive.patternId),
      archive.sessionId,
    );
  } catch {
    // Ignore quota errors on pointer key
  }

  if (!hasIndexedDb()) {
    try {
      window.localStorage.setItem(
        `${LS_FALLBACK_PREFIX}${archive.sessionId}`,
        JSON.stringify(archive),
      );
    } catch {
      // Ignore
    }
    return;
  }

  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_SESSIONS, "readwrite");
      tx.objectStore(STORE_SESSIONS).put(archive);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Fallback to localStorage if IndexedDB fails (e.g., private mode)
    try {
      window.localStorage.setItem(
        `${LS_FALLBACK_PREFIX}${archive.sessionId}`,
        JSON.stringify(archive),
      );
    } catch {
      // Ignore
    }
  }
}

export async function getLocalPatternArchive(
  sessionId: string,
): Promise<LocalPatternSessionArchive | null> {
  if (typeof window === "undefined" || !sessionId) return null;

  if (hasIndexedDb()) {
    try {
      const db = await openDb();
      const item = await new Promise<LocalPatternSessionArchive | null>(
        (resolve, reject) => {
          const tx = db.transaction(STORE_SESSIONS, "readonly");
          const req = tx.objectStore(STORE_SESSIONS).get(sessionId);
          req.onsuccess = () =>
            resolve((req.result as LocalPatternSessionArchive) ?? null);
          req.onerror = () => reject(req.error);
        },
      );
      db.close();
      if (item) return item;
    } catch {
      // Fall through to localStorage
    }
  }

  try {
    const raw = window.localStorage.getItem(`${LS_FALLBACK_PREFIX}${sessionId}`);
    return raw ? (JSON.parse(raw) as LocalPatternSessionArchive) : null;
  } catch {
    return null;
  }
}

export async function getActiveLocalArchiveForPattern(
  userId: string,
  patternId: PatternId,
): Promise<LocalPatternSessionArchive | null> {
  if (typeof window === "undefined") return null;
  try {
    const sid = window.localStorage.getItem(activePatternKey(userId, patternId));
    if (!sid) return null;
    const archive = await getLocalPatternArchive(sid);
    if (!archive || archive.userId !== userId) return null;
    return archive;
  } catch {
    return null;
  }
}

export async function clearActiveLocalArchiveForPattern(
  userId: string,
  patternId: PatternId,
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(activePatternKey(userId, patternId));
  } catch {
    // Ignore
  }
}
