import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { auth, googleAuthProvider } from "@/lib/firebase";
import { 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  onAuthStateChanged, 
  signOut as firebaseSignOut, 
  User as FirebaseUser 
} from "firebase/auth";
import { getOrCreateUserProfile, updateUserProfile, UserProfileData } from "@/lib/firestore-service";

export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  leetcode_username?: string | null;
  leetcode_stats?: any;
  githubToken?: string | null;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isConfigured: boolean;
  token: string | null;
  signInWithGoogle: (redirectTo?: string) => Promise<void>;
  signInWithGuest: () => Promise<void>;
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

  const fetchProfile = useCallback(async (firebaseUser: FirebaseUser, tokenStr?: string) => {
    try {
      // 1. Primary: Direct Firestore client profile load
      const firestoreDoc = await getOrCreateUserProfile(
        firebaseUser.uid,
        firebaseUser.email,
        firebaseUser.photoURL,
      );

      const cleanDisplayName: string =
        firestoreDoc.displayName ||
        (firebaseUser.email ? firebaseUser.email.split("@")[0] : null) ||
        "Explorer";

      setProfile({
        id: firebaseUser.uid,
        display_name: cleanDisplayName,
        avatar_url: firestoreDoc.avatarUrl || firebaseUser.photoURL || null,
        created_at: firestoreDoc.createdAt || new Date().toISOString(),
        leetcode_username: firestoreDoc.leetcodeUsername || null,
        leetcode_stats: firestoreDoc.leetcodeStats || null,
        githubToken: firestoreDoc.githubToken || null,
      });
    } catch (firestoreErr) {
      console.warn("Direct Firestore profile fetch fallback to API:", firestoreErr);
      // 2. Fallback: Server API endpoint
      if (tokenStr) {
        try {
          const res = await fetch("/api/profile", {
            headers: { Authorization: `Bearer ${tokenStr}` },
          });
          if (res.ok) {
            const data = await res.json();
            const cleanDisplayName =
              data.displayName || (data.email ? data.email.split("@")[0] : "Explorer");
            setProfile({
              id: data.uid || data.id || firebaseUser.uid,
              display_name: cleanDisplayName,
              avatar_url: data.avatarUrl || data.photoURL || firebaseUser.photoURL,
              created_at: data.createdAt || new Date().toISOString(),
              leetcode_username: data.leetcodeUsername || null,
              leetcode_stats: data.leetcodeStats || null,
              githubToken: data.githubToken || null,
            });
          }
        } catch (apiErr) {
          console.error("Error fetching profile from API", apiErr);
        }
      }
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (auth.currentUser) {
      const t = await auth.currentUser.getIdToken();
      setToken(t);
      await fetchProfile(auth.currentUser, t);
    }
  }, [fetchProfile]);

  const updateNickname = useCallback(
    async (newDisplayName: string) => {
      if (!auth.currentUser) return;
      const clean = newDisplayName.trim().replace(/^@+/, "");
      await updateUserProfile(auth.currentUser.uid, { displayName: clean });
      setProfile((prev) => (prev ? { ...prev, display_name: clean } : null));
    },
    [],
  );

  useEffect(() => {
    let isActive = true;

    // Check if user just returned from a redirect sign-in
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user && isActive) {
          const t = await result.user.getIdToken();
          setToken(t);
          await fetchProfile(result.user, t);
        }
      })
      .catch((err) => {
        console.warn("[Auth] getRedirectResult check:", err);
      });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isActive) return;
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const t = await firebaseUser.getIdToken();
          setToken(t);
          await fetchProfile(firebaseUser, t);
        } catch (e) {
          console.error("Auth state token error:", e);
        }
      } else {
        setToken(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [fetchProfile]);

  const signInWithGoogle = useCallback(async (redirectTo?: string) => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err: any) {
      console.error("[Auth] Google Sign-In Popup Error:", err);
      // If popup is blocked on mobile devices or third-party cookies disabled, fallback to redirect
      if (
        err?.code === "auth/popup-blocked" ||
        err?.code === "auth/cancelled-popup-request" ||
        err?.code === "auth/popup-closed-by-user"
      ) {
        try {
          await signInWithRedirect(auth, googleAuthProvider);
          return;
        } catch (redirectErr) {
          console.error("[Auth] Redirect fallback error:", redirectErr);
          setLoading(false);
          throw redirectErr;
        }
      }
      setLoading(false);
      throw err;
    }
  }, []);

  const signInWithGuest = useCallback(async () => {
    setLoading(true);
    alert("Guest sign-in is not supported. Please sign in with Google.");
    setLoading(false);
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
    } finally {
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
    signInWithGuest,
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
