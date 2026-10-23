import { createFileRoute } from "@tanstack/react-router";
import React, { Suspense } from "react";
import { RouteLoadingFallback } from "@/components/ui/RouteLoadingFallback";

const LazyComponent = React.lazy(() => import("@/pages/CppCompilerPage"));

export const Route = createFileRoute("/compiler")({
  head: () => ({
    meta: [
      { title: "Online Compiler & DSA Runner (C++, C, Java, Python) — DSA.viz" },
      {
        name: "description",
        content:
          "Sandboxed online compiler & DSA execution runner supporting C++, C, Java, and Python. Interactive standard I/O streams, diagnostic output, and algorithm templates.",
      },
      {
        property: "og:title",
        content: "Online Compiler & DSA Runner (C++, C, Java, Python) — DSA.viz",
      },
      {
        property: "og:description",
        content:
          "Sandboxed online code runner for C++, C, Java, and Python with live stdin/stdout and standard algorithm templates.",
      },
    ],
  }),
  component: function CppCompilerPageRoute() {
    return (
      <Suspense fallback={<RouteLoadingFallback title="Loading C++20 Online Compiler..." />}>
        <LazyComponent />
      </Suspense>
    );
  },
});


