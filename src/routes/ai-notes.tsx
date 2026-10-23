import { createFileRoute } from "@tanstack/react-router";
import React, { Suspense } from "react";
import { RouteLoadingFallback } from "@/components/ui/RouteLoadingFallback";

const LazyComponent = React.lazy(() => import("@/pages/AiNotesDashboardPage"));

export const Route = createFileRoute("/ai-notes" as any)({
  head: () => ({
    meta: [
      { title: "AI Notes & Handwritten Algorithm PDF Compiler — DSA.viz.co" },
      {
        name: "description",
        content:
          "Synthesize multi-page handwritten algorithm notebooks, LeetCode invariants, Excalidraw whiteboards, and compiler solutions into clean printable A4 revision booklets with calibrated 2-3 items per page layout.",
      },
      {
        name: "keywords",
        content:
          "algorithm handwritten notes, DSA revision notes, multi page algorithm PDF, LeetCode cheat sheet generator, handwritten notebook compiler, data structures revision booklet, DSA.viz.co notes",
      },
      { property: "og:title", content: "AI Notes & Multi-Page Handwritten PDF Engine — DSA.viz.co" },
      {
        property: "og:description",
        content:
          "Collect algorithm solutions, invariant proofs, whiteboard diagrams, and compiler runs into beautifully styled handwritten A4 notebook pages.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://dsa.viz.co/ai-notes" },
      { property: "og:image", content: "https://dsa.viz.co/og-image.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@dsaviz" },
      { name: "twitter:title", content: "AI Notes & Multi-Page Handwritten PDF Engine — DSA.viz.co" },
      {
        name: "twitter:description",
        content:
          "Synthesize multi-page handwritten algorithm notes, invariant proofs, and compiler runs into clean A4 printable sheets.",
      },
      { name: "twitter:image", content: "https://dsa.viz.co/og-image.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://dsa.viz.co/ai-notes" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "DSA.viz.co AI Notes Engine",
          "applicationCategory": "EducationalApplication",
          "operatingSystem": "Web",
          "url": "https://dsa.viz.co/ai-notes",
          "description": "Multi-page handwritten-style PDF compiler and algorithm revision notebook engine.",
          "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://dsa.viz.co/" },
            { "@type": "ListItem", "position": 2, "name": "AI Notes", "item": "https://dsa.viz.co/ai-notes" },
          ],
        }),
      },
    ],
  }),
  component: function AiNotesDashboardPageRoute() {
    return (
      <Suspense fallback={<RouteLoadingFallback title="Loading AI Notes Dashboard..." />}>
        <LazyComponent />
      </Suspense>
    );
  },
});


