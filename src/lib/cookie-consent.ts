/**
 * DSA.viz.co Privacy & Cookie Consent Manager
 * Fully compliant with GDPR (EU), ePrivacy Directive, CCPA/CPRA (California), and DPDP Act (India).
 */

export interface CookieConsentPreferences {
  necessary: boolean; // Strictly necessary (Security, Auth, CSRF) - Always true
  functional: boolean; // Functional (Theme preferences, Editor drafts, UI state)
  analytics: boolean; // Performance & Analytics (Telemetry, error reporting)
  timestamp: string;
  version: number;
}

const CONSENT_STORAGE_KEY = "dsaviz_cookie_consent";
const CURRENT_POLICY_VERSION = 1;

export const DEFAULT_CONSENT: CookieConsentPreferences = {
  necessary: true,
  functional: true,
  analytics: false,
  timestamp: "",
  version: CURRENT_POLICY_VERSION,
};

type ConsentListener = (preferences: CookieConsentPreferences) => void;
const listeners = new Set<ConsentListener>();

/**
 * Checks whether user has enabled Global Privacy Control (GPC) or Do Not Track (DNT)
 */
export function hasGlobalPrivacyControl(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as any;
  return Boolean(
    nav.globalPrivacyControl === true ||
    nav.doNotTrack === "1" ||
    (window as any).doNotTrack === "1"
  );
}

/**
 * Retrieves the stored cookie consent preferences, or null if not yet determined.
 */
export function getStoredCookieConsent(): CookieConsentPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsentPreferences;
    if (parsed && typeof parsed.necessary === "boolean") {
      return {
        ...DEFAULT_CONSENT,
        ...parsed,
        necessary: true, // Invariant: necessary is always true
      };
    }
  } catch {
    // Storage access restricted or corrupted
  }
  return null;
}

/**
 * Saves user's cookie consent preferences to localStorage and notifies listeners.
 */
export function saveCookieConsent(
  preferences: Partial<CookieConsentPreferences>
): CookieConsentPreferences {
  const gpc = hasGlobalPrivacyControl();
  const resolvedPreferences: CookieConsentPreferences = {
    necessary: true,
    functional: preferences.functional !== undefined ? preferences.functional : true,
    // If GPC is signaled, honor opt-out by defaulting analytics to false unless user explicitly opted in
    analytics: gpc && preferences.analytics === undefined ? false : Boolean(preferences.analytics),
    timestamp: new Date().toISOString(),
    version: CURRENT_POLICY_VERSION,
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(resolvedPreferences));
      // Dispatch custom DOM event for cross-component and 3rd-party listener sync
      window.dispatchEvent(
        new CustomEvent("dsaviz:consent-updated", { detail: resolvedPreferences })
      );
    } catch (e) {
      console.warn("Could not persist cookie consent to localStorage:", e);
    }
  }

  listeners.forEach((listener) => {
    try {
      listener(resolvedPreferences);
    } catch (err) {
      console.error("Error in consent listener:", err);
    }
  });

  return resolvedPreferences;
}

/**
 * Subscribes to consent updates
 */
export function subscribeCookieConsent(listener: ConsentListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Checks whether analytics tracking is permitted under current consent.
 */
export function isAnalyticsPermitted(): boolean {
  const stored = getStoredCookieConsent();
  if (!stored) return false;
  return stored.analytics === true;
}

/**
 * Resets cookie consent (for re-prompting or policy revoking)
 */
export function resetCookieConsent(): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(CONSENT_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent("dsaviz:consent-reset"));
    } catch {
      // Ignored
    }
  }
}
