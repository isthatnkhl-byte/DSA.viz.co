import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { DSA_SHEETS, type DSASheet } from "@/data/sheets";
import {
  CheckCircle2,
  ChevronRight,
  LayoutList,
  Sparkles,
  Search,
  Check,
  Play,
  Flame,
  ExternalLink,
  Code2,
  Layers,
  Clock,
  Building2,
  ChevronDown,
  Star,
  Shuffle,
  Table2,
  LayoutGrid,
  FolderKanban,
  RotateCcw,
  Award,
  CheckCheck,
  ChevronsUpDown,
} from "lucide-react";
import {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useDeferredValue,
  useRef,
  memo,
} from "react";
import { problemBySlug, companyLabel } from "@/lib/problems";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { getUserSubmissions } from "@/lib/firestore-service";
import { toast } from "sonner";

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
  component: SheetsPage,
});

const SHEET_PAGE_SIZE = 80;

// Canonical topic grouping so sheets organize into clean, logical study modules
const CANONICAL_TOPIC_ORDER = [
  "Arrays & Hashing",
  "Two Pointers & Sliding Window",
  "Strings & Pattern Matching",
  "Binary Search",
  "Linked List",
  "Stacks & Queues",
  "Trees & BST",
  "Heaps & Priority Queue",
  "Backtracking & Recursion",
  "Tries & Design",
  "Graphs & Shortest Path",
  "Dynamic Programming",
  "Greedy & Intervals",
  "Bit Manipulation & Math",
] as const;

type CanonicalTopic = (typeof CANONICAL_TOPIC_ORDER)[number];

function categorizeTopic(rawTopics: string[], title: string, slug: string): CanonicalTopic {
  const joined = `${rawTopics.join(" ")} ${title} ${slug}`.toLowerCase();

  if (joined.includes("trie") || joined.includes("lru") || joined.includes("lfu") || joined.includes("design") || joined.includes("iterator") || joined.includes("data-stream")) {
    return "Tries & Design";
  }
  if (joined.includes("linked list") || joined.includes("linked-list") || joined.includes("listnode")) {
    return "Linked List";
  }
  if (
    joined.includes("binary search tree") ||
    joined.includes("bst") ||
    joined.includes("binary tree") ||
    joined.includes("binary-tree") ||
    joined.includes("tree") ||
    joined.includes("inorder") ||
    joined.includes("preorder") ||
    joined.includes("postorder") ||
    joined.includes("lowest-common-ancestor")
  ) {
    return "Trees & BST";
  }
  if (
    joined.includes("graph") ||
    joined.includes("island") ||
    joined.includes("topological") ||
    joined.includes("shortest path") ||
    joined.includes("dijkstra") ||
    joined.includes("bipartite") ||
    joined.includes("course-schedule") ||
    joined.includes("network-delay") ||
    joined.includes("rotting-oranges") ||
    joined.includes("word-ladder") ||
    joined.includes("union find") ||
    joined.includes("union-find") ||
    joined.includes("connected-components") ||
    joined.includes("cheapest-flights") ||
    joined.includes("pacific-atlantic")
  ) {
    return "Graphs & Shortest Path";
  }
  if (
    joined.includes("dynamic programming") ||
    joined.includes("knapsack") ||
    joined.includes("coin-change") ||
    joined.includes("climbing-stairs") ||
    joined.includes("house-robber") ||
    joined.includes("edit-distance") ||
    joined.includes("longest-increasing") ||
    joined.includes("longest-common-subsequence") ||
    joined.includes("decode-ways") ||
    joined.includes("unique-paths") ||
    joined.includes("partition-equal") ||
    joined.includes("word-break")
  ) {
    return "Dynamic Programming";
  }
  if (
    joined.includes("backtracking") ||
    joined.includes("n-queens") ||
    joined.includes("sudoku") ||
    joined.includes("permutations") ||
    joined.includes("combination-sum") ||
    joined.includes("subsets") ||
    joined.includes("word-search") ||
    joined.includes("palindrome-partitioning") ||
    joined.includes("rat-in-a-maze")
  ) {
    return "Backtracking & Recursion";
  }
  if (
    joined.includes("heap") ||
    joined.includes("priority queue") ||
    joined.includes("kth-largest") ||
    joined.includes("k-closest") ||
    joined.includes("top-k") ||
    joined.includes("task-scheduler") ||
    joined.includes("median-from-data-stream")
  ) {
    return "Heaps & Priority Queue";
  }
  if (
    joined.includes("stack") ||
    joined.includes("queue") ||
    joined.includes("parentheses") ||
    joined.includes("histogram") ||
    joined.includes("daily-temperatures") ||
    joined.includes("reverse-polish") ||
    joined.includes("asteroid") ||
    joined.includes("car-fleet")
  ) {
    return "Stacks & Queues";
  }
  if (
    joined.includes("binary search") ||
    joined.includes("binary-search") ||
    joined.includes("rotated-sorted") ||
    joined.includes("koko-eating") ||
    joined.includes("median-of-two-sorted") ||
    joined.includes("search-a-2d-matrix") ||
    joined.includes("find-peak") ||
    joined.includes("aggressive-cows") ||
    joined.includes("allocate-minimum")
  ) {
    return "Binary Search";
  }
  if (
    joined.includes("sliding window") ||
    joined.includes("two pointers") ||
    joined.includes("3sum") ||
    joined.includes("4sum") ||
    joined.includes("container-with-most-water") ||
    joined.includes("trapping-rain-water") ||
    joined.includes("minimum-window") ||
    joined.includes("repeating-character")
  ) {
    return "Two Pointers & Sliding Window";
  }
  if (
    joined.includes("interval") ||
    joined.includes("meeting-rooms") ||
    joined.includes("greedy") ||
    joined.includes("jump-game") ||
    joined.includes("gas-station") ||
    joined.includes("minimum-platforms") ||
    joined.includes("job-sequencing") ||
    joined.includes("activity-selection")
  ) {
    return "Greedy & Intervals";
  }
  if (
    joined.includes("bit manipulation") ||
    joined.includes("counting-bits") ||
    joined.includes("1-bits") ||
    joined.includes("reverse-bits") ||
    joined.includes("single-number") ||
    joined.includes("xor") ||
    joined.includes("powx-n") ||
    joined.includes("math")
  ) {
    return "Bit Manipulation & Math";
  }
  if (
    joined.includes("string") ||
    joined.includes("palindrome") ||
    joined.includes("anagram") ||
    joined.includes("rabin-karp") ||
    joined.includes("kmp")
  ) {
    return "Strings & Pattern Matching";
  }

  return "Arrays & Hashing";
}

interface EnrichedSheetProblem {
  slug: string;
  title: string;
  originalIndex: number;
  exists: boolean;
  difficulty: "Easy" | "Medium" | "Hard";
  difficultyLower: "easy" | "medium" | "hard";
  primaryTopic: string;
  moduleTopic: CanonicalTopic;
  companies: string[];
  searchBlob: string;
}

interface TopicModuleGroup {
  topic: CanonicalTopic;
  problems: EnrichedSheetProblem[];
}

interface EnrichedDSASheet extends DSASheet {
  enrichedProblems: EnrichedSheetProblem[];
  topicModules: TopicModuleGroup[];
  easyCount: number;
  mediumCount: number;
  hardCount: number;
}

// Pre-resolve problem metadata, canonical modules, and search blobs once at module load
const ENRICHED_SHEETS: EnrichedDSASheet[] = DSA_SHEETS.map((sheet) => {
  let easyCount = 0;
  let mediumCount = 0;
  let hardCount = 0;

  const moduleMap = new Map<CanonicalTopic, EnrichedSheetProblem[]>();
  for (const t of CANONICAL_TOPIC_ORDER) {
    moduleMap.set(t, []);
  }

  const enrichedProblems: EnrichedSheetProblem[] = sheet.problems.map((p, idx) => {
    const meta = problemBySlug(p.slug);
    const difficulty: "Easy" | "Medium" | "Hard" =
      meta?.difficulty === "Easy" || meta?.difficulty === "Medium" || meta?.difficulty === "Hard"
        ? meta.difficulty
        : "Medium";

    if (difficulty === "Easy") easyCount++;
    else if (difficulty === "Hard") hardCount++;
    else mediumCount++;

    const rawTopics = meta?.topics ?? [];
    const moduleTopic = categorizeTopic(rawTopics, p.title, p.slug);
    const primaryTopic = rawTopics[0] ?? moduleTopic;
    const topCompanies = (meta?.companies ?? [])
      .filter((c) => c !== "general-algorithms")
      .slice(0, 3)
      .map(companyLabel);

    const item: EnrichedSheetProblem = {
      slug: p.slug,
      title: p.title,
      originalIndex: idx,
      exists: meta !== null,
      difficulty,
      difficultyLower: difficulty.toLowerCase() as "easy" | "medium" | "hard",
      primaryTopic,
      moduleTopic,
      companies: topCompanies,
      searchBlob: `${p.title} ${p.slug} ${moduleTopic} ${rawTopics.join(" ")} ${topCompanies.join(" ")}`.toLowerCase(),
    };

    moduleMap.get(moduleTopic)?.push(item);
    return item;
  });

  const topicModules: TopicModuleGroup[] = [];
  for (const t of CANONICAL_TOPIC_ORDER) {
    const list = moduleMap.get(t) ?? [];
    if (list.length > 0) {
      topicModules.push({ topic: t, problems: list });
    }
  }

  return {
    ...sheet,
    enrichedProblems,
    topicModules,
    easyCount,
    mediumCount,
    hardCount,
  };
});

const ALL_UNIQUE_PROBLEMS: Map<string, "Easy" | "Medium" | "Hard"> = (() => {
  const map = new Map<string, "Easy" | "Medium" | "Hard">();
  for (const s of ENRICHED_SHEETS) {
    for (const p of s.enrichedProblems) {
      if (!map.has(p.slug)) {
        map.set(p.slug, p.difficulty);
      }
    }
  }
  return map;
})();

interface SheetTheme {
  shortName: string;
  tagline: string;
  accentBar: string;
  activeBorder: string;
  badge: string;
  text: string;
  iconBg: string;
  progressColor: string;
  targetDuration: string;
  topCompanies: string[];
}

const SHEET_THEMES: Record<string, SheetTheme> = {
  "striver-a2z": {
    shortName: "Striver's A2Z",
    tagline: "Complete Zero-to-Hero Syllabus",
    accentBar: "bg-emerald-500",
    activeBorder: "border-emerald-500/60 ring-1 ring-emerald-500/25",
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    text: "text-emerald-400",
    iconBg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    progressColor: "bg-emerald-500",
    targetDuration: "8–10 Weeks",
    topCompanies: ["Google", "Amazon", "Microsoft", "Uber"],
  },
  "blind-75": {
    shortName: "Blind 75",
    tagline: "High-ROI Core Essentials",
    accentBar: "bg-cyan-500",
    activeBorder: "border-cyan-500/60 ring-1 ring-cyan-500/25",
    badge: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    text: "text-cyan-400",
    iconBg: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    progressColor: "bg-cyan-500",
    targetDuration: "2–3 Weeks",
    topCompanies: ["Meta", "Google", "Apple", "Netflix"],
  },
  "neetcode-150": {
    shortName: "NeetCode 150",
    tagline: "Pattern-First Architecture",
    accentBar: "bg-violet-500",
    activeBorder: "border-violet-500/60 ring-1 ring-violet-500/25",
    badge: "bg-violet-500/15 text-violet-400 border-violet-500/30",
    text: "text-violet-400",
    iconBg: "bg-violet-500/15 text-violet-400 border-violet-500/30",
    progressColor: "bg-violet-500",
    targetDuration: "5–6 Weeks",
    topCompanies: ["Amazon", "Google", "Meta", "Bloomberg"],
  },
  "grind-75": {
    shortName: "Grind 75",
    tagline: "Priority-Ordered Sprint",
    accentBar: "bg-sky-500",
    activeBorder: "border-sky-500/60 ring-1 ring-sky-500/25",
    badge: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    text: "text-sky-400",
    iconBg: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    progressColor: "bg-sky-500",
    targetDuration: "3–4 Weeks",
    topCompanies: ["Meta", "Stripe", "Airbnb", "OpenAI"],
  },
  "sean-prasad": {
    shortName: "Sean Prasad",
    tagline: "170+ Algorithmic Patterns",
    accentBar: "bg-amber-500",
    activeBorder: "border-amber-500/60 ring-1 ring-amber-500/25",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    text: "text-amber-400",
    iconBg: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    progressColor: "bg-amber-500",
    targetDuration: "4–5 Weeks",
    topCompanies: ["Microsoft", "Uber", "ByteDance", "Citadel"],
  },
  "love-babbar": {
    shortName: "Love Babbar 450",
    tagline: "SDE Placement Cracker",
    accentBar: "bg-rose-500",
    activeBorder: "border-rose-500/60 ring-1 ring-rose-500/25",
    badge: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    text: "text-rose-400",
    iconBg: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    progressColor: "bg-rose-500",
    targetDuration: "8–12 Weeks",
    topCompanies: ["Amazon", "Adobe", "Walmart", "Goldman Sachs"],
  },
  "apna-college": {
    shortName: "Apna College",
    tagline: "Placement & Campus Track",
    accentBar: "bg-teal-500",
    activeBorder: "border-teal-500/60 ring-1 ring-teal-500/25",
    badge: "bg-teal-500/15 text-teal-400 border-teal-500/30",
    text: "text-teal-400",
    iconBg: "bg-teal-500/15 text-teal-400 border-teal-500/30",
    progressColor: "bg-teal-500",
    targetDuration: "6–8 Weeks",
    topCompanies: ["Google", "Microsoft", "Atlassian", "Salesforce"],
  },
};

const DEFAULT_THEME: SheetTheme = {
  shortName: "Roadmap",
  tagline: "Curated Interview Sheet",
  accentBar: "bg-primary",
  activeBorder: "border-primary/60 ring-1 ring-primary/25",
  badge: "bg-primary/15 text-primary border-primary/30",
  text: "text-primary",
  iconBg: "bg-primary/15 text-primary border-primary/30",
  progressColor: "bg-primary",
  targetDuration: "4 Weeks",
  topCompanies: ["Top Tech"],
};

function getLocalSolvedSlugs(): Set<string> {
  const solved = new Set<string>();
  if (typeof window === "undefined") return solved;

  // 1. Manual checkmark storage
  try {
    const rawManual = window.localStorage.getItem("dsaviz:manual_solved_v1");
    if (rawManual) {
      const arr = JSON.parse(rawManual);
      if (Array.isArray(arr)) {
        arr.forEach((slug) => {
          if (typeof slug === "string") solved.add(slug);
        });
      }
    }
  } catch {
    // ignore
  }

  // 2. Automated attempts storage
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith("dsaviz:attempt:")) {
        const slug = key.replace("dsaviz:attempt:", "");
        const raw = window.localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (
            parsed?.result?.is_complete ||
            parsed?.result?.classification === "Optimal" ||
            parsed?.result?.classification === "Better" ||
            parsed?.result?.classification === "Brute Force" ||
            parsed?.result
          ) {
            solved.add(slug);
          }
        }
      }
    }
  } catch {
    // ignore
  }

  return solved;
}

function saveManualSolved(solved: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("dsaviz:manual_solved_v1", JSON.stringify(Array.from(solved)));
  } catch {
    // ignore
  }
}

function getStarredSlugs(): Set<string> {
  const starred = new Set<string>();
  if (typeof window === "undefined") return starred;
  try {
    const raw = window.localStorage.getItem("dsaviz:starred_problems_v1");
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach((s) => {
          if (typeof s === "string") starred.add(s);
        });
      }
    }
  } catch {
    // ignore
  }
  return starred;
}

function saveStarredSlugs(starred: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("dsaviz:starred_problems_v1", JSON.stringify(Array.from(starred)));
  } catch {
    // ignore
  }
}

type ViewMode = "modules" | "table" | "cards";
type StatusFilter = "all" | "unsolved" | "solved" | "starred";
type DifficultyFilter = "all" | "easy" | "medium" | "hard";

function SheetsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [solvedSlugs, setSolvedSlugs] = useState<Set<string>>(() => new Set());
  const [verifiedFirebaseSlugs, setVerifiedFirebaseSlugs] = useState<Set<string>>(() => new Set());
  const [starredSlugs, setStarredSlugs] = useState<Set<string>>(() => new Set());

  // Default to the first curated sheet ("striver-a2z") for immediate focused accessibility,
  // or allow "all-overview" to compare all 7 sheets side by side.
  const [selectedSheetId, setSelectedSheetId] = useState<string>("neetcode-150");
  const [viewMode, setViewMode] = useState<ViewMode>("modules");
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const deferredSearch = useDeferredValue(searchQuery);
  const [randomPickedProblem, setRandomPickedProblem] = useState<EnrichedSheetProblem | null>(null);

  const heroSearchInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const randomSpotlightRef = useRef<HTMLDivElement | null>(null);

  // Load local solved & starred state
  useEffect(() => {
    setSolvedSlugs(getLocalSolvedSlugs());
    setStarredSlugs(getStarredSlugs());
  }, []);

  // Sync Firebase submissions so solved problems from DSA.viz compiler/judge reflect automatically
  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    getUserSubmissions(user.uid)
      .then((subs) => {
        if (cancelled) return;
        const fbSlugs = new Set<string>();
        for (const sub of subs) {
          if (sub.problemSlug && (sub.allPassed || sub.classification !== "Incorrect")) {
            fbSlugs.add(sub.problemSlug);
          }
        }
        if (fbSlugs.size > 0) {
          setVerifiedFirebaseSlugs(fbSlugs);
          setSolvedSlugs((prev) => {
            const merged = new Set(prev);
            fbSlugs.forEach((s) => merged.add(s));
            return merged;
          });
        }
      })
      .catch(() => {
        // non-fatal
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const toggleSolvedSlug = useCallback((slug: string) => {
    setSolvedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
        toast.info("Marked problem as unsolved");
      } else {
        next.add(slug);
        toast.success("Marked problem as solved! 🎯");
      }
      saveManualSolved(next);
      return next;
    });
  }, []);

  const toggleStarredSlug = useCallback((slug: string) => {
    setStarredSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
        toast.info("Removed from revision bookmarks");
      } else {
        next.add(slug);
        toast.success("Starred for revision ★");
      }
      saveStarredSlugs(next);
      return next;
    });
  }, []);

  // Global telemetry across all unique problems in the 7 sheets
  const globalStats = useMemo(() => {
    let totalEasy = 0;
    let totalMedium = 0;
    let totalHard = 0;
    let solvedEasy = 0;
    let solvedMedium = 0;
    let solvedHard = 0;

    ALL_UNIQUE_PROBLEMS.forEach((diff, slug) => {
      const isSolved = solvedSlugs.has(slug);
      if (diff === "Easy") {
        totalEasy++;
        if (isSolved) solvedEasy++;
      } else if (diff === "Hard") {
        totalHard++;
        if (isSolved) solvedHard++;
      } else {
        totalMedium++;
        if (isSolved) solvedMedium++;
      }
    });

    const totalUnique = ALL_UNIQUE_PROBLEMS.size;
    const totalSolved = solvedEasy + solvedMedium + solvedHard;
    const completionPercent = totalUnique > 0 ? Math.round((totalSolved / totalUnique) * 100) : 0;

    return {
      totalSheets: ENRICHED_SHEETS.length,
      totalUnique,
      totalSolved,
      completionPercent,
      totalEasy,
      totalMedium,
      totalHard,
      solvedEasy,
      solvedMedium,
      solvedHard,
      starredCount: starredSlugs.size,
    };
  }, [solvedSlugs, starredSlugs]);

  // Per-sheet summary stats for the 7 Sheet Selector Cards
  const sheetSummaries = useMemo(() => {
    return ENRICHED_SHEETS.map((sheet) => {
      let solvedCount = 0;
      let firstUnsolved: EnrichedSheetProblem | null = null;
      for (const p of sheet.enrichedProblems) {
        if (solvedSlugs.has(p.slug)) {
          solvedCount++;
        } else if (!firstUnsolved) {
          firstUnsolved = p;
        }
      }
      const total = sheet.enrichedProblems.length;
      const pct = total > 0 ? Math.round((solvedCount / total) * 100) : 0;
      return {
        sheet,
        theme: SHEET_THEMES[sheet.id] ?? DEFAULT_THEME,
        total,
        solvedCount,
        pct,
        firstUnsolved,
      };
    });
  }, [solvedSlugs]);

  const activeSheetSummary = useMemo(() => {
    return (
      sheetSummaries.find((s) => s.sheet.id === selectedSheetId) ?? sheetSummaries[0]!
    );
  }, [sheetSummaries, selectedSheetId]);

  const activeSheet = activeSheetSummary.sheet;
  const activeTheme = activeSheetSummary.theme;

  // Reset topic filter if user switches sheets and topic isn't present
  const handleSelectSheet = useCallback((sheetId: string) => {
    setSelectedSheetId(sheetId);
    setTopicFilter("all");
    setRandomPickedProblem(null);
  }, []);

  // Focus search input and bring workspace into view
  const handleFocusSearch = useCallback(() => {
    if (searchInputRef.current) {
      searchInputRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 150);
    } else if (heroSearchInputRef.current) {
      heroSearchInputRef.current.focus();
      heroSearchInputRef.current.select();
    }
  }, []);

  // Pick a random unsolved problem in the active sheet (respecting active topic/difficulty filters)
  const handlePickRandomUnsolved = useCallback(() => {
    const filteredUnsolved = activeSheet.enrichedProblems.filter((p) => {
      if (solvedSlugs.has(p.slug)) return false;
      if (topicFilter !== "all" && p.moduleTopic !== topicFilter) return false;
      if (difficultyFilter !== "all" && p.difficultyLower !== difficultyFilter) return false;
      if (randomPickedProblem && p.slug === randomPickedProblem.slug) return false;
      return true;
    });

    const anyUnsolved = activeSheet.enrichedProblems.filter(
      (p) => !solvedSlugs.has(p.slug) && (!randomPickedProblem || p.slug !== randomPickedProblem.slug)
    );

    const pool =
      filteredUnsolved.length > 0
        ? filteredUnsolved
        : anyUnsolved.length > 0
          ? anyUnsolved
          : activeSheet.enrichedProblems;

    if (pool.length === 0) return;
    const chosen = pool[Math.floor(Math.random() * pool.length)]!;
    setRandomPickedProblem(chosen);

    toast.success(`Random Pick: ${chosen.title} (${chosen.difficulty})`, {
      description: `${activeTheme.shortName} • ${chosen.moduleTopic}`,
      action: {
        label: "Visualize ↗",
        onClick: () => navigate({ to: "/problem/$slug", params: { slug: chosen.slug } }),
      },
    });

    setTimeout(() => {
      if (randomSpotlightRef.current) {
        randomSpotlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (workspaceRef.current) {
        workspaceRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 80);
  }, [activeSheet, activeTheme.shortName, solvedSlugs, topicFilter, difficultyFilter, randomPickedProblem, navigate]);

  // Keyboard shortcuts: '/' focuses search, 'r' or 'R' (when not typing) picks random unsolved
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (e.key === "/" && !isInput) {
        e.preventDefault();
        handleFocusSearch();
      } else if ((e.key === "r" || e.key === "R") && !isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handlePickRandomUnsolved();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleFocusSearch, handlePickRandomUnsolved]);

  const hasActiveFilters =
    difficultyFilter !== "all" ||
    statusFilter !== "all" ||
    topicFilter !== "all" ||
    deferredSearch.trim().length > 0;

  const resetAllFilters = useCallback(() => {
    setDifficultyFilter("all");
    setStatusFilter("all");
    setTopicFilter("all");
    setSearchQuery("");
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      <SiteHeader />

      <main id="main-content" className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* =====================================================================
            TIER 1: EXECUTIVE BENTO HEADER & GLOBAL MASTERY TELEMETRY
        ===================================================================== */}
        <section
          aria-label="DSA Sheets Overview"
          className="grid grid-cols-1 lg:grid-cols-12 gap-4"
        >
          {/* Left 8-Col Hero & Quick Actions */}
          <div className="lg:col-span-8 relative overflow-hidden rounded-2xl border border-border/80 bg-card/90 p-6 sm:p-7 shadow-lg flex flex-col justify-between">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-accent to-emerald-400" />
            <div className="absolute -left-24 -top-24 size-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-primary">
                  <Sparkles className="size-3" />
                  <span>7 Curated Interview Roadmaps • Topic-Grouped</span>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <button
                    type="button"
                    onClick={handleFocusSearch}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-secondary/60 hover:bg-secondary hover:border-primary/50 text-muted-foreground hover:text-foreground px-2.5 py-1 transition-all cursor-pointer"
                    title="Jump to problem search (Shortcut: /)"
                  >
                    <Search className="size-3 text-primary" />
                    <kbd className="rounded bg-background/80 px-1 py-0.2 font-bold text-foreground border border-border/60">/</kbd>
                    <span className="font-bold">Search</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePickRandomUnsolved}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-secondary/60 hover:bg-secondary hover:border-accent/50 text-muted-foreground hover:text-foreground px-2.5 py-1 transition-all cursor-pointer"
                    title="Pick a random unsolved problem (Shortcut: R)"
                  >
                    <Shuffle className="size-3 text-accent" />
                    <kbd className="rounded bg-background/80 px-1 py-0.2 font-bold text-foreground border border-border/60">R</kbd>
                    <span className="font-bold">Random Unsolved</span>
                  </button>
                </div>
              </div>

              <div>
                <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground">
                  Structured{" "}
                  <span className="bg-gradient-to-r from-primary via-accent to-emerald-400 bg-clip-text text-transparent">
                    DSA Sheets & Pattern Tracks
                  </span>
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground max-w-3xl leading-relaxed">
                  Navigate industry-standard interview sheets organized into canonical algorithmic modules. Syncs automatically with your platform submissions, with 1-click access to interactive visualizers, compiler sandboxes, and revision bookmarks.
                </p>
              </div>
            </div>

            {/* Bottom Quick Action & Instant Search Strip inside Hero */}
            <div className="relative z-10 mt-6 pt-4 border-t border-border/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                {activeSheetSummary.firstUnsolved && (
                  <Link
                    to="/problem/$slug"
                    params={{ slug: activeSheetSummary.firstUnsolved.slug }}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 font-mono text-xs font-bold shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all"
                  >
                    <Play className="size-3.5 fill-current" />
                    <span>Resume {activeTheme.shortName}:</span>
                    <span className="underline decoration-primary-foreground/50 underline-offset-2 truncate max-w-[160px] sm:max-w-[210px]">
                      {activeSheetSummary.firstUnsolved.title}
                    </span>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handlePickRandomUnsolved}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-accent/40 bg-accent/10 hover:bg-accent/20 text-foreground px-3.5 py-2 font-mono text-xs font-bold transition-colors cursor-pointer"
                  title="Pick a random unsolved problem from the current sheet (Shortcut: R)"
                >
                  <Shuffle className="size-3.5 text-accent" />
                  <span>Pick Random Unsolved</span>
                </button>
              </div>

              {/* Instant Search Input right inside the Hero */}
              <div className="relative w-full sm:w-64 md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-primary pointer-events-none" />
                <Input
                  ref={heroSearchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && workspaceRef.current) {
                      workspaceRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }}
                  placeholder={`Quick search ${activeTheme.shortName}...`}
                  aria-label="Quick search problems across sheets"
                  className="h-9 pl-8.5 pr-7 rounded-xl bg-background/90 border-border/80 text-xs font-mono"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right 4-Col Global Telemetry & Difficulty Matrix Card */}
          <div className="lg:col-span-4 rounded-2xl border border-border/80 bg-card/90 p-5 sm:p-6 shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5">
                  <Flame className="size-3.5 text-primary" /> Global Sheet Mastery
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter((prev) => (prev === "starred" ? "all" : "starred"));
                  }}
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold transition-colors ${
                    statusFilter === "starred"
                      ? "border-amber-400/60 bg-amber-500/20 text-amber-300"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                  }`}
                  title="Filter by starred revision problems"
                >
                  <Star className="size-3 fill-amber-400 text-amber-400" />
                  <span>{globalStats.starredCount} Starred</span>
                </button>
              </div>

              <div className="flex items-baseline justify-between mb-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-3xl font-black text-foreground">
                    {globalStats.totalSolved}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    / {globalStats.totalUnique} unique solved
                  </span>
                </div>
                <span className="font-mono text-sm font-black text-primary">
                  {globalStats.completionPercent}%
                </span>
              </div>

              <Progress
                value={globalStats.completionPercent}
                className="h-2.5 w-full bg-secondary mb-4"
              />
            </div>

            {/* Easy / Medium / Hard Mini Breakdown */}
            <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-border/60 font-mono">
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-2.5">
                <div className="flex items-center justify-between text-[10px] text-emerald-400 font-bold">
                  <span>EASY</span>
                  <span>
                    {globalStats.totalEasy > 0
                      ? Math.round((globalStats.solvedEasy / globalStats.totalEasy) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <div className="text-sm font-black text-foreground mt-1">
                  {globalStats.solvedEasy}
                  <span className="text-[10px] font-normal text-muted-foreground">
                    /{globalStats.totalEasy}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-2.5">
                <div className="flex items-center justify-between text-[10px] text-amber-400 font-bold">
                  <span>MED</span>
                  <span>
                    {globalStats.totalMedium > 0
                      ? Math.round((globalStats.solvedMedium / globalStats.totalMedium) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <div className="text-sm font-black text-foreground mt-1">
                  {globalStats.solvedMedium}
                  <span className="text-[10px] font-normal text-muted-foreground">
                    /{globalStats.totalMedium}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-2.5">
                <div className="flex items-center justify-between text-[10px] text-rose-400 font-bold">
                  <span>HARD</span>
                  <span>
                    {globalStats.totalHard > 0
                      ? Math.round((globalStats.solvedHard / globalStats.totalHard) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <div className="text-sm font-black text-foreground mt-1">
                  {globalStats.solvedHard}
                  <span className="text-[10px] font-normal text-muted-foreground">
                    /{globalStats.totalHard}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            TIER 2: INTERACTIVE SHEET SELECTOR DECK (ALL 7 SHEETS)
        ===================================================================== */}
        <section aria-label="Select a Curated DSA Sheet" className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              <h2 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Select Roadmap Track ({sheetSummaries.length} Curated Sheets)
              </h2>
            </div>
            <span className="font-mono text-[11px] text-muted-foreground hidden sm:inline">
              Click any track card to switch your active workspace
            </span>
          </div>

          <div
            role="tablist"
            aria-label="Curated DSA Sheets"
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2.5"
          >
            {sheetSummaries.map(({ sheet, theme, total, solvedCount, pct }) => {
              const isSelected = sheet.id === activeSheet.id;
              return (
                <button
                  key={sheet.id}
                  role="tab"
                  aria-selected={isSelected}
                  type="button"
                  onClick={() => handleSelectSheet(sheet.id)}
                  className={`group relative text-left rounded-xl border p-3.5 transition-all flex flex-col justify-between overflow-hidden ${
                    isSelected
                      ? `bg-card shadow-md ${theme.activeBorder}`
                      : "border-border/70 bg-card/55 hover:bg-card/90 hover:border-border"
                  }`}
                >
                  {/* Top colored bar */}
                  <div
                    className={`absolute inset-x-0 top-0 h-1 transition-opacity ${theme.accentBar} ${
                      isSelected ? "opacity-100" : "opacity-40 group-hover:opacity-80"
                    }`}
                  />

                  <div>
                    <div className="flex items-start justify-between gap-1.5 mt-0.5">
                      <span
                        className={`font-display text-sm font-black leading-snug ${
                          isSelected ? "text-foreground" : "text-foreground/90 group-hover:text-foreground"
                        }`}
                      >
                        {theme.shortName}
                      </span>
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold border ${theme.badge}`}
                      >
                        {total}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">
                      {theme.tagline}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-border/50 space-y-1.5 w-full">
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="text-muted-foreground">
                        {solvedCount}/{total}
                      </span>
                      <span className={`font-bold ${isSelected ? theme.text : "text-foreground"}`}>
                        {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${theme.progressColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* =====================================================================
            TIER 3: ACTIVE SHEET WORKSPACE
        ===================================================================== */}
        <section
          ref={workspaceRef}
          aria-label={`${activeSheet.name} Workspace`}
          className="rounded-2xl border border-border/80 bg-card/90 shadow-xl overflow-hidden"
        >
          {/* Active Sheet Banner Header */}
          <div className="relative border-b border-border/70 bg-secondary/20 p-5 sm:p-6">
            <div className={`absolute inset-x-0 top-0 h-1 ${activeTheme.accentBar}`} />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="space-y-2 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${activeTheme.badge}`}
                  >
                    <Award className="size-3" />
                    {activeTheme.tagline}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-background/70 px-2.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    <Clock className="size-3 text-primary" /> {activeTheme.targetDuration}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-background/70 px-2.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    <Building2 className="size-3 text-accent" />{" "}
                    {activeTheme.topCompanies.join(" • ")}
                  </span>
                </div>

                <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-black text-foreground">
                  {activeSheet.name}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {activeSheet.description}
                </p>
              </div>

              {/* Active Sheet Progress & Difficulty Pills */}
              <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-between gap-3 shrink-0 lg:w-80 rounded-xl border border-border/70 bg-background/80 p-4">
                <div className="w-full space-y-1.5 font-mono">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-semibold">Sheet Progress</span>
                    <span className={`font-black ${activeTheme.text}`}>
                      {activeSheetSummary.solvedCount} / {activeSheetSummary.total} (
                      {activeSheetSummary.pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${activeTheme.progressColor}`}
                      style={{ width: `${activeSheetSummary.pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1 font-mono text-[10px]">
                  <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-bold text-emerald-400">
                    {activeSheet.easyCount} Easy
                  </span>
                  <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-bold text-amber-400">
                    {activeSheet.mediumCount} Med
                  </span>
                  <span className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 font-bold text-rose-400">
                    {activeSheet.hardCount} Hard
                  </span>
                  <span className="rounded-md border border-border/70 bg-secondary/60 px-2 py-0.5 font-bold text-muted-foreground">
                    {activeSheet.topicModules.length} Modules
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Topic Module Pills Strip */}
            <div className="mt-5 pt-4 border-t border-border/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Filter by Topic Module ({activeSheet.topicModules.length} Patterns)
                </span>
                {topicFilter !== "all" && (
                  <button
                    type="button"
                    onClick={() => setTopicFilter("all")}
                    className="text-[10px] font-mono font-bold text-primary hover:underline"
                  >
                    Show All Modules
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTopicFilter("all")}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[11px] font-bold transition-all ${
                    topicFilter === "all"
                      ? "border-primary bg-primary text-primary-foreground shadow-xs"
                      : "border-border/70 bg-background/70 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
                >
                  <span>All Topics</span>
                  <span
                    className={`rounded px-1 py-0.2 text-[9px] ${
                      topicFilter === "all"
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {activeSheet.enrichedProblems.length}
                  </span>
                </button>

                {activeSheet.topicModules.map((mod) => {
                  const modSolved = mod.problems.filter((p) => solvedSlugs.has(p.slug)).length;
                  const isModActive = topicFilter === mod.topic;
                  const isModComplete =
                    mod.problems.length > 0 && modSolved === mod.problems.length;

                  return (
                    <button
                      key={mod.topic}
                      type="button"
                      onClick={() =>
                        setTopicFilter((prev) => (prev === mod.topic ? "all" : mod.topic))
                      }
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[11px] transition-all ${
                        isModActive
                          ? "border-primary bg-primary text-primary-foreground font-bold shadow-xs"
                          : isModComplete
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
                            : "border-border/70 bg-background/70 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                      }`}
                    >
                      {isModComplete && !isModActive && (
                        <Check className="size-3 text-emerald-400 stroke-[3]" />
                      )}
                      <span>{mod.topic}</span>
                      <span
                        className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                          isModActive
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-secondary/90 text-muted-foreground"
                        }`}
                      >
                        {modSolved}/{mod.problems.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* =====================================================================
              STICKY ERGONOMIC COMMAND BAR: SEARCH, DIFFICULTY, STATUS, VIEW MODE
          ===================================================================== */}
          <div className="sticky top-0 z-20 border-b border-border/70 bg-card/95 backdrop-blur-md px-4 py-3 sm:px-6">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              {/* Left: Search Input + Difficulty + Status Filters */}
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {/* Search Box */}
                <div className="relative w-full sm:w-64 md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search in ${activeTheme.shortName}... ( / )`}
                    aria-label={`Search problems in ${activeSheet.name}`}
                    className="h-8 pl-8 pr-7 rounded-lg bg-background/90 border-border/80 text-xs font-mono"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear search query"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground hover:text-foreground"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Difficulty Segmented Filter */}
                <div
                  role="group"
                  aria-label="Filter by difficulty"
                  className="inline-flex items-center rounded-lg border border-border/80 bg-background/80 p-0.5 font-mono text-[11px]"
                >
                  {(
                    [
                      { id: "all", label: "All Diff" },
                      { id: "easy", label: "Easy", activeCls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
                      { id: "medium", label: "Med", activeCls: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
                      { id: "hard", label: "Hard", activeCls: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
                    ] as const
                  ).map((d) => {
                    const active = difficultyFilter === d.id;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDifficultyFilter(d.id)}
                        className={`h-7 px-2.5 rounded-md font-bold transition-all ${
                          active
                            ? "activeCls" in d
                              ? `${d.activeCls} border`
                              : "bg-secondary text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>

                {/* Status Segmented Filter */}
                <div
                  role="group"
                  aria-label="Filter by completion status"
                  className="inline-flex items-center rounded-lg border border-border/80 bg-background/80 p-0.5 font-mono text-[11px]"
                >
                  {(
                    [
                      { id: "all", label: "All" },
                      { id: "unsolved", label: "Unsolved" },
                      { id: "solved", label: "Solved" },
                      { id: "starred", label: "★ Starred" },
                    ] as const
                  ).map((st) => {
                    const active = statusFilter === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setStatusFilter(st.id)}
                        className={`h-7 px-2.5 rounded-md font-bold transition-all whitespace-nowrap ${
                          active
                            ? st.id === "starred"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : st.id === "solved"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-primary/20 text-primary border border-primary/30"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {st.label}
                      </button>
                    );
                  })}
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-border/70 bg-secondary/50 hover:bg-secondary font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RotateCcw className="size-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* Right: View Mode Switcher (Modules / Table / Cards) */}
              <div className="flex items-center justify-between sm:justify-end gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground hidden sm:inline">
                  Layout:
                </span>
                <div
                  role="tablist"
                  aria-label="Layout view mode"
                  className="inline-flex items-center rounded-lg border border-border/80 bg-background/80 p-0.5 font-mono text-[11px]"
                >
                  <button
                    role="tab"
                    aria-selected={viewMode === "modules"}
                    type="button"
                    onClick={() => setViewMode("modules")}
                    className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md font-bold transition-all ${
                      viewMode === "modules"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <FolderKanban className="size-3.5" />
                    <span>Topic Modules</span>
                  </button>
                  <button
                    role="tab"
                    aria-selected={viewMode === "table"}
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md font-bold transition-all ${
                      viewMode === "table"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Table2 className="size-3.5" />
                    <span>Table</span>
                  </button>
                  <button
                    role="tab"
                    aria-selected={viewMode === "cards"}
                    type="button"
                    onClick={() => setViewMode("cards")}
                    className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md font-bold transition-all ${
                      viewMode === "cards"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <LayoutGrid className="size-3.5" />
                    <span>Cards</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* =====================================================================
              RANDOM PICK SPOTLIGHT BANNER (WHEN TRIGGERED)
          ===================================================================== */}
          {randomPickedProblem && (
            <div
              ref={randomSpotlightRef}
              className="mx-4 mt-4 sm:mx-6 rounded-xl border border-accent/50 bg-accent/[0.08] p-4 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="size-9 rounded-lg border border-accent/40 bg-accent/20 text-accent flex items-center justify-center shrink-0">
                  <Shuffle className="size-4" />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
                    <span className="uppercase tracking-wider font-bold text-accent">
                      Random Unsolved Pick
                    </span>
                    <span className="text-muted-foreground">
                      #{randomPickedProblem.originalIndex + 1}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.2 font-bold border ${
                        randomPickedProblem.difficulty === "Easy"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : randomPickedProblem.difficulty === "Hard"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      }`}
                    >
                      {randomPickedProblem.difficulty}
                    </span>
                    <span className="rounded bg-secondary/80 border border-border/70 px-1.5 py-0.2 text-muted-foreground">
                      {randomPickedProblem.moduleTopic}
                    </span>
                  </div>
                  <Link
                    to="/problem/$slug"
                    params={{ slug: randomPickedProblem.slug }}
                    className="block font-display text-base sm:text-lg font-black text-foreground hover:text-primary transition-colors break-words"
                  >
                    {randomPickedProblem.title}
                  </Link>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Link
                  to="/problem/$slug"
                  params={{ slug: randomPickedProblem.slug }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3.5 py-1.5 font-mono text-xs font-bold shadow-xs hover:bg-primary/90 transition-colors"
                >
                  <Play className="size-3 fill-current" />
                  <span>Visualize Now</span>
                </Link>
                <Link
                  to="/compiler"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background/80 hover:bg-secondary text-foreground px-3 py-1.5 font-mono text-xs font-bold transition-colors"
                >
                  <Code2 className="size-3.5 text-primary" />
                  <span>Compiler</span>
                </Link>
                <button
                  type="button"
                  onClick={handlePickRandomUnsolved}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/15 hover:bg-accent/25 text-foreground px-3 py-1.5 font-mono text-xs font-bold transition-colors cursor-pointer"
                >
                  <Shuffle className="size-3.5 text-accent" />
                  <span>Roll Another</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleSolvedSlug(randomPickedProblem.slug)}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-2.5 py-1.5 font-mono text-xs font-bold transition-colors cursor-pointer"
                >
                  <Check className="size-3.5" />
                  <span>{solvedSlugs.has(randomPickedProblem.slug) ? "Solved" : "Mark Solved"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRandomPickedProblem(null)}
                  aria-label="Dismiss random pick"
                  className="rounded-lg border border-border/70 bg-background/60 hover:bg-secondary px-2 py-1.5 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* =====================================================================
              ACTIVE SHEET CONTENT BODY
          ===================================================================== */}
          <ActiveSheetContent
            sheet={activeSheet}
            theme={activeTheme}
            viewMode={viewMode}
            difficultyFilter={difficultyFilter}
            statusFilter={statusFilter}
            topicFilter={topicFilter}
            searchFilter={deferredSearch}
            solvedSlugs={solvedSlugs}
            verifiedFirebaseSlugs={verifiedFirebaseSlugs}
            starredSlugs={starredSlugs}
            onToggleSolved={toggleSolvedSlug}
            onToggleStarred={toggleStarredSlug}
            onResetFilters={resetAllFilters}
            onSelectSheet={handleSelectSheet}
          />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function ActiveSheetContent({
  sheet,
  theme,
  viewMode,
  difficultyFilter,
  statusFilter,
  topicFilter,
  searchFilter,
  solvedSlugs,
  verifiedFirebaseSlugs,
  starredSlugs,
  onToggleSolved,
  onToggleStarred,
  onResetFilters,
  onSelectSheet,
}: {
  sheet: EnrichedDSASheet;
  theme: SheetTheme;
  viewMode: ViewMode;
  difficultyFilter: DifficultyFilter;
  statusFilter: StatusFilter;
  topicFilter: string;
  searchFilter: string;
  solvedSlugs: Set<string>;
  verifiedFirebaseSlugs: Set<string>;
  starredSlugs: Set<string>;
  onToggleSolved: (slug: string) => void;
  onToggleStarred: (slug: string) => void;
  onResetFilters: () => void;
  onSelectSheet: (sheetId: string) => void;
}) {
  const [visibleCount, setVisibleCount] = useState<number>(SHEET_PAGE_SIZE);
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(SHEET_PAGE_SIZE);
  }, [sheet.id, difficultyFilter, statusFilter, topicFilter, searchFilter, viewMode]);

  const matchesFilter = useCallback(
    (p: EnrichedSheetProblem, query: string) => {
      if (topicFilter !== "all" && p.moduleTopic !== topicFilter) return false;
      if (difficultyFilter !== "all" && p.difficultyLower !== difficultyFilter) return false;
      if (statusFilter !== "all") {
        const isSolved = solvedSlugs.has(p.slug);
        if (statusFilter === "solved" && !isSolved) return false;
        if (statusFilter === "unsolved" && isSolved) return false;
        if (statusFilter === "starred" && !starredSlugs.has(p.slug)) return false;
      }
      if (query && !p.searchBlob.includes(query)) return false;
      return true;
    },
    [topicFilter, difficultyFilter, statusFilter, solvedSlugs, starredSlugs]
  );

  const query = useMemo(() => (searchFilter ? searchFilter.trim().toLowerCase() : ""), [searchFilter]);

  const filteredFlat = useMemo(() => {
    return sheet.enrichedProblems.filter((p) => matchesFilter(p, query));
  }, [sheet.enrichedProblems, matchesFilter, query]);

  const filteredModules = useMemo(() => {
    const groups: TopicModuleGroup[] = [];
    for (const mod of sheet.topicModules) {
      if (topicFilter !== "all" && mod.topic !== topicFilter) continue;
      const matching = mod.problems.filter((p) => matchesFilter(p, query));
      if (matching.length > 0) {
        groups.push({ topic: mod.topic, problems: matching });
      }
    }
    return groups;
  }, [sheet.topicModules, topicFilter, matchesFilter, query]);

  // Cross-sheet search matches when query is active
  const otherSheetMatches = useMemo(() => {
    if (!query) return [];
    const results: Array<{ id: string; shortName: string; count: number; badge: string }> = [];
    for (const other of ENRICHED_SHEETS) {
      if (other.id === sheet.id) continue;
      const count = other.enrichedProblems.filter((p) => p.searchBlob.includes(query)).length;
      if (count > 0) {
        const t = SHEET_THEMES[other.id] ?? DEFAULT_THEME;
        results.push({ id: other.id, shortName: t.shortName, count, badge: t.badge });
      }
    }
    return results;
  }, [query, sheet.id]);

  const visibleFlat = useMemo(
    () => filteredFlat.slice(0, visibleCount),
    [filteredFlat, visibleCount]
  );
  const hasMoreFlat = visibleCount < filteredFlat.length;

  useEffect(() => {
    if (viewMode === "modules" || !hasMoreFlat) return;
    const node = loadMoreRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + SHEET_PAGE_SIZE, filteredFlat.length));
        }
      },
      { rootMargin: "400px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [viewMode, hasMoreFlat, filteredFlat.length]);

  const toggleModuleCollapse = useCallback((topic: string) => {
    setCollapsedModules((prev) => ({
      ...prev,
      [topic]: !prev[topic],
    }));
  }, []);

  const allModulesCollapsed = useMemo(() => {
    if (filteredModules.length === 0) return false;
    return filteredModules.every((m) => !!collapsedModules[m.topic]);
  }, [filteredModules, collapsedModules]);

  const handleToggleAllModules = useCallback(() => {
    if (allModulesCollapsed) {
      setCollapsedModules({});
    } else {
      const next: Record<string, boolean> = {};
      for (const m of filteredModules) {
        next[m.topic] = true;
      }
      setCollapsedModules(next);
    }
  }, [allModulesCollapsed, filteredModules]);

  if (filteredFlat.length === 0) {
    return (
      <div className="p-12 text-center space-y-4">
        <div className="mx-auto size-12 rounded-2xl border border-border/70 bg-secondary/40 flex items-center justify-center text-muted-foreground">
          <Search className="size-5" />
        </div>
        <div className="space-y-1">
          <h3 className="font-display text-base font-bold text-foreground">
            No matching problems in {sheet.name}
          </h3>
          <p className="font-mono text-xs text-muted-foreground max-w-md mx-auto">
            No problems matched your current combination of search query, topic module, difficulty, or status filters.
          </p>
        </div>

        {otherSheetMatches.length > 0 && (
          <div className="pt-2 space-y-2">
            <div className="font-mono text-[11px] text-muted-foreground">
              Found matching problems in other sheets:
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {otherSheetMatches.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelectSheet(m.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-xs font-bold transition-all cursor-pointer hover:scale-[1.02] ${m.badge}`}
                >
                  <span>{m.shortName}</span>
                  <span className="rounded bg-background/60 px-1.5 py-0.2 text-[10px]">
                    {m.count} {m.count === 1 ? "match" : "matches"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2 font-mono text-xs font-bold hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <RotateCcw className="size-3.5" />
            <span>Reset All Filters</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 bg-background/40">
      {/* Results Counter, Cross-Sheet Matches & Expand/Collapse Bar */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-muted-foreground">
          <div>
            Showing <span className="font-bold text-foreground">{filteredFlat.length}</span> of{" "}
            <span className="font-bold text-foreground">{sheet.enrichedProblems.length}</span> problems
            {topicFilter !== "all" && (
              <span>
                {" "}
                in <span className="text-primary font-bold">{topicFilter}</span>
              </span>
            )}
            {query && (
              <span>
                {" "}
                matching <span className="text-primary font-bold">"{searchFilter.trim()}"</span>
              </span>
            )}
          </div>

          {viewMode === "modules" && filteredModules.length > 1 && !query && (
            <button
              type="button"
              onClick={handleToggleAllModules}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card/80 px-2.5 py-1 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ChevronsUpDown className="size-3.5" />
              <span>{allModulesCollapsed ? "Expand All Modules" : "Collapse All Modules"}</span>
            </button>
          )}
        </div>

        {query && otherSheetMatches.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 font-mono text-[11px]">
            <span className="text-muted-foreground">Also found in:</span>
            {otherSheetMatches.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelectSheet(m.id)}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold transition-all cursor-pointer ${m.badge}`}
              >
                <span>{m.shortName}</span>
                <span>({m.count})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* =====================================================================
          VIEW MODE 1: TOPIC MODULES (ACCORDION CURRICULUM)
      ===================================================================== */}
      {viewMode === "modules" && (
        <div className="space-y-4">
          {filteredModules.map((mod, modIndex) => {
            // Auto-expand modules whenever a search query is active
            const isCollapsed = query ? false : !!collapsedModules[mod.topic];
            const modSolved = mod.problems.filter((p) => solvedSlugs.has(p.slug)).length;
            const modTotal = mod.problems.length;
            const modPct = modTotal > 0 ? Math.round((modSolved / modTotal) * 100) : 0;
            const isComplete = modTotal > 0 && modSolved === modTotal;

            return (
              <div
                key={mod.topic}
                className={`rounded-2xl border transition-colors overflow-hidden ${
                  isComplete
                    ? "border-emerald-500/40 bg-emerald-500/[0.03]"
                    : "border-border/80 bg-card/70"
                }`}
              >
                {/* Module Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleModuleCollapse(mod.topic)}
                  aria-expanded={!isCollapsed}
                  className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 sm:px-5 text-left hover:bg-secondary/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`size-8 rounded-lg border flex items-center justify-center shrink-0 font-mono text-xs font-black ${
                        isComplete
                          ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
                          : theme.iconBg
                      }`}
                    >
                      {isComplete ? <CheckCheck className="size-4" /> : modIndex + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-sm sm:text-base font-black text-foreground">
                          {mod.topic}
                        </h3>
                        <span className="rounded-md border border-border/70 bg-background/80 px-2 py-0.5 font-mono text-[10px] font-bold text-muted-foreground">
                          {modTotal} {modTotal === 1 ? "Problem" : "Problems"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="flex items-center gap-2.5 w-40 sm:w-48 font-mono text-xs">
                      <div className="h-2 flex-1 rounded-full bg-secondary overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isComplete ? "bg-emerald-500" : theme.progressColor
                          }`}
                          style={{ width: `${modPct}%` }}
                        />
                      </div>
                      <span
                        className={`text-[11px] font-bold w-14 text-right ${
                          isComplete ? "text-emerald-400" : "text-foreground"
                        }`}
                      >
                        {modSolved}/{modTotal}
                      </span>
                    </div>

                    <ChevronDown
                      className={`size-4 text-muted-foreground transition-transform duration-200 ${
                        isCollapsed ? "-rotate-90" : "rotate-0"
                      }`}
                    />
                  </div>
                </button>

                {/* Module Problems List */}
                {!isCollapsed && (
                  <div className="border-t border-border/60 divide-y divide-border/40 bg-background/50">
                    {mod.problems.map((item) => (
                      <SheetProblemRow
                        key={item.slug}
                        item={item}
                        isSolved={solvedSlugs.has(item.slug)}
                        isCloudVerified={verifiedFirebaseSlugs.has(item.slug)}
                        isStarred={starredSlugs.has(item.slug)}
                        onToggleSolved={onToggleSolved}
                        onToggleStarred={onToggleStarred}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          VIEW MODE 2: COMPACT SCANNABLE TABLE
      ===================================================================== */}
      {viewMode === "table" && (
        <div className="rounded-2xl border border-border/80 bg-card/70 overflow-hidden">
          <div className="divide-y divide-border/50">
            {visibleFlat.map((item) => (
              <SheetProblemRow
                key={item.slug}
                item={item}
                isSolved={solvedSlugs.has(item.slug)}
                isCloudVerified={verifiedFirebaseSlugs.has(item.slug)}
                isStarred={starredSlugs.has(item.slug)}
                onToggleSolved={onToggleSolved}
                onToggleStarred={onToggleStarred}
                showModuleBadge
              />
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          VIEW MODE 3: DYNAMIC BENTO CARDS (2-COLUMN GRID)
      ===================================================================== */}
      {viewMode === "cards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visibleFlat.map((item) => (
            <SheetProblemCard
              key={item.slug}
              item={item}
              isSolved={solvedSlugs.has(item.slug)}
              isCloudVerified={verifiedFirebaseSlugs.has(item.slug)}
              isStarred={starredSlugs.has(item.slug)}
              onToggleSolved={onToggleSolved}
              onToggleStarred={onToggleStarred}
            />
          ))}
        </div>
      )}

      {/* Pagination / Load More for Table & Cards views */}
      {viewMode !== "modules" && hasMoreFlat && (
        <div ref={loadMoreRef} className="flex flex-col items-center justify-center gap-2 pt-3 pb-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setVisibleCount((prev) => Math.min(prev + SHEET_PAGE_SIZE, filteredFlat.length))
              }
              className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-1.5 font-mono text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
            >
              Load More ({Math.min(SHEET_PAGE_SIZE, filteredFlat.length - visibleCount)} more)
            </button>
            <button
              type="button"
              onClick={() => setVisibleCount(filteredFlat.length)}
              className="rounded-xl border border-border/60 bg-secondary/40 px-3.5 py-1.5 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Show All ({filteredFlat.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Accessible, dynamic-height Problem Row used inside Topic Modules and Compact Table views.
 * Never truncates long problem names into unreadable ellipses — wraps naturally inside the row.
 */
const SheetProblemRow = memo(function SheetProblemRow({
  item,
  isSolved,
  isCloudVerified,
  isStarred,
  onToggleSolved,
  onToggleStarred,
  showModuleBadge = false,
}: {
  item: EnrichedSheetProblem;
  isSolved: boolean;
  isCloudVerified: boolean;
  isStarred: boolean;
  onToggleSolved: (slug: string) => void;
  onToggleStarred: (slug: string) => void;
  showModuleBadge?: boolean;
}) {
  return (
    <div
      className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 transition-colors ${
        isSolved
          ? "bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08]"
          : "hover:bg-secondary/40"
      }`}
    >
      {/* Left: Solved Checkbox + Star Button + Problem Number & Title */}
      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
        <div className="flex items-center gap-2 shrink-0 pt-0.5 sm:pt-0">
          {/* Accessible Checkbox Button */}
          <button
            type="button"
            role="checkbox"
            aria-checked={isSolved}
            aria-label={`Mark ${item.title} as ${isSolved ? "unsolved" : "solved"}`}
            onClick={() => onToggleSolved(item.slug)}
            className={`size-5 rounded-md border flex items-center justify-center transition-all ${
              isSolved
                ? "bg-emerald-500 border-emerald-400 text-white shadow-xs"
                : "border-border/90 bg-background hover:border-primary"
            }`}
            title={isSolved ? "Solved (Click to unmark)" : "Mark as solved"}
          >
            {isSolved && <Check className="size-3.5 stroke-[3]" />}
          </button>

          {/* Star / Revision Bookmark Button */}
          <button
            type="button"
            aria-pressed={isStarred}
            aria-label={`${isStarred ? "Remove" : "Add"} ${item.title} ${isStarred ? "from" : "to"} revision bookmarks`}
            onClick={() => onToggleStarred(item.slug)}
            className={`size-6 rounded-md flex items-center justify-center transition-colors ${
              isStarred
                ? "text-amber-400 bg-amber-500/15"
                : "text-muted-foreground/50 hover:text-amber-400 hover:bg-secondary/60"
            }`}
            title={isStarred ? "Starred for revision" : "Star for revision"}
          >
            <Star className={`size-3.5 ${isStarred ? "fill-amber-400" : ""}`} />
          </button>
        </div>

        {/* Title & Metadata */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] text-muted-foreground/80 shrink-0">
              #{item.originalIndex + 1}
            </span>
            <Link
              to="/problem/$slug"
              params={{ slug: item.slug }}
              className={`font-sans text-xs sm:text-sm font-semibold break-words leading-snug transition-colors ${
                isSolved
                  ? "text-muted-foreground line-through decoration-muted-foreground/40 hover:text-foreground"
                  : "text-foreground group-hover:text-primary"
              }`}
            >
              {item.title}
            </Link>
            {isCloudVerified && (
              <span
                className="inline-flex items-center gap-1 rounded bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 font-mono text-[9px] font-bold text-emerald-400"
                title="Verified by your DSA.viz code submission"
              >
                <CheckCircle2 className="size-2.5" /> Verified
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-1 font-mono text-[10px]">
            <span
              className={`rounded px-1.5 py-0.2 font-bold border ${
                item.difficulty === "Easy"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : item.difficulty === "Hard"
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/30"
              }`}
            >
              {item.difficulty}
            </span>

            {showModuleBadge ? (
              <span className="rounded bg-secondary/70 border border-border/60 px-1.5 py-0.2 text-muted-foreground">
                {item.moduleTopic}
              </span>
            ) : (
              item.primaryTopic && (
                <span className="text-muted-foreground/80">• {item.primaryTopic}</span>
              )
            )}

            {item.companies.length > 0 && (
              <span className="hidden md:inline text-muted-foreground/70">
                • {item.companies.join(", ")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: 1-Click Ergonomic Actions */}
      <div className="flex items-center justify-end gap-1.5 shrink-0 pl-8 sm:pl-0">
        <Link
          to="/problem/$slug"
          params={{ slug: item.slug }}
          className="inline-flex items-center gap-1 rounded-lg bg-primary/15 text-primary border border-primary/30 px-2.5 py-1.5 font-mono text-[11px] font-bold hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <span>Visualize</span>
          <ChevronRight className="size-3.5" />
        </Link>

        <Link
          to="/compiler"
          className="inline-flex items-center gap-1 rounded-lg bg-secondary/70 text-muted-foreground border border-border/70 px-2 py-1.5 font-mono text-[10px] font-semibold hover:text-foreground hover:bg-secondary transition-colors"
          title="Open in Online Compiler"
        >
          <Code2 className="size-3" />
          <span className="hidden sm:inline">Code</span>
        </Link>

        <a
          href={`https://leetcode.com/problems/${item.slug}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg bg-secondary/50 text-muted-foreground border border-border/60 px-2 py-1.5 font-mono text-[10px] hover:text-foreground hover:bg-secondary transition-colors"
          title={`Open ${item.title} on LeetCode`}
        >
          <span>LC</span>
          <ExternalLink className="size-2.5" />
        </a>
      </div>
    </div>
  );
});

/**
 * Dynamic-height Bento Card used in the 2-Column Cards View.
 * Automatically expands vertically for long problem titles & tags so text never overflows.
 */
const SheetProblemCard = memo(function SheetProblemCard({
  item,
  isSolved,
  isCloudVerified,
  isStarred,
  onToggleSolved,
  onToggleStarred,
}: {
  item: EnrichedSheetProblem;
  isSolved: boolean;
  isCloudVerified: boolean;
  isStarred: boolean;
  onToggleSolved: (slug: string) => void;
  onToggleStarred: (slug: string) => void;
}) {
  return (
    <div
      className={`group relative flex flex-col justify-between gap-3 rounded-xl border p-4 transition-all h-auto ${
        isSolved
          ? "border-emerald-500/30 bg-emerald-500/[0.05] hover:border-emerald-500/50"
          : "border-border/70 bg-card/80 hover:border-primary/50 hover:bg-secondary/30"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <button
            type="button"
            role="checkbox"
            aria-checked={isSolved}
            aria-label={`Mark ${item.title} as ${isSolved ? "unsolved" : "solved"}`}
            onClick={() => onToggleSolved(item.slug)}
            className={`mt-0.5 size-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
              isSolved
                ? "bg-emerald-500 border-emerald-400 text-white shadow-xs"
                : "border-border/90 bg-background hover:border-primary"
            }`}
          >
            {isSolved && <Check className="size-3.5 stroke-[3]" />}
          </button>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
              <span className="text-muted-foreground">#{item.originalIndex + 1}</span>
              <span
                className={`rounded px-1.5 py-0.2 font-bold border ${
                  item.difficulty === "Easy"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : item.difficulty === "Hard"
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                }`}
              >
                {item.difficulty}
              </span>
              <span className="rounded bg-secondary/70 border border-border/60 px-1.5 py-0.2 text-muted-foreground">
                {item.moduleTopic}
              </span>
              {isCloudVerified && (
                <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 text-emerald-400 font-bold">
                  Verified
                </span>
              )}
            </div>

            <Link
              to="/problem/$slug"
              params={{ slug: item.slug }}
              className={`block font-sans text-sm font-bold break-words leading-snug transition-colors ${
                isSolved
                  ? "text-muted-foreground line-through decoration-muted-foreground/40 hover:text-foreground"
                  : "text-foreground group-hover:text-primary"
              }`}
            >
              {item.title}
            </Link>
          </div>
        </div>

        <button
          type="button"
          aria-pressed={isStarred}
          onClick={() => onToggleStarred(item.slug)}
          className={`size-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
            isStarred
              ? "text-amber-400 bg-amber-500/15"
              : "text-muted-foreground/50 hover:text-amber-400 hover:bg-secondary/60"
          }`}
          title={isStarred ? "Starred for revision" : "Star for revision"}
        >
          <Star className={`size-4 ${isStarred ? "fill-amber-400" : ""}`} />
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
        <div className="font-mono text-[10px] text-muted-foreground truncate">
          {item.companies.length > 0 ? item.companies.join(" • ") : item.primaryTopic}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Link
            to="/problem/$slug"
            params={{ slug: item.slug }}
            className="inline-flex items-center gap-1 rounded-lg bg-primary/15 text-primary border border-primary/30 px-2.5 py-1 font-mono text-[11px] font-bold hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <span>Visualize</span>
            <ChevronRight className="size-3.5" />
          </Link>
          <a
            href={`https://leetcode.com/problems/${item.slug}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg bg-secondary/60 text-muted-foreground border border-border/60 px-2 py-1 font-mono text-[10px] hover:text-foreground transition-colors"
            title="Open on LeetCode"
          >
            <span>LC</span>
            <ExternalLink className="size-2.5" />
          </a>
        </div>
      </div>
    </div>
  );
});

export default SheetsPage;
