import { createFileRoute } from "@tanstack/react-router";
import React, { Suspense } from "react";
import { RouteLoadingFallback } from "@/components/ui/RouteLoadingFallback";

const LiveInterviewPage = React.lazy(() => import("@/pages/LiveInterviewPage"));

export const Route = createFileRoute("/live-interview")({
  head: () => ({
    meta: [
      { title: "FAANG AI Mock Interview Simulator (3-Tier Proctored Room) — DSA.viz.co" },
      {
        name: "description",
        content:
          "Practice realistic FAANG technical coding interviews with an interactive AI interviewer. 3-tier proctoring with local audio/video, real-time code analysis, live whiteboard, and detailed performance grading.",
      },
      {
        name: "keywords",
        content:
          "AI mock interview, FAANG interview practice, coding interview simulator, technical interview proctoring, LeetCode interview prep, DSA.viz.co interview",
      },
      { property: "og:site_name", content: "DSA.viz.co" },
      { property: "og:title", content: "FAANG AI Mock Interview Simulator — DSA.viz.co" },
      {
        property: "og:description",
        content:
          "Practice realistic technical coding interviews with an interactive AI interviewer, live audio/video proctoring, and comprehensive rubric grading.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://dsa.viz.co/live-interview" },
      { property: "og:image", content: "https://dsa.viz.co/og-image.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@dsaviz" },
      { name: "twitter:title", content: "FAANG AI Mock Interview Simulator — DSA.viz.co" },
      {
        name: "twitter:description",
        content:
          "Practice realistic technical coding interviews with an interactive AI interviewer, live whiteboard, and detailed performance scorecards.",
      },
      { name: "twitter:image", content: "https://dsa.viz.co/og-image.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://dsa.viz.co/live-interview" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "DSA.viz.co FAANG Interview Simulator",
          "applicationCategory": "EducationalApplication",
          "operatingSystem": "Web",
          "url": "https://dsa.viz.co/live-interview",
          "description": "3-Tier proctored technical coding interview practice room with Socratic AI interviewer.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://dsa.viz.co/" },
            { "@type": "ListItem", "position": 2, "name": "Mock Interview", "item": "https://dsa.viz.co/live-interview" },
          ],
        }),
      },
    ],
  }),
  component: function LiveInterviewRoute() {
    return (
      <Suspense fallback={<RouteLoadingFallback title="Loading FAANG AI Mock Interview..." />}>
        <LiveInterviewPage />
      </Suspense>
    );
  },
});

