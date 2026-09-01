import { Link } from "@tanstack/react-router";
import { FolderKanban, CheckCircle2, Target, ArrowRight, Sparkles, Building2, Flame } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface SheetCardData {
  title: string;
  badge: string;
  desc: string;
  totalCount: number;
  easy: number;
  med: number;
  hard: number;
  companies: string[];
  featuredProblems: { title: string; slug: string }[];
  color: string;
  border: string;
  bg: string;
  icon: typeof Target;
}

const SHEETS: SheetCardData[] = [
  {
    title: "NeetCode 150",
    badge: "Most Popular",
    desc: "The gold standard curriculum of 150 essential algorithmic patterns covering all interview archetypes.",
    totalCount: 150,
    easy: 32,
    med: 88,
    hard: 30,
    companies: ["Google", "Meta", "Amazon", "Apple"],
    featuredProblems: [
      { title: "Two Sum", slug: "two-sum" },
      { title: "3Sum", slug: "3sum" },
      { title: "Trapping Rain Water", slug: "trapping-rain-water" },
    ],
    icon: Target,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
  },
  {
    title: "Striver's SDE Sheet",
    badge: "FAANG Tier",
    desc: "191 carefully structured questions designed by Raj Vikramaditya for cracking top-tier software engineering interviews.",
    totalCount: 191,
    easy: 42,
    med: 104,
    hard: 45,
    companies: ["Microsoft", "Uber", "Bloomberg", "Google"],
    featuredProblems: [
      { title: "Set Matrix Zeroes", slug: "set-matrix-zeroes" },
      { title: "Pascal's Triangle", slug: "pascals-triangle" },
      { title: "LRU Cache", slug: "lru-cache" },
    ],
    icon: FolderKanban,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
  },
  {
    title: "Blind 75",
    badge: "High Efficiency",
    desc: "The timeless 75 problem list curated by a Facebook Tech Lead for maximum signal-to-time ratio.",
    totalCount: 75,
    easy: 21,
    med: 43,
    hard: 11,
    companies: ["Meta", "Amazon", "Netflix", "LinkedIn"],
    featuredProblems: [
      { title: "Best Time to Buy Stock", slug: "best-time-to-buy-and-sell-stock" },
      { title: "Course Schedule", slug: "course-schedule" },
      { title: "Coin Change", slug: "coin-change" },
    ],
    icon: CheckCircle2,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
  },
];

export function DsaSheetSection() {
  const { user, signInWithGoogle } = useAuth();

  return (
    <section className="relative my-20 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto w-full">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-80 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="mb-12 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-mono font-bold uppercase tracking-wider text-primary mb-3 shadow-xs">
          <FolderKanban className="size-3.5 text-primary" />
          <span>Curated Interview Curricula</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-display font-black tracking-tight text-foreground mb-3">
          Master the <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">DSA Sheets</span>
        </h2>
        <p className="text-muted-foreground font-sans text-sm md:text-base leading-relaxed">
          Structured learning roadmaps with integrated visualizer simulations, spaced repetition tracking, and real-time execution.
        </p>
      </div>

      {/* 3 Sheets Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {SHEETS.map((sheet) => (
          <div
            key={sheet.title}
            className={`group relative overflow-hidden rounded-3xl border ${sheet.border} bg-card/85 p-6 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 backdrop-blur-xl flex flex-col justify-between`}
          >
            <div>
              {/* Top Row: Icon + Badge */}
              <div className="flex items-center justify-between mb-5">
                <div className={`inline-flex size-11 items-center justify-center rounded-2xl ${sheet.bg} ${sheet.color} shadow-xs`}>
                  <sheet.icon className="size-5.5" />
                </div>
                <span className="rounded-full border border-border/80 bg-secondary/60 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-foreground">
                  {sheet.badge}
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="text-xl font-bold font-display text-foreground mb-1 group-hover:text-primary transition-colors">
                {sheet.title}
              </h3>
              <p className="text-xs text-muted-foreground font-sans leading-relaxed mb-4">
                {sheet.desc}
              </p>

              {/* Difficulty Breakdown Bar */}
              <div className="rounded-xl border border-border/60 bg-background/60 p-3 mb-4 space-y-2">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-muted-foreground font-bold">{sheet.totalCount} Problems</span>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-emerald-400 font-bold">{sheet.easy}E</span>
                    <span className="text-amber-400 font-bold">{sheet.med}M</span>
                    <span className="text-rose-400 font-bold">{sheet.hard}H</span>
                  </div>
                </div>

                {/* Progress bar split */}
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="bg-emerald-400 transition-all duration-500"
                    style={{ width: `${(sheet.easy / sheet.totalCount) * 100}%` }}
                    title={`Easy: ${sheet.easy}`}
                  />
                  <div
                    className="bg-amber-400 transition-all duration-500"
                    style={{ width: `${(sheet.med / sheet.totalCount) * 100}%` }}
                    title={`Medium: ${sheet.med}`}
                  />
                  <div
                    className="bg-rose-500 transition-all duration-500"
                    style={{ width: `${(sheet.hard / sheet.totalCount) * 100}%` }}
                    title={`Hard: ${sheet.hard}`}
                  />
                </div>
              </div>

              {/* Company Tags */}
              <div className="mb-4">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Frequently Target:
                </span>
                <div className="flex flex-wrap gap-1">
                  {sheet.companies.map((c) => (
                    <span
                      key={c}
                      className="rounded-md border border-border/60 bg-secondary/40 px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Action Link */}
            <div className="pt-4 border-t border-border/40">
              {user ? (
                <Link
                  to={"/sheets" as any}
                  className="inline-flex items-center justify-between w-full font-mono text-xs font-bold text-primary group-hover:text-primary transition-colors"
                >
                  <span>Launch {sheet.title}</span>
                  <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => signInWithGoogle()}
                  className="inline-flex items-center justify-between w-full font-mono text-xs font-bold text-primary group-hover:text-primary transition-colors text-left"
                >
                  <span>Sign in to Track Sheet</span>
                  <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
