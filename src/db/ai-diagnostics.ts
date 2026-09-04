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

/**
 * Saves a new AI Diagnostic Report to Firestore for the user
 */
export async function saveAiReport(userId: string, data: { title: string; totalSubmissions: number; reportData: any }): Promise<AiReportData> {
  const newReport = {
    userId,
    title: data.title || "AI Algorithmic Diagnostics Report",
    totalSubmissions: data.totalSubmissions || 0,
    reportData: data.reportData,
    createdAt: new Date().toISOString(),
  };

  const docRef = await adminDb
    .collection('users')
    .doc(userId)
    .collection('ai_reports')
    .add(newReport);

  return {
    ...newReport,
    id: docRef.id,
  };
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

    return snap.docs.map((doc: any) => ({
      id: doc.id,
      ...(doc.data() as any),
    }));
  } catch (error) {
    console.warn("Error fetching user AI reports from Firestore:", error);
    return [];
  }
}

/**
 * Saves or updates a multi-turn chat session in Firestore
 */
export async function saveChatSession(userId: string, session: { id?: string; title?: string; problemSlug?: string | null; role?: string; messages: any[] }): Promise<ChatSessionData> {
  const col = adminDb.collection('users').doc(userId).collection('chat_sessions');
  const now = new Date().toISOString();

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
    const newSession = {
      userId,
      title: session.title || "DSA Socratic Chat",
      problemSlug: session.problemSlug || null,
      role: session.role || "interviewer",
      messages: session.messages || [],
      createdAt: now,
      updatedAt: now,
    };
    const docRef = await col.add(newSession);
    return {
      ...newSession,
      id: docRef.id,
    };
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

    return snap.docs.map((doc: any) => ({
      id: doc.id,
      ...(doc.data() as any),
    }));
  } catch (error) {
    console.warn("Error fetching user chat sessions:", error);
    return [];
  }
}

/**
 * Logs an activity event to Firestore
 */
export async function logUserActivity(userId: string, activity: { type: string; problemSlug?: string | null; metadata?: any }): Promise<UserActivityLog> {
  const newActivity = {
    userId,
    type: activity.type,
    problemSlug: activity.problemSlug || null,
    metadata: activity.metadata || {},
    createdAt: new Date().toISOString(),
  };

  const docRef = await adminDb
    .collection('users')
    .doc(userId)
    .collection('activity')
    .add(newActivity);

  return {
    ...newActivity,
    id: docRef.id,
  };
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

    return snap.docs.map((doc: any) => ({
      id: doc.id,
      ...(doc.data() as any),
    }));
  } catch (error) {
    console.warn("Error fetching user activities:", error);
    return [];
  }
}
