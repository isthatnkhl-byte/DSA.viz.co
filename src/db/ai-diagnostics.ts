import { adminDb } from '../lib/firebase-admin';

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

const memoryReportsStore = new Map<string, AiReportData[]>();
const memoryChatSessionsStore = new Map<string, ChatSessionData[]>();
const memoryActivityStore = new Map<string, UserActivityLog[]>();

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
  memoryReportsStore.set(userId, [newReport, ...existing].slice(0, 50));

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
    return newReport;
  }
}

/**
 * Gets all saved AI reports for a user
 */
export async function getUserAiReports(userId: string): Promise<AiReportData[]> {
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
      memoryReportsStore.set(userId, docs);
      return docs;
    }
  } catch {
    // Fall back to in-memory store
  }
  return memoryReportsStore.get(userId) || [];
}

/**
 * Saves or updates a multi-turn chat session in Firestore
 */
export async function saveChatSession(userId: string, session: { id?: string; title?: string; problemSlug?: string | null; role?: string; messages: any[] }): Promise<ChatSessionData> {
  const now = new Date().toISOString();
  const localId = session.id || `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const localRecord: ChatSessionData = {
    id: localId,
    userId,
    title: session.title || "DSA Socratic Chat",
    problemSlug: session.problemSlug || null,
    role: session.role || "interviewer",
    messages: session.messages || [],
    createdAt: now,
    updatedAt: now,
  };

  const existing = memoryChatSessionsStore.get(userId) || [];
  const filtered = existing.filter(s => s.id !== localId);
  memoryChatSessionsStore.set(userId, [localRecord, ...filtered].slice(0, 30));

  try {
    const col = adminDb.collection('users').doc(userId).collection('chat_sessions');
    if (session.id) {
      const docRef = col.doc(session.id);
      const updateData = {
        title: session.title || "DSA Socratic Chat",
        problemSlug: session.problemSlug || null,
        role: session.role || "interviewer",
        messages: session.messages || [],
        updatedAt: now,
      };
      await docRef.set(updateData, { merge: true });
      return {
        id: session.id,
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
    return localRecord;
  }
}

/**
 * Gets recent chat sessions for a user
 */
export async function getUserChatSessions(userId: string): Promise<ChatSessionData[]> {
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
      memoryChatSessionsStore.set(userId, docs);
      return docs;
    }
  } catch {
    // Fall back to in-memory store
  }
  return memoryChatSessionsStore.get(userId) || [];
}

/**
 * Logs an activity event to Firestore
 */
export async function logUserActivity(userId: string, activity: { type: string; problemSlug?: string | null; metadata?: any }): Promise<UserActivityLog> {
  const newActivity: UserActivityLog = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId,
    type: activity.type,
    problemSlug: activity.problemSlug || null,
    metadata: activity.metadata || {},
    createdAt: new Date().toISOString(),
  };

  const existing = memoryActivityStore.get(userId) || [];
  memoryActivityStore.set(userId, [newActivity, ...existing].slice(0, 100));

  try {
    const { id: _localId, ...payload } = newActivity;
    const docRef = await adminDb
      .collection('users')
      .doc(userId)
      .collection('activity')
      .add(payload);

    return {
      ...newActivity,
      id: docRef.id,
    };
  } catch {
    return newActivity;
  }
}

/**
 * Gets recent user activities
 */
export async function getUserActivities(userId: string, limitCount: number = 50): Promise<UserActivityLog[]> {
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
      memoryActivityStore.set(userId, docs);
      return docs;
    }
  } catch {
    // Fall back to in-memory store
  }
  return (memoryActivityStore.get(userId) || []).slice(0, limitCount);
}
