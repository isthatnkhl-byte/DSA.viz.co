import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { auth, googleAuthProvider } from "@/lib/firebase";
import { 
  signInWithPopup, 
  signInWithRedirect, 
  signInAnonymously,
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

const createGuestUser = (): FirebaseUser => {
  return {
    uid: "guest-developer",
    email: "guest@dsaviz.local",
    displayName: "Guest Developer",
    photoURL: null,
    emailVerified: true,
    isAnonymous: true,
    metadata: {
      creationTime: new Date().toISOString(),
      lastSignInTime: new Date().toISOString(),
    },
    phoneNumber: null,
    providerData: [],
    providerId: "guest",
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => "mock-guest-token-dev",
    getIdTokenResult: async () => ({
      token: "mock-guest-token-dev",
      authTime: new Date().toISOString(),
      issuedAtTime: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 3600000).toISOString(),
      signInProvider: "anonymous",
      signInSecondFactor: null,
      claims: {},
    }),
    reload: async () => {},
    toJSON: () => ({ uid: "guest-developer", email: "guest@dsaviz.local" }),
  } as unknown as FirebaseUser;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (firebaseUser: FirebaseUser, tokenStr?: string) => {
    if (firebaseUser.uid === "guest-developer") {
      setProfile({
        id: "guest-developer",
        display_name: "Guest Developer",
        avatar_url: null,
        created_at: new Date().toISOString(),
        leetcode_username: null,
        leetcode_stats: null,
        githubToken: null,
      });
      return;
    }

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
    } else if (typeof window !== "undefined" && localStorage.getItem("dsa_viz_guest_mode") === "true") {
      setToken("mock-guest-token-dev");
      setUser(createGuestUser());
      setProfile({
        id: "guest-developer",
        display_name: "Guest Developer",
        avatar_url: null,
        created_at: new Date().toISOString(),
        leetcode_username: null,
        leetcode_stats: null,
        githubToken: null,
      });
    }
  }, [fetchProfile]);

  const updateNickname = useCallback(
    async (newDisplayName: string) => {
      const clean = newDisplayName.trim().replace(/^@+/, "");
      if (auth.currentUser) {
        await updateUserProfile(auth.currentUser.uid, { displayName: clean });
      }
      setProfile((prev) => (prev ? { ...prev, display_name: clean } : null));
    },
    [],
  );

  useEffect(() => {
    let isActive = true;

    // Check if local guest session is active
    const isGuest = typeof window !== "undefined" && localStorage.getItem("dsa_viz_guest_mode") === "true";
    if (isGuest && !auth.currentUser) {
      const guest = createGuestUser();
      setUser(guest);
      setToken("mock-guest-token-dev");
      setProfile({
        id: "guest-developer",
        display_name: "Guest Developer",
        avatar_url: null,
        created_at: new Date().toISOString(),
        leetcode_username: null,
        leetcode_stats: null,
        githubToken: null,
      });
      setLoading(false);
    }

    // Check if user just returned from a redirect sign-in
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user && isActive) {
          if (typeof window !== "undefined") {
            localStorage.removeItem("dsa_viz_guest_mode");
          }
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
        if (typeof window !== "undefined") {
          localStorage.removeItem("dsa_viz_guest_mode");
        }
        setUser(firebaseUser);
        try {
          const t = await firebaseUser.getIdToken();
          setToken(t);
          await fetchProfile(firebaseUser, t);
        } catch (e) {
          console.error("Auth state token error:", e);
        }
      } else {
        const guestActive = typeof window !== "undefined" && localStorage.getItem("dsa_viz_guest_mode") === "true";
        if (!guestActive) {
          setUser(null);
          setToken(null);
          setProfile(null);
        }
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

  const signInWithGuest = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Try Firebase anonymous authentication if enabled
      try {
        const cred = await signInAnonymously(auth);
        if (cred?.user) {
          if (typeof window !== "undefined") {
            localStorage.removeItem("dsa_viz_guest_mode");
          }
          setUser(cred.user);
          const t = await cred.user.getIdToken();
          setToken(t);
          await fetchProfile(cred.user, t);
          setLoading(false);
          return;
        }
      } catch (anonErr) {
        console.warn("[Auth] Anonymous Firebase auth fallback to local session:", anonErr);
      }

      // 2. Direct local guest mode
      if (typeof window !== "undefined") {
        localStorage.setItem("dsa_viz_guest_mode", "true");
      }
      const guest = createGuestUser();
      setUser(guest);
      setToken("mock-guest-token-dev");
      setProfile({
        id: "guest-developer",
        display_name: "Guest Developer",
        avatar_url: null,
        created_at: new Date().toISOString(),
        leetcode_username: null,
        leetcode_stats: null,
        githubToken: null,
      });
    } finally {
      setLoading(false);
    }
  }, [fetchProfile]);

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
