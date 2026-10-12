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
      {
        name: "description",
        content:
          "Master Data Structures & Algorithms by seeing how they think. Step through 1,500+ LeetCode interview problems frame by frame with live pointer animations, curated DSA sheets (Striver SDE, Blind 75, NeetCode 150), Socratic AI coaching, and sandboxed C++20, Java, and Python execution.",
      },
      {
        name: "keywords",
        content:
          "DSA visualizer, algorithm visualizer, data structures and algorithms visualizer, LeetCode visualizer, step by step algorithm animation, DSA sheets, Striver SDE sheet, Blind 75, NeetCode 150, Grind 75, Love Babbar 450, C++20 online compiler, Java online compiler, Python algorithm visualizer, AI mock coding interview, DSA.viz.co, dsavizco",
      },
      { name: "author", content: "DSA.viz.co" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { property: "og:site_name", content: "DSA.viz.co" },
      { property: "og:title", content: "DSA.viz.co — Master Algorithms by Seeing How They Think" },
      {
        property: "og:description",
        content:
          "Step through 1,500+ LeetCode interview problems frame by frame, inspect live pointer mutations and recursion stacks, practice curated DSA sheets, and run sandboxed C++20/Java/Python code.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/og-image.jpg" },
      { property: "og:image:secure_url", content: "/og-image.jpg" },
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
      { name: "twitter:image", content: "/og-image.jpg" },
      { name: "twitter:image:alt", content: "DSA.viz.co — Master algorithms by seeing how they think (Algorithms • Visualizer • Compiler)" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
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
      const canonicalTag = document.querySelector('link[rel="canonical"]');
      if (canonicalTag && typeof window !== "undefined") {
        canonicalTag.setAttribute("href", `${window.location.origin}${path}`);
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

