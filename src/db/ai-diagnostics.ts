import { adminDb, isAdminDbAvailable, markAdminDbUnavailable } from '../lib/firebase-admin';
import { enqueueWriteBehind } from '../lib/write-behind-buffer.server';

export interface AiReportData {
  id?: string;
  userId: string;
  title: string;
  totalSubmissions: number;
  reportData: any;
  createdAt: string;
}

export interface ChatSessionData {
  id?: string;
  userId: string;
  title: string;
  problemSlug?: string | null;
  role?: string;
  messages: Array<{
    role: string;
    content: string;
    timestamp?: string;
    stepContext?: any;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface UserActivityLog {
  id?: string;
  userId: string;
  type: string;
  problemSlug?: string | null;
  metadata?: any;
  createdAt: string;
}

const MAX_DIAGNOSTIC_USERS_IN_MEMORY = 2000;
const memoryReportsStore = new Map<string, AiReportData[]>();
const memoryChatSessionsStore = new Map<string, ChatSessionData[]>();
const memoryActivityStore = new Map<string, UserActivityLog[]>();

function setBoundedMapEntry<T>(map: Map<string, T>, key: string, val: T) {
  if (!map.has(key) && map.size >= MAX_DIAGNOSTIC_USERS_IN_MEMORY) {
    const oldest = map.keys().next().value;
    if (oldest) map.delete(oldest);
  }
  map.set(key, val);
}

/**
 * Saves a new AI Diagnostic Report to Firestore for the user
 */
export async function saveAiReport(userId: string, data: { title: string; totalSubmissions: number; reportData: any }): Promise<AiReportData> {
  const newReport: AiReportData = {
    id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId,
    title: data.title || "AI Algorithmic Diagnostics Report",
    totalSubmissions: data.totalSubmissions || 0,
    reportData: data.reportData,
    createdAt: new Date().toISOString(),
  };

  const existing = memoryReportsStore.get(userId) || [];
  setBoundedMapEntry(memoryReportsStore, userId, [newReport, ...existing].slice(0, 50));

  if (isAdminDbAvailable()) {
    try {
      const { id: _localId, ...payload } = newReport;
      const docRef = await adminDb
        .collection('users')
        .doc(userId)
        .collection('ai_reports')
        .add(payload);

      return {
        ...newReport,
        id: docRef.id,
      };
    } catch {
      markAdminDbUnavailable();
    }
  }
  return newReport;
}

/**
 * Gets all saved AI reports for a user
 */
export async function getUserAiReports(userId: string): Promise<AiReportData[]> {
  if (isAdminDbAvailable()) {
    try {
      const snap = await adminDb
        .collection('users')
        .doc(userId)
        .collection('ai_reports')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

      const docs = snap.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any),
      }));
      if (docs.length > 0) {
        setBoundedMapEntry(memoryReportsStore, userId, docs);
        return docs;
      }
    } catch {
      markAdminDbUnavailable();
    }
  }
  return memoryReportsStore.get(userId) || [];
}

/**
 * Saves or updates a multi-turn chat session in Firestore
 */
export async function saveChatSession(userId: string, session: { id?: string; title?: string; problemSlug?: string | null; role?: string; messages: any[] }): Promise<ChatSessionData> {
  const now = new Date().toISOString();
  const localId = session.id ? String(session.id).slice(0, 128) : `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const boundedMessages = Array.isArray(session.messages)
    ? session.messages.slice(-100).map((m: any) => ({
        role: String(m?.role || "user").slice(0, 20),
        content: String(m?.content || "").slice(0, 20000),
        ...(m?.timestamp ? { timestamp: String(m.timestamp).slice(0, 64) } : {}),
        ...(m?.stepContext ? { stepContext: m.stepContext } : {}),
      }))
    : [];
  const localRecord: ChatSessionData = {
    id: localId,
    userId,
    title: String(session.title || "DSA Socratic Chat").slice(0, 200),
    problemSlug: session.problemSlug ? String(session.problemSlug).slice(0, 255) : null,
    role: String(session.role || "interviewer").slice(0, 40),
    messages: boundedMessages,
    createdAt: now,
    updatedAt: now,
  };

  const existing = memoryChatSessionsStore.get(userId) || [];
  const filtered = existing.filter(s => s.id !== localId);
  setBoundedMapEntry(memoryChatSessionsStore, userId, [localRecord, ...filtered].slice(0, 30));

  if (isAdminDbAvailable()) {
    try {
      const col = adminDb.collection('users').doc(userId).collection('chat_sessions');
      if (session.id) {
        const docRef = col.doc(localId);
        const updateData = {
          title: localRecord.title,
          problemSlug: localRecord.problemSlug,
          role: localRecord.role,
          messages: boundedMessages,
          updatedAt: now,
        };
        await docRef.set(updateData, { merge: true });
        return {
          id: localId,
          userId,
          ...updateData,
          createdAt: now,
        };
      } else {
        const { id: _ignoreId, ...newSession } = localRecord;
        const docRef = await col.add(newSession);
        return {
          ...localRecord,
          id: docRef.id,
        };
      }
    } catch {
      markAdminDbUnavailable();
    }
  }
  return localRecord;
}

/**
 * Gets recent chat sessions for a user
 */
export async function getUserChatSessions(userId: string): Promise<ChatSessionData[]> {
  if (isAdminDbAvailable()) {
    try {
      const snap = await adminDb
        .collection('users')
        .doc(userId)
        .collection('chat_sessions')
        .orderBy('updatedAt', 'desc')
        .limit(30)
        .get();

      const docs = snap.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any),
      }));
      if (docs.length > 0) {
        setBoundedMapEntry(memoryChatSessionsStore, userId, docs);
        return docs;
      }
    } catch {
      markAdminDbUnavailable();
    }
  }
  return memoryChatSessionsStore.get(userId) || [];
}

/**
 * Logs an activity event to Firestore
 */
export async function logUserActivity(
  userId: string,
  activityOrType: { type: string; problemSlug?: string | null; metadata?: any } | string,
  descriptionOrMetadata?: any
): Promise<UserActivityLog> {
  const normalizedActivity =
    typeof activityOrType === "string"
      ? {
          type: activityOrType,
          problemSlug: null,
          metadata:
            typeof descriptionOrMetadata === "string"
              ? { description: descriptionOrMetadata }
              : descriptionOrMetadata || {},
        }
      : activityOrType || { type: "unknown" };

  const newActivity: UserActivityLog = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId,
    type: normalizedActivity.type,
    problemSlug: normalizedActivity.problemSlug || null,
    metadata: normalizedActivity.metadata || {},
    createdAt: new Date().toISOString(),
  };

  const existing = memoryActivityStore.get(userId) || [];
  setBoundedMapEntry(memoryActivityStore, userId, [newActivity, ...existing].slice(0, 100));

  // Enqueue to write-behind buffer for high-throughput batched commit
  void enqueueWriteBehind({
    type: "activity_log",
    userId,
    payload: {
      type: newActivity.type,
      problemSlug: newActivity.problemSlug,
      metadata: newActivity.metadata,
      createdAt: newActivity.createdAt,
    },
  });

  return newActivity;
}

/**
 * Gets recent user activities
 */
export async function getUserActivities(userId: string, limitCount: number = 50): Promise<UserActivityLog[]> {
  if (isAdminDbAvailable()) {
    try {
      const snap = await adminDb
        .collection('users')
        .doc(userId)
        .collection('activity')
        .orderBy('createdAt', 'desc')
        .limit(limitCount)
        .get();

      const docs = snap.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any),
      }));
      if (docs.length > 0) {
        setBoundedMapEntry(memoryActivityStore, userId, docs);
        return docs;
      }
    } catch {
      markAdminDbUnavailable();
    }
  }
  return (memoryActivityStore.get(userId) || []).slice(0, limitCount);
}
