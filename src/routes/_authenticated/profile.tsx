import { createFileRoute } from "@tanstack/react-router";
import React, { Suspense } from "react";
import { RouteLoadingFallback } from "@/components/ui/RouteLoadingFallback";

const LazyComponent = React.lazy(() => import("@/pages/ProfilePage"));

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile & Telemetry Overview — DSA.viz" },
      {
        name: "description",
        content:
          "Track your algorithmic velocity, connected LeetCode & GitHub accounts, activity density, and AI diagnostics.",
      },
      { property: "og:title", content: "Profile & Telemetry Overview — DSA.viz" },
      {
        property: "og:description",
        content: "Your algorithmic mastery overview, integrations, and submission telemetry.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: function ProfilePageRoute() {
    return (
      <Suspense fallback={<RouteLoadingFallback title="Loading Profile & Telemetry..." />}>
        <LazyComponent />
      </Suspense>
    );
  },
});


