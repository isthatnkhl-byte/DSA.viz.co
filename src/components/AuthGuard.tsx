import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, useLocation } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const location = useLocation();
  const isLandingPage = location.pathname === "/" || location.pathname === "/auth";

  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user && !isLandingPage) {
        // Redirect non-logged in users to the login page
        router.navigate({ to: "/auth" });
      }
      setInitialLoading(false);
    }
  }, [user, loading, isLandingPage, router]);

  // Always render landing page instantly for performance
  if (isLandingPage) {
    return <>{children}</>;
  }

  if (loading || initialLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
}
