import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, useLocation } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

// Publicly accessible paths allowed without an active authenticated session
const PUBLIC_PATHS = new Set(["/auth", "/terms", "/privacy", "/cookies"]);

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const location = useLocation();

  const isPublicRoute = PUBLIC_PATHS.has(location.pathname);
  const isAuthenticated = Boolean(user && user.uid && user.uid !== "guest-developer");
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated && !isPublicRoute) {
        // Enforce authorized login across the website
        const redirectParam = location.pathname && location.pathname !== "/" ? { redirect: location.pathname } : undefined;
        router.navigate({ to: "/auth", search: redirectParam });
      } else if (isAuthenticated && location.pathname === "/auth") {
        // Already authenticated, redirect away from login page to target or home
        const redirectParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("redirect") : null;
        const target = redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//") ? redirectParam : "/";
        router.navigate({ to: target as any });
      }
      setInitialLoading(false);
    }
  }, [isAuthenticated, loading, isPublicRoute, location.pathname, router]);

  // Allow public routes
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Show loading spinner while verifying authorization
  if (loading || initialLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  // If unauthorized, block rendering while redirecting
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
