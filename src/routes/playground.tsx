import { createFileRoute } from "@tanstack/react-router";
import React, { Suspense } from "react";
import { RouteLoadingFallback } from "@/components/ui/RouteLoadingFallback";

const LazyComponent = React.lazy(() => import("@/pages/PlaygroundPage"));

export const Route = createFileRoute("/playground")({
  head: () => ({
    meta: [
      { title: "DSA Sandbox & AI Invariant Laboratory — DSA.viz" },
      {
        name: "description",
        content:
          "Test any algorithm on custom data structures. Get instant AI rating, invariant audit, and animated step-by-step execution.",
      },
      { property: "og:title", content: "DSA Sandbox & AI Algorithm Playground" },
      {
        property: "og:description",
        content:
          "Test any algorithm on custom data structures. Get instant AI ratings and watch animated step-by-step execution.",
      },
    ],
  }),
  component: function PlaygroundPageRoute() {
    return (
      <Suspense fallback={<RouteLoadingFallback title="Loading DSA Sandbox & Playground..." />}>
        <LazyComponent />
      </Suspense>
    );
  },
});


