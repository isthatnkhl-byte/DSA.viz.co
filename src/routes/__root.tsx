import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useLocation,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { useThemeColor } from "@/hooks/useThemeColor";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/AuthGuard";
import { CustomCursor } from "@/components/ui/custom-cursor";
import { ChatProvider, useChat } from "@/context/ChatContext";
import { VizcoCloudChatbox } from "@/components/chat/VizcoCloudChatbox";
import { VizcoBuddy } from "@/components/chat/VizcoBuddy";
import { CookieConsentBanner } from "@/components/legal/CookieConsentBanner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "DSA.viz.co — Interactive Algorithm Visualizer, DSA Sheets & C++20 Compiler" },
      { name: "google-site-verification", content: "KONYW4tS7hYdirLm0WK8L878N-0ZI9xhXgxo4nzg8ok" },
      {
        name: "description",
        content:
          "Master Data Structures & Algorithms by seeing how they think. Step through 1,500+ LeetCode interview problems frame by frame with live pointer animations, curated DSA sheets (Striver SDE, Blind 75, NeetCode 150), Socratic AI coaching, and sandboxed C++20, Java, and Python execution.",
      },
      {
        name: "keywords",
        content:
          "DSA visualizer, algorithm visualizer, data structures and algorithms visualizer, LeetCode visualizer, step by step algorithm animation, DSA sheets, Striver SDE sheet, Blind 75, NeetCode 150, Grind 75, Love Babbar 450, C++20 online compiler, Java online compiler, Python algorithm visualizer, AI mock coding interview, binary tree visualizer, graph algorithm visualizer, dynamic programming visualizer, DSA.viz.co, dsavizco",
      },
      { name: "author", content: "DSA.viz.co" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { name: "theme-color", content: "#7C3AED" },
      { property: "og:site_name", content: "DSA.viz.co" },
      { property: "og:title", content: "DSA.viz.co — Master Algorithms by Seeing How They Think" },
      {
        property: "og:description",
        content:
          "Step through 1,500+ LeetCode interview problems frame by frame, inspect live pointer mutations and recursion stacks, practice curated DSA sheets, and run sandboxed C++20/Java/Python code.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://dsa.viz.co/" },
      { property: "og:locale", content: "en_US" },
      { property: "og:image", content: "https://dsa.viz.co/og-image.jpg" },
      { property: "og:image:secure_url", content: "https://dsa.viz.co/og-image.jpg" },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1408" },
      { property: "og:image:height", content: "768" },
      { property: "og:image:alt", content: "DSA.viz.co — Master algorithms by seeing how they think (Algorithms • Visualizer • Compiler)" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@dsaviz" },
      { name: "twitter:title", content: "DSA.viz.co — Master Algorithms by Seeing How They Think" },
      {
        name: "twitter:description",
        content:
          "Step through 1,500+ LeetCode interview problems frame by frame with live pointer animations, curated DSA sheets, Socratic AI coaching, and sandboxed C++20 execution.",
      },
      { name: "twitter:image", content: "https://dsa.viz.co/og-image.jpg" },
      { name: "twitter:image:alt", content: "DSA.viz.co — Master algorithms by seeing how they think (Algorithms • Visualizer • Compiler)" },
    ],
    links: [
      { rel: "canonical", href: "https://dsa.viz.co/" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "preload", as: "image", href: "/og-image.jpg" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Caveat:wght@500;600;700&family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,600&family=Outfit:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&family=Press+Start+2P&family=Silkscreen:wght@400;700&display=swap",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "sitemap", type: "application/xml", href: "/sitemap.xml" },
      { rel: "manifest", href: "/site.webmanifest" },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { rel: "icon", href: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { rel: "alternate icon", href: "/favicon.ico" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
    ],
    scripts: [
      // WebSite schema — enables Google Sitelinks Search Box
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "DSA.viz.co",
          "alternateName": ["DSA Viz", "dsavizco"],
          "url": "https://dsa.viz.co/",
          "description": "Interactive algorithm visualizer and DSA learning platform with 1,500+ problems, step-by-step animations, curated DSA sheets, and AI mock interviews.",
          "potentialAction": {
            "@type": "SearchAction",
            "target": {
              "@type": "EntryPoint",
              "urlTemplate": "https://dsa.viz.co/problems?q={search_term_string}"
            },
            "query-input": "required name=search_term_string"
          }
        }),
      },
      // SoftwareApplication schema — enables app-style rich results
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "DSA.viz.co",
          "applicationCategory": "EducationalApplication",
          "operatingSystem": "Web",
          "url": "https://dsa.viz.co/",
          "description": "Master Data Structures & Algorithms with frame-by-frame algorithm visualization, 1,500+ LeetCode problems, curated DSA sheets, AI mock interviews, and a sandboxed C++20/Java/Python compiler.",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          },
          "featureList": [
            "1,500+ Interactive Algorithm Visualizations",
            "Step-by-step animation with live pointer tracking",
            "Curated DSA Sheets: Striver SDE, Blind 75, NeetCode 150, Grind 75, Love Babbar 450",
            "Online C++20, Java 21, Python 3.12 Sandbox Compiler",
            "Socratic AI Coding Coach (Gemini + OpenRouter)",
            "Proctored FAANG Mock Interview Simulator",
            "52-Week Progress Heatmap & GitHub Sync"
          ],
          "screenshot": "https://dsa.viz.co/og-image.jpg",
          "author": {
            "@type": "Person",
            "name": "Nikhil",
            "url": "https://github.com/isthatnkhl-byte"
          }
        }),
      },
      // FAQPage schema — can trigger FAQ accordion rich results in SERPs
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "What is DSA.viz.co?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "DSA.viz.co is a free interactive algorithm visualization platform that lets you step through 1,500+ LeetCode and DSA problems frame by frame, watching live pointer mutations, recursion stacks, and DP table fills animate in real time."
              }
            },
            {
              "@type": "Question",
              "name": "Does DSA.viz.co support Striver SDE Sheet and NeetCode 150?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. DSA.viz.co includes curated DSA sheets including Striver's SDE Sheet, NeetCode 150, Blind 75, Grind 75, and Love Babbar 450, with interactive checkboxes, search, random unsolved problem picker, and direct links to animated visualizers."
              }
            },
            {
              "@type": "Question",
              "name": "Is DSA.viz.co free to use?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes, DSA.viz.co is completely free. You can bring your own Gemini, OpenAI, or OpenRouter API key to unlock unlimited AI coaching, or use the platform without any key for visualizations, DSA sheets, and the C++20/Java/Python compiler."
              }
            },
            {
              "@type": "Question",
              "name": "Which programming languages does the online compiler support?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "The DSA.viz.co compiler supports C++20 (GCC 14.1), C17, Java 21, Python 3.12, JavaScript, and TypeScript, all running in isolated cloud sandboxes with no local installation required."
              }
            },
            {
              "@type": "Question",
              "name": "How does DSA.viz.co compare to VisuAlgo?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "While VisuAlgo focuses on classic algorithm animations, DSA.viz.co additionally provides a dynamic multi-testcase LeetCode judge, curated DSA sheets (Striver, NeetCode, Blind 75), an AI Socratic coach, a proctored mock interview room, and an integrated cloud compiler — all in a single platform."
              }
            }
          ]
        }),
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const ROUTE_SEO_MAP: Record<string, { title: string; description: string }> = {
  "/": {
    title: "DSA.viz.co — Master Algorithms by Seeing How They Think (Visualizer • Sheets • Compiler)",
    description:
      "Step through 1,500+ LeetCode and DSA interview problems frame by frame with live pointer animations, curated DSA sheets (Striver SDE, Blind 75, NeetCode 150), Socratic AI coaching, and sandboxed C++20/Java/Python execution.",
  },
  "/problems": {
    title: "1,500+ Interactive LeetCode & DSA Problems Catalog — DSA.viz.co",
    description:
      "Browse and visualize 1,500+ curated LeetCode and Data Structures & Algorithms problems with step-by-step animations, multi-testcase AI judging, and complexity analysis.",
  },
  "/sheets": {
    title: "Curated DSA Sheets (Striver SDE, Blind 75, NeetCode 150, Grind 75, Love Babbar 450) — DSA.viz.co",
    description:
      "Track your progress across Striver SDE Sheet, Blind 75, NeetCode 150, Grind 75, and Love Babbar 450 with instant global search, random unsolved problem picker, and interactive visualizers.",
  },
  "/compiler": {
    title: "Online C++20, C17, Java 21 & Python 3.12 Sandbox Compiler — DSA.viz.co",
    description:
      "Write, compile, and benchmark C++20, C, Java, and Python algorithms in an isolated cloud sandbox with standard library documentation and interactive stdin testing.",
  },
  "/playground": {
    title: "Interactive Algorithm Visualizer Playground — DSA.viz.co",
    description:
      "Write custom pseudocode or production code and watch it animate step by step across arrays, trees, graphs, matrices, heaps, and dynamic programming tables.",
  },
  "/live-interview": {
    title: "Proctored AI Mock Coding Interview Simulator (FAANG 3-Tier) — DSA.viz.co",
    description:
      "Practice live proctored technical interviews with Socratic AI coaching, Brute Force to Optimal progression, voice synthesis, and FAANG hiring committee scorecards.",
  },
  "/ai-learning": {
    title: "AI Learning Studio — Full-Screen Excalidraw AI Whiteboard & Visual Co-Teacher | DSA.viz.co",
    description:
      "Learn Data Structures & Algorithms on a full-screen interactive Excalidraw AI Whiteboard. Ask any query or speak aloud and watch the AI Co-Teacher draw, point with a live laser cursor, and simulate step by step.",
  },
  "/profile": {
    title: "Algorithmic Telemetry Profile & 52-Week Activity Dashboard — DSA.viz.co",
    description:
      "Inspect your unified DSA.viz and LeetCode telemetry, 52-week contribution heatmap, complexity radar, saved visualizer replays, and GitHub solution sync.",
  },
  "/auth": {
    title: "Sign In with Google — DSA.viz.co",
    description:
      "Authenticate with Google OAuth to access DSA.viz.co's 1,500+ interactive algorithm visualizers, curated DSA sheets, sandboxed C++20 compiler, and AI mock interviewer.",
  },
};

function GlobalVizcoBuddyIntegration() {
  const location = useLocation();
  const { updateContext } = useChat();
  const { user } = useAuth();

  useEffect(() => {
    if (typeof document !== "undefined") {
      const path = location.pathname;
      const origin = typeof window !== "undefined" ? window.location.origin : "https://dsa.viz.co";
      const fullUrl = `${origin}${path}`;

      // --- Dynamic title + description ---
      let seo = ROUTE_SEO_MAP[path];
      if (!seo && path.startsWith("/problem/")) {
        const slug = path.replace("/problem/", "").replace(/\/$/, "");
        const humanTitle = slug
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        seo = {
          title: `${humanTitle} — Step-by-Step Algorithm Visualizer & Solution Judge | DSA.viz.co`,
          description: `Interactive step-by-step visualization, C++/Java/Python/JS code judge, and Socratic AI complexity analysis for ${humanTitle} on DSA.viz.co.`,
        };
      }
      if (seo) {
        document.title = seo.title;
        const descTag = document.querySelector('meta[name="description"]');
        if (descTag) descTag.setAttribute("content", seo.description);
      }

      // --- Canonical + og:url ---
      const canonicalTag = document.querySelector('link[rel="canonical"]');
      if (canonicalTag) canonicalTag.setAttribute("href", fullUrl);
      const ogUrlTag = document.querySelector('meta[property="og:url"]');
      if (ogUrlTag) ogUrlTag.setAttribute("content", fullUrl);

      // --- noindex for auth-gated pages (protect crawl budget) ---
      const AUTH_GATED = ["/profile", "/auth"];
      let robotsTag = document.querySelector('meta[name="robots"]');
      if (!robotsTag) {
        robotsTag = document.createElement("meta");
        robotsTag.setAttribute("name", "robots");
        document.head.appendChild(robotsTag);
      }
      if (AUTH_GATED.includes(path)) {
        robotsTag.setAttribute("content", "noindex, nofollow");
      } else {
        robotsTag.setAttribute("content", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
      }

      // --- BreadcrumbList JSON-LD for problem pages ---
      const existingBreadcrumb = document.getElementById("ld-breadcrumb");
      if (existingBreadcrumb) existingBreadcrumb.remove();
      if (path.startsWith("/problem/")) {
        const slug = path.replace("/problem/", "").replace(/\/$/, "");
        const humanTitle = slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        const breadcrumbScript = document.createElement("script");
        breadcrumbScript.id = "ld-breadcrumb";
        breadcrumbScript.type = "application/ld+json";
        breadcrumbScript.textContent = JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": `${origin}/` },
            { "@type": "ListItem", "position": 2, "name": "Problems", "item": `${origin}/problems` },
            { "@type": "ListItem", "position": 3, "name": humanTitle, "item": fullUrl },
          ]
        });
        document.head.appendChild(breadcrumbScript);
      }
    }

    updateContext({
      route: location.pathname,
      pageTitle: typeof document !== "undefined" ? document.title : undefined,
    });
  }, [location.pathname, updateContext]);

  return (
    <>
      {user ? <VizcoCloudChatbox /> : null}
      <VizcoBuddy />
    </>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useThemeColor();

  useEffect(() => {
    try {
      const mode = localStorage.getItem("dsaviz:color_mode_print_tech") || "light";
      const theme = localStorage.getItem("dsaviz:theme_color") || "purple";
      document.documentElement.classList.remove("dark", "light");
      document.documentElement.classList.add(mode);
      document.documentElement.setAttribute("data-theme", theme);
    } catch {
      // Ignored
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* WCAG 2.1 AA Accessibility: Skip to main content landmark */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:shadow-xl focus:font-mono focus:text-xs focus:ring-2 focus:ring-primary-foreground"
      >
        Skip to main content
      </a>
      <AuthProvider>
        <ChatProvider>
          <CustomCursor />
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <AuthGuard>
            <Outlet />
          </AuthGuard>
          {/* 3D Floating Vizco Buddy & Cloud Chatbox across the entire website */}
          <GlobalVizcoBuddyIntegration />
          {/* GDPR / CCPA / DPDP Compliant Cookie Consent & Privacy Manager */}
          <CookieConsentBanner />
          <Toaster position="bottom-right" richColors closeButton />
        </ChatProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

