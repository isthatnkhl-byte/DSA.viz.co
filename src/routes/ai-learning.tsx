import { createFileRoute } from "@tanstack/react-router";
import React, { Suspense } from "react";
import { RouteLoadingFallback } from "@/components/ui/RouteLoadingFallback";

const AiLearningPage = React.lazy(() => import("@/pages/AiLearningPage"));

export const Route = createFileRoute("/ai-learning" as any)({
  head: () => ({
    meta: [
      { title: "AI Learning Whiteboard & Socratic Co-Teacher — DSA.viz.co" },
      {
        name: "description",
        content:
          "Master Data Structures & Algorithms on a full-screen Excalidraw canvas with a live Socratic AI co-teacher. Draw invariant diagrams, step through live simulations, and practice with real-time feedback.",
      },
      {
        name: "keywords",
        content:
          "AI whiteboard, Excalidraw DSA, algorithm whiteboard, Socratic coding tutor, data structures visualization whiteboard, interactive coding studio, DSA.viz.co",
      },
      { property: "og:site_name", content: "DSA.viz.co" },
      { property: "og:title", content: "AI Learning Whiteboard & Socratic Co-Teacher — DSA.viz.co" },
      {
        property: "og:description",
        content:
          "Master algorithms with an AI co-teacher that draws on an Excalidraw canvas, explains invariants, and guides your problem-solving step by step.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://dsa.viz.co/ai-learning" },
      { property: "og:image", content: "https://dsa.viz.co/og-image.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@dsaviz" },
      { name: "twitter:title", content: "AI Learning Whiteboard & Socratic Co-Teacher — DSA.viz.co" },
      {
        name: "twitter:description",
        content:
          "Full-screen Excalidraw whiteboard integrated with Socratic AI co-teacher for Data Structures & Algorithms.",
      },
      { name: "twitter:image", content: "https://dsa.viz.co/og-image.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://dsa.viz.co/ai-learning" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "EducationalApplication",
          "name": "DSA.viz.co AI Learning Whiteboard",
          "applicationCategory": "EducationalApplication",
          "operatingSystem": "Web",
          "url": "https://dsa.viz.co/ai-learning",
          "description": "Full-screen interactive Excalidraw whiteboard with real-time Socratic AI co-teacher for algorithms.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://dsa.viz.co/" },
            { "@type": "ListItem", "position": 2, "name": "AI Learning", "item": "https://dsa.viz.co/ai-learning" },
          ],
        }),
      },
    ],
  }),
  component: function AiLearningRoute() {
    return (
      <Suspense fallback={<RouteLoadingFallback title="Loading AI Whiteboard & Socratic Co-Teacher..." />}>
        <AiLearningPage />
      </Suspense>
    );
  },
});

