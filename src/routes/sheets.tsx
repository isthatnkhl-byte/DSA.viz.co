import { createFileRoute } from "@tanstack/react-router";
import React, { Suspense } from "react";
import { RouteLoadingFallback } from "@/components/ui/RouteLoadingFallback";

const LazyComponent = React.lazy(() => import("@/pages/SheetsPage"));

export const Route = createFileRoute("/sheets")({
  head: () => ({
    meta: [
      { title: "Curated DSA Roadmaps & Sheets — DSA.viz" },
      {
        name: "description",
        content:
          "Track your progress on top DSA sheets including Striver's A2Z, Blind 75, NeetCode 150, Grind 75, Love Babbar 450, Apna College, and Sean Prasad Patterns with step-by-step visualizers.",
      },
      { property: "og:title", content: "Curated DSA Roadmaps & Sheets — DSA.viz" },
      {
        property: "og:description",
        content:
          "Master technical interviews with curated roadmaps, topic-wise progress tracking, and interactive algorithmic visualizers.",
      },
    ],
  }),
  component: function SheetsPageRoute() {
    return (
      <Suspense fallback={<RouteLoadingFallback title="Loading DSA Curated Sheets..." />}>
        <LazyComponent />
      </Suspense>
    );
  },
});


