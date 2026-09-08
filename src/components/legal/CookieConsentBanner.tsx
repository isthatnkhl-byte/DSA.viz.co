import { useState, useEffect } from "react";
import { Cookie, ShieldCheck, Sliders, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  getStoredCookieConsent,
  saveCookieConsent,
  hasGlobalPrivacyControl,
} from "@/lib/cookie-consent";
import { CookiePreferencesModal } from "./CookiePreferencesModal";

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Check if user has already made a consent choice
    const stored = getStoredCookieConsent();
    if (!stored) {
      // If user has Global Privacy Control signal, honor it automatically while showing notification
      if (hasGlobalPrivacyControl()) {
        saveCookieConsent({ functional: true, analytics: false });
      }
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    saveCookieConsent({
      necessary: true,
      functional: true,
      analytics: true,
    });
    setIsVisible(false);
  };

  const handleRejectNonEssential = () => {
    saveCookieConsent({
      necessary: true,
      functional: false,
      analytics: false,
    });
    setIsVisible(false);
  };

  if (!isVisible && !isModalOpen) return null;

  return (
    <>
      {isVisible && (
        <aside
          aria-label="Cookie and Privacy Consent"
          role="region"
          className="fixed bottom-4 left-4 right-4 md:left-6 md:right-auto md:max-w-xl z-50 rounded-2xl border border-border/80 bg-background/95 p-4 sm:p-5 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-300"
        >
          <div className="flex items-start gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <Cookie className="size-5" />
            </div>

            <div className="flex-1 space-y-1.5 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-1.5">
                  <span>Your Privacy &amp; Data Rights</span>
                  <ShieldCheck className="size-3.5 text-emerald-400" />
                </h3>
                <button
                  type="button"
                  onClick={handleRejectNonEssential}
                  className="text-muted-foreground hover:text-foreground p-1 -mr-1"
                  aria-label="Dismiss and use strictly necessary cookies only"
                >
                  <X className="size-4" />
                </button>
              </div>

              <p className="text-xs leading-relaxed text-muted-foreground font-sans">
                We use cookies and local storage to secure authentication, store your preferred theme and editor drafts, and optimize algorithm execution. We never sell your personal data.
              </p>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-[11px] font-mono text-muted-foreground">
                <Link to="/cookies" className="text-primary hover:underline">
                  Cookie Policy
                </Link>
                <span>•</span>
                <Link to="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
                <span>•</span>
                <Link to="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2.5">
                <Button
                  size="sm"
                  onClick={handleAcceptAll}
                  className="h-8 px-3.5 text-xs font-mono font-bold bg-primary text-primary-foreground shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-transform"
                >
                  Accept All
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRejectNonEssential}
                  className="h-8 px-3 text-xs font-mono border-border/80 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                >
                  Reject Non-Essential
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsModalOpen(true)}
                  className="h-8 px-2.5 text-xs font-mono text-primary hover:bg-primary/10 gap-1.5"
                >
                  <Sliders className="size-3" />
                  <span>Customize</span>
                </Button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Preferences Dialog */}
      <CookiePreferencesModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setIsVisible(false);
        }}
      />
    </>
  );
}
