import { getAuth } from "firebase/auth";
import { toast } from "sonner";
import { getOrCreateUserProfile, updateUserProfile } from "@/lib/firestore-service";

const PENDING_PUSH_STORAGE_KEY = "dsa_viz_pending_gh_push";

export interface GithubSyncPayload {
  uid?: string;
  githubConnected: boolean;
  githubToken?: string | null;
  githubUsername?: string | null;
  githubAvatar?: string | null;
  githubUrl?: string | null;
}

export interface PendingGithubPush {
  code: string;
  titleSlug: string;
  lang: string;
  createdAt: number;
}

export async function persistGithubAuthToClient(
  uid: string,
  payload: GithubSyncPayload
): Promise<void> {
  if (!uid || typeof window === "undefined") return;

  const ghToken = payload.githubToken || null;
  const ghUsername = payload.githubUsername || null;
  const ghAvatar = payload.githubAvatar || null;
  const ghUrl =
    payload.githubUrl || (ghUsername ? `https://github.com/${ghUsername}` : null);

  try {
    localStorage.setItem(`dsa_viz_github_connected_${uid}`, "true");
    if (ghToken) {
      localStorage.setItem(`dsa_viz_github_token_${uid}`, ghToken);
    }
    if (ghUsername) {
      localStorage.setItem(`dsa_viz_github_username_${uid}`, ghUsername);
    }
    if (ghAvatar) {
      localStorage.setItem(`dsa_viz_github_avatar_${uid}`, ghAvatar);
    }
  } catch {
    // Ignore storage quota errors
  }

  try {
    await updateUserProfile(uid, {
      githubConnected: true,
      github_connected: true,
      ...(ghToken ? { githubToken: ghToken } : {}),
      ...(ghUsername ? { githubUsername: ghUsername, github_username: ghUsername } : {}),
      ...(ghAvatar ? { githubAvatar: ghAvatar, github_avatar: ghAvatar } : {}),
      ...(ghUrl ? { githubUrl: ghUrl } : {}),
    });
  } catch (err) {
    console.warn("Could not persist GitHub auth payload to client Firestore:", err);
  }
}

function decodeBase64UrlJson(input: string): any | null {
  try {
    const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "===".slice((base64.length + 3) % 4);
    const jsonStr = decodeURIComponent(
      Array.prototype.map
        .call(atob(padded), (c: string) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

/**
 * Checks if the URL hash contains `#gh_sync=...` from `/api/github/callback`,
 * persists the encrypted token + profile metadata into localStorage & Firestore,
 * and cleans up the URL hash.
 */
export async function consumeGithubSyncFromHash(
  fallbackUid?: string | null
): Promise<GithubSyncPayload | null> {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash || "";
  if (!hash.includes("gh_sync=")) return null;

  const match = hash.match(/(?:^|[#&])gh_sync=([^&]+)/);
  if (!match || !match[1]) return null;

  const decoded = decodeBase64UrlJson(decodeURIComponent(match[1]));
  // Clean URL hash immediately
  const cleanUrl = window.location.pathname + window.location.search;
  window.history.replaceState(null, "", cleanUrl);

  if (!decoded || typeof decoded !== "object") return null;

  const auth = getAuth();
  const uid = decoded.uid || fallbackUid || auth.currentUser?.uid;
  const payload: GithubSyncPayload = {
    uid,
    githubConnected: true,
    githubToken: decoded.githubToken || null,
    githubUsername: decoded.githubUsername || null,
    githubAvatar: decoded.githubAvatar || null,
    githubUrl:
      decoded.githubUrl ||
      (decoded.githubUsername ? `https://github.com/${decoded.githubUsername}` : null),
  };

  if (uid) {
    await persistGithubAuthToClient(uid, payload);
  }

  return payload;
}

/**
 * Initiates GitHub OAuth via a popup window so the user does not lose editor state,
 * falling back to full-page redirect if popups are blocked by the browser.
 */
export async function connectGithubWithPopupOrRedirect(options?: {
  returnTo?: string;
  preferRedirect?: boolean;
}): Promise<{
  connected: boolean;
  redirected: boolean;
  payload?: GithubSyncPayload;
}> {
  if (typeof window === "undefined") {
    return { connected: false, redirected: false };
  }

  const auth = getAuth();
  const currentUser = auth.currentUser;
  const idToken = currentUser ? await currentUser.getIdToken().catch(() => null) : null;
  const origin = window.location.origin;
  const returnTo = options?.returnTo || window.location.pathname + window.location.search;

  const res = await fetch(
    `/api/github/url?origin=${encodeURIComponent(origin)}&returnTo=${encodeURIComponent(
      returnTo
    )}`,
    {
      headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
    }
  );
  const d = await res.json().catch(() => ({}));
  if (!res.ok || !d.url) {
    throw new Error(
      d.error || "GitHub authorization is not configured or unavailable on the server."
    );
  }

  if (options?.preferRedirect) {
    window.location.href = d.url;
    return { connected: false, redirected: true };
  }

  const width = 600;
  const height = 720;
  const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
  const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));
  const popup = window.open(
    d.url,
    "dsaviz_github_oauth",
    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
  );

  if (!popup) {
    window.location.href = d.url;
    return { connected: false, redirected: true };
  }

  const uid = currentUser?.uid || "";
  const previousToken = uid ? localStorage.getItem(`dsa_viz_github_token_${uid}`) : null;

  return new Promise((resolve) => {
    let settled = false;

    const finish = async (payload?: GithubSyncPayload) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", onMessage);
      clearInterval(pollTimer);
      if (payload && uid) {
        await persistGithubAuthToClient(uid, payload);
      }
      resolve({
        connected: Boolean(payload?.githubConnected),
        redirected: false,
        payload,
      });
    };

    const onMessage = (event: MessageEvent) => {
      const msgType = event.data?.type;
      if (msgType === "GITHUB_AUTH_SUCCESS" || msgType === "GITHUB_CONNECTED") {
        void finish({
          uid,
          githubConnected: true,
          githubToken: event.data?.githubToken || null,
          githubUsername: event.data?.githubUsername || null,
          githubAvatar: event.data?.githubAvatar || null,
          githubUrl:
            event.data?.githubUrl ||
            (event.data?.githubUsername
              ? `https://github.com/${event.data.githubUsername}`
              : null),
        });
      }
    };

    window.addEventListener("message", onMessage);

    const pollTimer = setInterval(() => {
      try {
        if (uid) {
          const currentStoredToken = localStorage.getItem(`dsa_viz_github_token_${uid}`);
          if (currentStoredToken && currentStoredToken !== previousToken) {
            const ghUsername = localStorage.getItem(`dsa_viz_github_username_${uid}`);
            const ghAvatar = localStorage.getItem(`dsa_viz_github_avatar_${uid}`);
            void finish({
              uid,
              githubConnected: true,
              githubToken: currentStoredToken,
              githubUsername: ghUsername,
              githubAvatar: ghAvatar,
              githubUrl: ghUsername ? `https://github.com/${ghUsername}` : null,
            });
            return;
          }
        }
        if (popup.closed) {
          const finalToken = uid ? localStorage.getItem(`dsa_viz_github_token_${uid}`) : null;
          if (finalToken) {
            const ghUsername = uid ? localStorage.getItem(`dsa_viz_github_username_${uid}`) : null;
            const ghAvatar = uid ? localStorage.getItem(`dsa_viz_github_avatar_${uid}`) : null;
            void finish({
              uid,
              githubConnected: true,
              githubToken: finalToken,
              githubUsername: ghUsername,
              githubAvatar: ghAvatar,
              githubUrl: ghUsername ? `https://github.com/${ghUsername}` : null,
            });
          } else {
            void finish(undefined);
          }
        }
      } catch {
        // Ignore cross-origin frame access errors while on github.com
      }
    }, 350);
  });
}

/**
 * Pushes code to the user's `LeetCode-Solutions` GitHub repository.
 * If the user's Profile shows connected (or unconnected) and the OAuth token needs a refresh,
 * automatically performs the GitHub OAuth handshake and completes the push seamlessly.
 */
export async function pushSolutionToGithub(params: {
  code: string;
  titleSlug: string;
  lang: string;
  fallbackProfileToken?: string | null;
}): Promise<{
  ok: boolean;
  redirected?: boolean;
  url?: string;
  repoUrl?: string;
  error?: string;
}> {
  const { code, titleSlug, lang, fallbackProfileToken } = params;
  if (!code || !code.trim()) {
    toast.error("Cannot push empty code to GitHub.");
    return { ok: false, error: "Empty code" };
  }

  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) {
    toast.error("Please sign in to push solutions to GitHub.");
    return { ok: false, error: "Not signed in" };
  }

  const uid = currentUser.uid;
  const idToken = await currentUser.getIdToken().catch(() => null);

  let clientToken: string | null =
    fallbackProfileToken ||
    (typeof window !== "undefined" ? localStorage.getItem(`dsa_viz_github_token_${uid}`) : null) ||
    null;

  if (!clientToken) {
    try {
      const fsProfile = await getOrCreateUserProfile(uid, currentUser.email, currentUser.photoURL);
      if (fsProfile?.githubToken) {
        clientToken = fsProfile.githubToken;
        if (typeof window !== "undefined") {
          localStorage.setItem(`dsa_viz_github_token_${uid}`, clientToken!);
        }
      }
    } catch {
      // Non-fatal
    }
  }

  const executePushRequest = async (tokenToUse?: string | null) => {
    const res = await fetch("/api/github/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify({
        code,
        titleSlug: titleSlug || "solution",
        lang: lang || "cpp",
        ...(tokenToUse ? { githubToken: tokenToUse } : {}),
      }),
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  };

  let { res, data } = await executePushRequest(clientToken);

  // Self-healing OAuth refresh if token was missing or expired while profile showed connected
  if (
    res.status === 401 ||
    data?.code === "GITHUB_TOKEN_REFRESH_REQUIRED"
  ) {
    if (typeof window !== "undefined") {
      const pending: PendingGithubPush = {
        code,
        titleSlug: titleSlug || "solution",
        lang: lang || "cpp",
        createdAt: Date.now(),
      };
      sessionStorage.setItem(PENDING_PUSH_STORAGE_KEY, JSON.stringify(pending));
    }

    toast.info("Syncing GitHub authorization token to complete your push...");
    const oauthRes = await connectGithubWithPopupOrRedirect({
      returnTo:
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : "/profile",
    });

    if (oauthRes.redirected) {
      return { ok: false, redirected: true };
    }

    if (!oauthRes.connected) {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(PENDING_PUSH_STORAGE_KEY);
      }
      const errMsg = "GitHub authorization was cancelled before push could complete.";
      toast.error(errMsg);
      return { ok: false, error: errMsg };
    }

    if (typeof window !== "undefined") {
      sessionStorage.removeItem(PENDING_PUSH_STORAGE_KEY);
    }

    const refreshedToken =
      oauthRes.payload?.githubToken ||
      (typeof window !== "undefined" ? localStorage.getItem(`dsa_viz_github_token_${uid}`) : null);

    ({ res, data } = await executePushRequest(refreshedToken));
  }

  if (!res.ok) {
    const errMsg = data?.error || "Failed to push solution to GitHub.";
    toast.error(errMsg);
    return { ok: false, error: errMsg };
  }

  // Persist verified token and metadata locally & to Firestore
  if (data?.encryptedGithubToken || data?.owner) {
    await persistGithubAuthToClient(uid, {
      uid,
      githubConnected: true,
      githubToken: data.encryptedGithubToken || clientToken,
      githubUsername: data.owner || null,
      githubUrl: data.owner ? `https://github.com/${data.owner}` : null,
    });
  }

  return {
    ok: true,
    url: data.url,
    repoUrl: data.repoUrl,
  };
}

/**
 * Checks if a GitHub push was queued right before a full-page OAuth redirect,
 * and automatically completes the push once the user returns from GitHub.
 */
export async function resumePendingGithubPushIfPresent(): Promise<void> {
  if (typeof window === "undefined") return;
  await consumeGithubSyncFromHash();

  const rawPending = sessionStorage.getItem(PENDING_PUSH_STORAGE_KEY);
  if (!rawPending) return;
  sessionStorage.removeItem(PENDING_PUSH_STORAGE_KEY);

  try {
    const pending = JSON.parse(rawPending) as PendingGithubPush;
    if (!pending?.code || Date.now() - Number(pending.createdAt || 0) > 10 * 60 * 1000) {
      return;
    }

    const result = await pushSolutionToGithub({
      code: pending.code,
      titleSlug: pending.titleSlug,
      lang: pending.lang,
    });

    if (result.ok && result.url) {
      toast.success(`Successfully pushed ${pending.titleSlug} to GitHub!`, {
        action: {
          label: "View on GitHub",
          onClick: () => window.open(result.url, "_blank"),
        },
      });
    }
  } catch {
    // Non-fatal
  }
}
