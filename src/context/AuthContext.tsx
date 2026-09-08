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
        firestoreDoc.display_name ||
        (typeof window !== "undefined" && localStorage.getItem("dsa_viz_display_name")) ||
        firebaseUser.displayName ||
        (firebaseUser.email ? firebaseUser.email.split("@")[0] : null) ||
        "Explorer";

      setProfile({
        id: firebaseUser.uid,
        display_name: cleanDisplayName,
        displayName: cleanDisplayName,
        avatar_url: firestoreDoc.avatarUrl || firestoreDoc.avatar_url || firebaseUser.photoURL || null,
        avatarUrl: firestoreDoc.avatarUrl || firestoreDoc.avatar_url || firebaseUser.photoURL || null,
        created_at: firestoreDoc.createdAt || new Date().toISOString(),
        createdAt: firestoreDoc.createdAt || new Date().toISOString(),
        leetcode_username: firestoreDoc.leetcodeUsername || firestoreDoc.leetcode_username || null,
        leetcodeUsername: firestoreDoc.leetcodeUsername || firestoreDoc.leetcode_username || null,
        leetcode_stats: firestoreDoc.leetcodeStats || firestoreDoc.leetcode_stats || null,
        leetcodeStats: firestoreDoc.leetcodeStats || firestoreDoc.leetcode_stats || null,
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
              data.displayName || data.display_name || (data.email ? data.email.split("@")[0] : "Explorer");
            setProfile({
              id: data.uid || data.id || firebaseUser.uid,
              display_name: cleanDisplayName,
              displayName: cleanDisplayName,
              avatar_url: data.avatarUrl || data.avatar_url || data.photoURL || firebaseUser.photoURL || null,
              avatarUrl: data.avatarUrl || data.avatar_url || data.photoURL || firebaseUser.photoURL || null,
              created_at: data.createdAt || new Date().toISOString(),
              createdAt: data.createdAt || new Date().toISOString(),
              leetcode_username: data.leetcodeUsername || data.leetcode_username || null,
              leetcodeUsername: data.leetcodeUsername || data.leetcode_username || null,
              leetcode_stats: data.leetcodeStats || data.leetcode_stats || null,
              leetcodeStats: data.leetcodeStats || data.leetcode_stats || null,
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
      const clean = newDisplayName.trim().replace(/^@+/, "");
      if (typeof window !== "undefined") {
        localStorage.setItem("dsa_viz_display_name", clean);
      }
      if (auth.currentUser) {
        try {
          await updateUserProfile(auth.currentUser.uid, {
            displayName: clean,
            display_name: clean,
          } as any);
        } catch (e) {
          console.warn("Direct Firestore update error in updateNickname:", e);
        }
      }
      setProfile((prev) =>
        prev
          ? { ...prev, display_name: clean, displayName: clean }
          : {
              id: auth.currentUser?.uid || "user",
              display_name: clean,
              displayName: clean,
              avatar_url: null,
              avatarUrl: null,
              created_at: new Date().toISOString(),
            },
      );
    },
    [],
  );

  useEffect(() => {
    let isActive = true;

    // Remove legacy guest mode storage if any
    if (typeof window !== "undefined") {
      localStorage.removeItem("dsa_viz_guest_mode");
    }

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
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const t = await firebaseUser.getIdToken();
          setToken(t);
          await fetchProfile(firebaseUser, t);
        } catch (e) {
          console.error("Auth state token error:", e);
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
  }, [fetchProfile]);

  const signInWithGoogle = useCallback(async (redirectTo?: string) => {
    setLoading(true);
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("dsa_viz_guest_mode");
      }
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err: any) {
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
          console.warn("[Auth] Redirect fallback warning:", redirectErr);
          setLoading(false);
          throw redirectErr;
        }
      }

      if (err?.code === "auth/unauthorized-domain" || err?.message?.includes("unauthorized-domain")) {
        console.warn("[Auth] Host domain is not authorized in Firebase Console:", window.location.hostname);
        const customError = new Error(
          `Domain "${window.location.hostname}" is not yet in your Firebase Project's Authorized Domains list.`
        );
        (customError as any).code = "auth/unauthorized-domain";
        (customError as any).domain = window.location.hostname;
        setLoading(false);
        throw customError;
      }

      console.warn("[Auth] Google Sign-In warning:", err);
      setLoading(false);
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("dsa_viz_guest_mode");
      }
      await firebaseSignOut(auth);
    } catch (e) {
      console.warn("Sign out exception:", e);
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
