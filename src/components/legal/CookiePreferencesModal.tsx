import { useState, useEffect } from "react";
import { X, Shield, Sliders, Check, Lock, Cookie, Info } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  CookieConsentPreferences,
  getStoredCookieConsent,
  saveCookieConsent,
  DEFAULT_CONSENT,
  hasGlobalPrivacyControl,
} from "@/lib/cookie-consent";

interface CookiePreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CookiePreferencesModal({ isOpen, onClose }: CookiePreferencesModalProps) {
  const [preferences, setPreferences] = useState<CookieConsentPreferences>(DEFAULT_CONSENT);
  const isGpcActive = hasGlobalPrivacyControl();

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredCookieConsent();
      if (stored) {
        setPreferences(stored);
      } else {
        setPreferences({
          ...DEFAULT_CONSENT,
          analytics: false,
        });
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveCookieConsent(preferences);
    onClose();
  };

  const handleAcceptAll = () => {
    saveCookieConsent({
      necessary: true,
      functional: true,
      analytics: true,
    });
    onClose();
  };

  const handleRejectNonEssential = () => {
    saveCookieConsent({
      necessary: true,
      functional: false,
      analytics: false,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Content */}
      <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-border/80 bg-background/95 p-6 shadow-2xl backdrop-blur-xl sm:p-8 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <Cookie className="size-5" />
            </div>
            <div>
              <h2 id="cookie-modal-title" className="text-lg font-bold font-display text-foreground">
                Privacy & Cookie Preferences
              </h2>
              <p className="text-xs text-muted-foreground font-mono">
                Manage your data privacy settings and cookie categories
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            aria-label="Close preferences modal"
          >
            <X className="size-4.5" />
          </button>
        </div>

        {/* GPC Signal Banner if detected */}
        {isGpcActive && (
          <div className="my-4 flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
            <Shield className="size-4 shrink-0" />
            <span>
              <strong>Global Privacy Control (GPC) / Do Not Track detected.</strong> Non-essential tracking cookies are automatically disabled by default to honor your browser signal.
            </span>
          </div>
        )}

        {/* Intro text */}
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground font-sans">
          We respect your privacy and only collect data strictly necessary to deliver algorithm visualizations, pseudocode reviews, and compiler sandboxes. You can customize your preferences below. For comprehensive details, read our{" "}
          <Link to="/cookies" className="text-primary underline hover:text-accent" onClick={onClose}>
            Cookie Policy
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="text-primary underline hover:text-accent" onClick={onClose}>
            Privacy Policy
          </Link>.
        </p>

        {/* Categories List */}
        <div className="mt-6 space-y-4">
          {/* 1. Strictly Necessary */}
          <div className="rounded-xl border border-border/70 bg-secondary/30 p-4 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Lock className="size-4 text-primary" />
                <div>
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    Strictly Necessary Cookies
                    <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-primary">
                      Always Active
                    </span>
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Required for core security, user authentication, CSRF defense, and session persistence.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={true}
                disabled={true}
                aria-label="Strictly Necessary Cookies (Always active)"
                className="size-4 rounded border-border accent-primary cursor-not-allowed opacity-75"
              />
            </div>
            <div className="mt-2.5 pt-2 border-t border-border/40 text-[10px] font-mono text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
              <span>• Firebase Auth token</span>
              <span>• CSRF session state</span>
              <span>• Cookie consent memory</span>
            </div>
          </div>

          {/* 2. Functional Preferences */}
          <div className="rounded-xl border border-border/70 bg-secondary/30 p-4 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sliders className="size-4 text-primary" />
                <div>
                  <h3 className="text-xs font-bold text-foreground">
                    Functional &amp; Preference Storage
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Stores your chosen UI theme (dark/light/accent colors), pseudocode editor draft cache, and visualizer playback speed.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.functional}
                  onChange={(e) =>
                    setPreferences((prev) => ({ ...prev, functional: e.target.checked }))
                  }
                  aria-label="Toggle Functional Cookies"
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            <div className="mt-2.5 pt-2 border-t border-border/40 text-[10px] font-mono text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
              <span>• dsaviz:theme_color</span>
              <span>• dsaviz:color_mode</span>
              <span>• In-browser pseudocode scratchpad</span>
            </div>
          </div>

          {/* 3. Performance & Analytics */}
          <div className="rounded-xl border border-border/70 bg-secondary/30 p-4 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Info className="size-4 text-primary" />
                <div>
                  <h3 className="text-xs font-bold text-foreground">
                    Performance &amp; Diagnostics Analytics
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Helps us understand page load latency, broken algorithms, and runtime compiler crashes without ever storing PII or selling personal information.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={(e) =>
                    setPreferences((prev) => ({ ...prev, analytics: e.target.checked }))
                  }
                  aria-label="Toggle Analytics Cookies"
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            <div className="mt-2.5 pt-2 border-t border-border/40 text-[10px] font-mono text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
              <span>• Anonymized route latency</span>
              <span>• Unhandled compiler errors</span>
              <span>• Zero 3rd-party ad trackers</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-4 border-t border-border/60 flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRejectNonEssential}
            className="text-xs font-mono border-border/80 text-muted-foreground hover:text-foreground"
          >
            Reject Non-Essential
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSave}
              className="text-xs font-mono font-semibold"
            >
              Save My Preferences
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAcceptAll}
              className="text-xs font-mono font-bold bg-primary text-primary-foreground shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              Accept All Cookies
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
