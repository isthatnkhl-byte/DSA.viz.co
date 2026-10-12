import React, { useEffect } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { ShieldCheck, Lock } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const rawPathname = location.pathname || "/";
  const pathname = rawPathname === "/" ? "/" : rawPathname.replace(/\/+$/, "");
  const isPublicRoute =
    pathname === "/" ||
    pathname === "/auth" ||
    pathname === "/ai-learning" ||
    pathname === "/terms" ||
    pathname === "/privacy" ||
    pathname === "/cookies";

  useEffect(() => {
    if (!loading && !user && !isPublicRoute) {
      const target = `${location.pathname}${location.searchStr || ""}`;
      navigate({
        to: "/auth",
        search: { redirect: target } as any,
        replace: true,
      });
    }
  }, [loading, user, isPublicRoute, location.pathname, location.searchStr, navigate]);

  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/80 bg-card/90 px-8 py-7 shadow-xl backdrop-blur-md">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/30">
            <ShieldCheck className="size-6 animate-pulse" />
          </div>
          <div className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-foreground">
            Verifying Google Security Session
          </div>
          <p className="text-[11px] font-mono text-muted-foreground">
            Validating encrypted OAuth token...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/80 bg-card/90 px-8 py-7 shadow-xl backdrop-blur-md">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/30">
            <Lock className="size-6" />
          </div>
          <div className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-foreground">
            Authentication Required
          </div>
          <p className="text-[11px] font-mono text-muted-foreground">
            Redirecting to Google Sign-In...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

