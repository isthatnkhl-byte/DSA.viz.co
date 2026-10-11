import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { 
  Sparkles, 
  ArrowLeft, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  ExternalLink,
  Info
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — DSA.viz" },
      {
        name: "description",
        content:
          "Sign in to DSA.viz with Google to save your pseudocode attempts, AI reviews and track your solved-problem progress.",
      },
      { property: "og:title", content: "Sign in — DSA.viz" },
      {
        property: "og:description",
        content: "Save your DSA interview attempts and track progress across 1500+ problems.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading, isConfigured, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedHost, setCopiedHost] = useState(false);
  const currentHost = typeof window !== "undefined" ? window.location.hostname : "";
  const isUnauthorizedDomain =
    Boolean(error && (error.includes("unauthorized-domain") || error.includes("Authorized Domains") || error.includes("Authorized Domain")));

  const redirectTarget = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("redirect") || "/"
    : "/";
  const safeRedirect = redirectTarget.startsWith("/") && !redirectTarget.startsWith("//") ? redirectTarget : "/";

  useEffect(() => {
    if (user) {
      navigate({ to: safeRedirect as any, replace: true });
    }
  }, [user, navigate, safeRedirect]);

  async function handleGoogleSignIn() {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
      if (!isConfigured) {
        toast.success("Signed in with Google Developer profile");
        navigate({ to: safeRedirect as any, replace: true });
      }
    } catch (err: any) {
      console.warn("Google sign-in caught:", err);
      const msg = err?.message || "Failed to initiate Google OAuth sign-in";
      setError(msg);
      if (err?.code === "auth/unauthorized-domain" || msg.includes("unauthorized-domain")) {
        toast.error("Domain needs to be authorized in Firebase Console.");
      } else {
        toast.error("Could not sign in with Google.");
      }
    } finally {
      setBusy(false);
    }
  }

  const handleCopyHost = () => {
    if (currentHost) {
      navigator.clipboard.writeText(currentHost);
      setCopiedHost(true);
      toast.success(`Copied "${currentHost}" to clipboard`);
      setTimeout(() => setCopiedHost(false), 2500);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main id="main-content" className="flex-1 mx-auto flex w-full max-w-lg flex-col items-center px-4 py-12 text-center">
        <Link
          to="/"
          className="group mb-8 inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />
          <span>Back to Home</span>
        </Link>

        {/* Card */}
        <div className="w-full rounded-2xl border border-border/80 bg-card/75 p-6 sm:p-8 shadow-sm backdrop-blur-sm animate-rise">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm shadow-primary/20">
            <Sparkles className="size-7 animate-pulse" />
          </div>

          <h2 className="mt-4 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            Welcome to <span className="gradient-text">DSA.viz.co</span>
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Sign in with Google to persist your algorithm pseudocode, save AI feedback, connect your LeetCode profile, and track your progress.
          </p>

          <div className="my-6 space-y-2 text-left font-mono text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
              <span>Full Firebase OAuth &amp; Profile Sync</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
              <span>Connect LeetCode Heatmap &amp; Submissions</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
              <span>Save pseudocode &amp; AI complexity verdicts</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              className="w-full h-12 text-sm font-bold gap-2.5 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary text-primary-foreground"
              onClick={handleGoogleSignIn}
              disabled={busy || loading}
            >
              {busy ? (
                <>
                  <span className="size-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                  <span>Connecting to Google OAuth…</span>
                </>
              ) : (
                <>
                  <svg className="size-4.5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </Button>

            {/* Form & Privacy Policy Consent Notice */}
            <p className="text-[11px] leading-relaxed text-muted-foreground pt-2 text-center">
              By continuing, you agree to our{" "}
              <Link to="/terms" className="text-primary underline hover:text-accent font-medium">
                Terms of Service
              </Link>
              , acknowledge our{" "}
              <Link to="/privacy" className="text-primary underline hover:text-accent font-medium">
                Privacy Policy
              </Link>
              , and consent to our{" "}
              <Link to="/cookies" className="text-primary underline hover:text-accent font-medium">
                Cookie Policy
              </Link>
              . We only collect the minimal profile data required for account synchronization.
            </p>
          </div>

          {/* Domain Authorization Notice Box */}
          {isUnauthorizedDomain ? (
            <div className="mt-5 text-left rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 font-mono text-xs text-amber-200/90 shadow-sm animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-bold text-amber-400">
                <Info className="size-4 shrink-0" />
                <span>Firebase Authorized Domain Required</span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground font-sans">
                Google OAuth requires this preview domain to be allowlisted in the Firebase project console:
              </p>

              <div className="my-2.5 flex items-center justify-between gap-2 rounded-lg border border-border/80 bg-background/80 px-3 py-1.5">
                <code className="text-[11px] font-mono font-semibold text-primary truncate">
                  {currentHost}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyHost}
                  className="h-6 px-2 text-[10px] font-mono gap-1 text-primary hover:bg-primary/20 shrink-0"
                >
                  {copiedHost ? (
                    <>
                      <Check className="size-3 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      <span>Copy</span>
                    </>
                  )}
                </Button>
              </div>

              <ol className="mt-2 space-y-1 text-[11px] text-muted-foreground font-sans list-decimal list-inside">
                <li>
                  Open{" "}
                  <a
                    href="https://console.firebase.google.com/project/seventh-cabinet-mq6d2/authentication/settings"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline font-medium hover:text-accent inline-flex items-center gap-0.5"
                  >
                    Firebase Console &gt; Auth Settings
                    <ExternalLink className="size-2.5 inline" />
                  </a>
                </li>
                <li>Under <strong>Authorized domains</strong>, click <strong>Add domain</strong> and paste the copied hostname.</li>
              </ol>
            </div>
          ) : error ? (
            <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive text-left">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] font-mono text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" />
            <span>Secure Firebase OAuth integration</span>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export default AuthPage;
