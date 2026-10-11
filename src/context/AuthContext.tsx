import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { auth, googleAuthProvider } from "@/lib/firebase";
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  User as FirebaseUser,
} from "firebase/auth";
import { getOrCreateUserProfile, updateUserProfile } from "@/lib/firestore-service";

export interface UserProfile {
  id: string;
  display_name: string | null;
  displayName?: string | null;
  avatar_url: string | null;
  avatarUrl?: string | null;
  created_at: string;
  createdAt?: string;
  leetcode_username?: string | null;
  leetcodeUsername?: string | null;
  leetcode_stats?: any;
  leetcodeStats?: any;
  githubToken?: string | null;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isConfigured: boolean;
  token: string | null;
  signInWithGoogle: (redirectTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateNickname: (newDisplayName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const buildFallbackProfileFromFirebaseUser = useCallback((firebaseUser: FirebaseUser): UserProfile => {
    const savedName =
      typeof window !== "undefined"
        ? localStorage.getItem(`dsa_viz_display_name_${firebaseUser.uid}`) ||
          localStorage.getItem("dsa_viz_display_name")
        : null;
    const cleanDisplayName =
      savedName ||
      firebaseUser.displayName ||
      (firebaseUser.email ? firebaseUser.email.split("@")[0] : null) ||
      "Authenticated User";
    const now = new Date().toISOString();
    return {
      id: firebaseUser.uid,
      display_name: cleanDisplayName,
      displayName: cleanDisplayName,
      avatar_url: firebaseUser.photoURL || null,
      avatarUrl: firebaseUser.photoURL || null,
      created_at: now,
      createdAt: now,
      leetcode_username: null,
      leetcodeUsername: null,
      leetcode_stats: null,
      leetcodeStats: null,
      githubToken: null,
    };
  }, []);

  const fetchProfile = useCallback(
    async (firebaseUser: FirebaseUser, tokenStr?: string) => {
      try {
        const firestoreDoc = await getOrCreateUserProfile(
          firebaseUser.uid,
          firebaseUser.email,
          firebaseUser.photoURL,
        );

        const cleanDisplayName: string =
          firestoreDoc.displayName ||
          firestoreDoc.display_name ||
          (typeof window !== "undefined" &&
            (localStorage.getItem(`dsa_viz_display_name_${firebaseUser.uid}`) ||
              localStorage.getItem("dsa_viz_display_name"))) ||
          firebaseUser.displayName ||
          (firebaseUser.email ? firebaseUser.email.split("@")[0] : null) ||
          "Authenticated User";

        setProfile({
          id: firebaseUser.uid,
          display_name: cleanDisplayName,
          displayName: cleanDisplayName,
          avatar_url:
            firestoreDoc.avatarUrl || firestoreDoc.avatar_url || firebaseUser.photoURL || null,
          avatarUrl:
            firestoreDoc.avatarUrl || firestoreDoc.avatar_url || firebaseUser.photoURL || null,
          created_at: firestoreDoc.createdAt || new Date().toISOString(),
          createdAt: firestoreDoc.createdAt || new Date().toISOString(),
          leetcode_username:
            firestoreDoc.leetcodeUsername || firestoreDoc.leetcode_username || null,
          leetcodeUsername:
            firestoreDoc.leetcodeUsername || firestoreDoc.leetcode_username || null,
          leetcode_stats: firestoreDoc.leetcodeStats || firestoreDoc.leetcode_stats || null,
          leetcodeStats: firestoreDoc.leetcodeStats || firestoreDoc.leetcode_stats || null,
          githubToken: firestoreDoc.githubToken || null,
        });
      } catch {
        if (tokenStr) {
          try {
            const res = await fetch("/api/profile", {
              headers: { Authorization: `Bearer ${tokenStr}` },
            });
            if (res.ok) {
              const data = await res.json();
              const cleanDisplayName =
                data.displayName ||
                data.display_name ||
                firebaseUser.displayName ||
                (data.email ? data.email.split("@")[0] : null) ||
                (firebaseUser.email ? firebaseUser.email.split("@")[0] : "Authenticated User");
              setProfile({
                id: data.uid || data.id || firebaseUser.uid,
                display_name: cleanDisplayName,
                displayName: cleanDisplayName,
                avatar_url:
                  data.avatarUrl ||
                  data.avatar_url ||
                  data.photoURL ||
                  firebaseUser.photoURL ||
                  null,
                avatarUrl:
                  data.avatarUrl ||
                  data.avatar_url ||
                  data.photoURL ||
                  firebaseUser.photoURL ||
                  null,
                created_at: data.createdAt || new Date().toISOString(),
                createdAt: data.createdAt || new Date().toISOString(),
                leetcode_username: data.leetcodeUsername || data.leetcode_username || null,
                leetcodeUsername: data.leetcodeUsername || data.leetcode_username || null,
                leetcode_stats: data.leetcodeStats || data.leetcode_stats || null,
                leetcodeStats: data.leetcodeStats || data.leetcode_stats || null,
                githubToken: data.githubToken || null,
              });
              return;
            }
          } catch {
            // Fall through to Firebase user profile
          }
        }
        setProfile(buildFallbackProfileFromFirebaseUser(firebaseUser));
      }
    },
    [buildFallbackProfileFromFirebaseUser],
  );

  const refreshProfile = useCallback(async () => {
    if (auth.currentUser) {
      const t = await auth.currentUser.getIdToken();
      setToken(t);
      await fetchProfile(auth.currentUser, t);
    } else {
      setUser(null);
      setToken(null);
      setProfile(null);
    }
  }, [fetchProfile]);

  const updateNickname = useCallback(async (newDisplayName: string) => {
    if (!auth.currentUser) {
      throw new Error("Must be signed in with Google to update nickname.");
    }
    const clean = newDisplayName.trim().replace(/^@+/, "");
    if (typeof window !== "undefined") {
      localStorage.setItem(`dsa_viz_display_name_${auth.currentUser.uid}`, clean);
      localStorage.setItem("dsa_viz_display_name", clean);
    }
    try {
      await updateUserProfile(auth.currentUser.uid, {
        displayName: clean,
        display_name: clean,
      } as any);
    } catch {
      // Handled by caller or API fallback
    }
    setProfile((prev) =>
      prev
        ? { ...prev, display_name: clean, displayName: clean }
        : {
            id: auth.currentUser!.uid,
            display_name: clean,
            displayName: clean,
            avatar_url: auth.currentUser!.photoURL || null,
            avatarUrl: auth.currentUser!.photoURL || null,
            created_at: new Date().toISOString(),
          },
    );
  }, []);

  useEffect(() => {
    let isActive = true;

    try {
      getRedirectResult(auth)
        .then(async (result) => {
          if (result?.user && isActive) {
            const t = await result.user.getIdToken();
            setUser(result.user);
            setToken(t);
            await fetchProfile(result.user, t);
          }
        })
        .catch(() => {
          // Ignore redirect check error when no redirect sign-in was initiated
        });

      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!isActive) return;
        if (firebaseUser && !firebaseUser.isAnonymous) {
          setUser(firebaseUser);
          try {
            const t = await firebaseUser.getIdToken();
            setToken(t);
            await fetchProfile(firebaseUser, t);
          } catch {
            setToken(null);
            setProfile(buildFallbackProfileFromFirebaseUser(firebaseUser));
          }
        } else {
          setUser(null);
          setToken(null);
          setProfile(null);
        }
        setLoading(false);
      });

      return () => {
        isActive = false;
        unsubscribe();
      };
    } catch {
      setUser(null);
      setToken(null);
      setProfile(null);
      setLoading(false);
      return () => {
        isActive = false;
      };
    }
  }, [fetchProfile, buildFallbackProfileFromFirebaseUser]);

  const signInWithGoogle = useCallback(async (_redirectTo?: string) => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      if (result.user) {
        const t = await result.user.getIdToken();
        setUser(result.user);
        setToken(t);
        await fetchProfile(result.user, t);
      }
    } catch (err: any) {
      if (err?.code === "auth/popup-blocked") {
        await signInWithRedirect(auth, googleAuthProvider);
        return;
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
    } finally {
      setUser(null);
      setProfile(null);
      setToken(null);
      setLoading(false);
    }
  }, []);

  const value: AuthContextType = {
    user,
    profile,
    loading,
    isConfigured: true,
    token,
    signInWithGoogle,
    signOut,
    refreshProfile,
    updateNickname,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
