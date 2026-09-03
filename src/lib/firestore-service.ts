import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface UserProfileData {
  id: string;
  email?: string | null;
  displayName?: string | null;
  display_name?: string | null;
  avatarUrl?: string | null;
  avatar_url?: string | null;
  createdAt?: string;
  leetcodeUsername?: string | null;
  leetcode_username?: string | null;
  leetcodeStats?: any;
  leetcode_stats?: any;
  githubToken?: string | null;
}

/**
 * Retrieves the user profile document from Firestore.
 * If it doesn't exist, creates an initial default profile.
 */
export async function getOrCreateUserProfile(
  userId: string,
  email?: string | null,
  photoURL?: string | null,
): Promise<UserProfileData> {
  const path = `users/${userId}`;
  try {
    const userDocRef = doc(db, "users", userId);
    const snap = await getDoc(userDocRef);

    const defaultUsername = email ? email.split("@")[0] : `user_${userId.slice(0, 6)}`;

    if (snap.exists()) {
      const data = snap.data() as any;
      const effectiveDisplayName = data.displayName || data.display_name || defaultUsername;
      const effectiveAvatar = data.avatarUrl || data.avatar_url || photoURL || null;
      const effectiveLcUsername = data.leetcodeUsername || data.leetcode_username || null;
      const effectiveLcStats = data.leetcodeStats || data.leetcode_stats || null;

      return {
        id: userId,
        email: data.email || email || null,
        displayName: effectiveDisplayName,
        display_name: effectiveDisplayName,
        avatarUrl: effectiveAvatar,
        avatar_url: effectiveAvatar,
        createdAt: data.createdAt || new Date().toISOString(),
        leetcodeUsername: effectiveLcUsername,
        leetcode_username: effectiveLcUsername,
        leetcodeStats: effectiveLcStats,
        leetcode_stats: effectiveLcStats,
        githubToken: data.githubToken || null,
      };
    }

    const newProfile: UserProfileData = {
      id: userId,
      email: email || null,
      displayName: defaultUsername,
      avatarUrl: photoURL || null,
      createdAt: new Date().toISOString(),
      leetcodeUsername: null,
      leetcodeStats: null,
      githubToken: null,
    };

    await setDoc(userDocRef, {
      ...newProfile,
      createdAt: new Date().toISOString(),
    });

    return newProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    throw error;
  }
}

/**
 * Updates specific fields in the user's profile document.
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfileData>,
): Promise<UserProfileData> {
  const path = `users/${userId}`;
  try {
    const userDocRef = doc(db, "users", userId);
    await setDoc(userDocRef, updates, { merge: true });
    return await getOrCreateUserProfile(userId);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

/**
 * Retrieves all submissions for a user from their subcollection.
 */
export async function getUserSubmissions(userId: string): Promise<any[]> {
  const path = `users/${userId}/submissions`;
  try {
    const subsRef = collection(db, "users", userId, "submissions");
    const q = query(subsRef, orderBy("createdAt", "desc"), limit(200));
    const snap = await getDocs(q);

    return snap.docs.map((d) => {
      const r = d.data();
      return {
        id: d.id,
        userId,
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
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Saves a new algorithmic pseudocode / code submission to the user's subcollection.
 */
export async function saveUserSubmission(userId: string, data: any): Promise<any> {
  const path = `users/${userId}/submissions`;
  try {
    const code = data.code || data.pseudocode || "";
    const pseudocode = data.pseudocode || data.code || "";
    const lang = data.lang || "pseudocode";
    const classification = data.classification || "Incomplete";
    const difficulty = data.difficulty || "Medium";
    const timeComplexity = data.timeComplexity || data.time_complexity || null;
    const spaceComplexity = data.spaceComplexity || data.space_complexity || null;
    const timeTakenMs = data.timeTakenMs || data.time_taken_ms || null;

    const newSub = {
      slug: data.slug,
      title: data.title || null,
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
      createdAt: new Date().toISOString(),
    };

    const subsRef = collection(db, "users", userId, "submissions");
    const docRef = await addDoc(subsRef, newSub);

    return {
      ...newSub,
      id: docRef.id,
      userId,
      title: newSub.title || newSub.slug,
      pseudocode: newSub.pseudocode,
      time_complexity: newSub.timeComplexity,
      space_complexity: newSub.spaceComplexity,
      viz_steps: newSub.vizSteps,
      test_case: newSub.testCase,
      code_lines: newSub.codeLines,
      created_at: newSub.createdAt,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

/**
 * Deletes a submission from the user's subcollection.
 */
export async function deleteUserSubmission(userId: string, submissionId: string): Promise<boolean> {
  const path = `users/${userId}/submissions/${submissionId}`;
  try {
    const docRef = doc(db, "users", userId, "submissions", submissionId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    return false;
  }
}

/**
 * Retrieves AI-generated diagnostic reports for the user.
 */
export async function getUserAiReports(userId: string): Promise<any[]> {
  const path = `users/${userId}/ai_reports`;
  try {
    const reportsRef = collection(db, "users", userId, "ai_reports");
    const q = query(reportsRef, orderBy("createdAt", "desc"), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
  } catch (error) {
    console.warn("Could not retrieve AI reports from Firestore:", error);
    return [];
  }
}

/**
 * Saves a new AI-generated diagnostic report to Firestore.
 */
export async function saveUserAiReport(userId: string, reportData: any): Promise<any> {
  const path = `users/${userId}/ai_reports`;
  try {
    const reportsRef = collection(db, "users", userId, "ai_reports");
    const docData = {
      ...reportData,
      createdAt: reportData.createdAt || new Date().toISOString(),
    };
    const docRef = await addDoc(reportsRef, docData);
    return {
      id: docRef.id,
      ...docData,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

/**
 * Retrieves chat sessions for the user.
 */
export async function getUserChatSessions(userId: string): Promise<any[]> {
  const path = `users/${userId}/chat_sessions`;
  try {
    const chatRef = collection(db, "users", userId, "chat_sessions");
    const q = query(chatRef, orderBy("updatedAt", "desc"), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
  } catch (error) {
    console.warn("Could not retrieve chat sessions from Firestore:", error);
    return [];
  }
}

/**
 * Saves or updates a multi-turn chat session in Firestore.
 */
export async function saveUserChatSession(userId: string, sessionData: any): Promise<any> {
  const path = `users/${userId}/chat_sessions`;
  try {
    const now = new Date().toISOString();
    if (sessionData.id) {
      const docRef = doc(db, "users", userId, "chat_sessions", sessionData.id);
      const updateData = {
        title: sessionData.title || "DSA Conversation",
        problemSlug: sessionData.problemSlug || null,
        role: sessionData.role || "interviewer",
        messages: sessionData.messages || [],
        updatedAt: now,
      };
      await setDoc(docRef, updateData, { merge: true });
      return { id: sessionData.id, ...updateData };
    } else {
      const chatRef = collection(db, "users", userId, "chat_sessions");
      const newDoc = {
        title: sessionData.title || "DSA Conversation",
        problemSlug: sessionData.problemSlug || null,
        role: sessionData.role || "interviewer",
        messages: sessionData.messages || [],
        createdAt: now,
        updatedAt: now,
      };
      const docRef = await addDoc(chatRef, newDoc);
      return { id: docRef.id, ...newDoc };
    }
  } catch (error) {
    console.warn("Could not save chat session to Firestore:", error);
    return sessionData;
  }
}

/**
 * Logs user activity to Firestore.
 */
export async function logUserActivity(userId: string, activity: { type: string; problemSlug?: string | null; metadata?: any }): Promise<void> {
  try {
    const actRef = collection(db, "users", userId, "activity");
    await addDoc(actRef, {
      ...activity,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn("Failed to log activity:", error);
  }
}

