import { createFileRoute } from "@tanstack/react-router";
import React, { Suspense } from "react";
import { RouteLoadingFallback } from "@/components/ui/RouteLoadingFallback";
import { notFound, Link } from "@tanstack/react-router";
import { problemBySlug } from "@/lib/problems";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";

const LazyComponent = React.lazy(() => import("@/pages/ProblemSlugPage"));

export const Route = createFileRoute("/problem/$slug")({
  loader: ({ params }) => {
    const slug = params?.slug ? String(params.slug) : "";
    const problem = problemBySlug(slug);
    if (!problem) throw notFound();
    return { problem };
  },
  head: ({ loaderData }: { loaderData?: any }) => {
    if (!loaderData?.problem) {
      return {
        meta: [{ title: "Problem not found — DSA.viz" }, { name: "robots", content: "noindex" }],
      };
    }
    const slug = loaderData.problem.slug || "";
    const canonicalUrl = `https://dsa.viz.co/problem/${slug}`;
    const t = `${loaderData.problem.title} — Step-by-Step Algorithm Visualizer & Editorial | DSA.viz.co`;
    const d = `Visualize ${loaderData.problem.title} (${loaderData.problem.difficulty}) with interactive frame-by-frame pointer mutations, invariant proofs, LeetCode test cases, and Socratic AI feedback.`;

    return {
      meta: [
        { title: t },
        { name: "description", content: d },
        {
          name: "keywords",
          content: `${loaderData.problem.title}, ${loaderData.problem.title} visualizer, ${loaderData.problem.title} leetcode solution, ${loaderData.problem.category || "DSA"}, ${loaderData.problem.difficulty} algorithm, DSA.viz.co`,
        },
        { property: "og:site_name", content: "DSA.viz.co" },
        { property: "og:title", content: t },
        { property: "og:description", content: d },
        { property: "og:type", content: "article" },
        { property: "og:url", content: canonicalUrl },
        { property: "og:image", content: "https://dsa.viz.co/og-image.jpg" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:site", content: "@dsaviz" },
        { name: "twitter:title", content: t },
        { name: "twitter:description", content: d },
        { name: "twitter:image", content: "https://dsa.viz.co/og-image.jpg" },
      ],
      links: [{ rel: "canonical", href: canonicalUrl }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TechArticle",
            "headline": t,
            "description": d,
            "url": canonicalUrl,
            "image": "https://dsa.viz.co/og-image.jpg",
            "proficiencyLevel": loaderData.problem.difficulty,
            "about": {
              "@type": "ComputerLanguage",
              "name": "Data Structures and Algorithms"
            },
            "author": {
              "@type": "Organization",
              "name": "DSA.viz.co",
              "url": "https://dsa.viz.co/"
            }
          })
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://dsa.viz.co/" },
              { "@type": "ListItem", "position": 2, "name": "Problems", "item": "https://dsa.viz.co/problems" },
              { "@type": "ListItem", "position": 3, "name": loaderData.problem.title, "item": canonicalUrl }
            ]
          })
        }
      ]
    };
  },
  component: function ProblemPageRoute() {
    return (
      <Suspense fallback={<RouteLoadingFallback title="Loading Algorithm Visualizer..." />}>
        <LazyComponent />
      </Suspense>
    );
  },
  notFoundComponent: () => (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h2 className="text-xl font-bold text-foreground">Problem not found</h2>
        <p className="mt-2 text-xs text-muted-foreground">
          The requested problem could not be located. Browse all available problems below.
        </p>
        <Link to="/" className="mt-5 inline-block">
          <Button className="font-bold">Back to problems</Button>
        </Link>
      </div>
    </div>
  ),
  errorComponent: ({ error, reset }: { error: any; reset: () => void }) => (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h2 className="text-xl font-bold text-foreground">This problem didn't load</h2>
        <p className="mt-2 text-xs text-muted-foreground font-mono">
          {error?.message || "An unexpected error occurred while loading this problem."}
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Button onClick={() => reset()} variant="outline" className="font-mono text-xs">
            Try again
          </Button>
          <Link to="/">
            <Button className="font-bold text-xs">Back to problems</Button>
          </Link>
        </div>
      </div>
    </div>
  ),
});


