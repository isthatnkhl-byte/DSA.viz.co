import { createFileRoute } from "@tanstack/react-router";
import React, { Suspense } from "react";
import { RouteLoadingFallback } from "@/components/ui/RouteLoadingFallback";

const MasterPatternsPage = React.lazy(
  () => import("@/pages/MasterPatternsPage"),
);

export const Route = createFileRoute("/master-patterns" as any)({
  head: () => ({
    meta: [
      {
        title:
          "Master DSA Patterns — Adaptive Invariant & Optimization Studio — DSA.viz.co",
      },
      {
        name: "description",
        content:
          "Master coding interview patterns (Two Pointers, Sliding Window, Binary Search, DP, Graphs) through tailored first-principles notes, verbal approach checks, case-study complexity audits, and twisted follow-up challenges.",
      },
    ],
  }),
  component: function MasterPatternsRoute() {
    return (
      <Suspense
        fallback={
          <RouteLoadingFallback title="Loading Master Patterns Studio..." />
        }
      >
        <MasterPatternsPage />
      </Suspense>
    );
  },
});
