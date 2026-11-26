import { ANCESTOR_STRANDS, STRAND_MAP } from "../../data/patterns";
import type { PatternId, PatternSessionState, UserPatternProfile } from "./types";

export const DEFAULT_CONTEXT_BUDGET_CHARS = 1200;

export interface ContextBudgetAnalysis {
  packet: string;
  charCount: number;
  estimatedTokens: number;
  retainedP0Control: boolean;
  retainedP1Signatures: number;
  compactedOlderTurns: number;
  recentVerbatimTurns: number;
}

/** Content-only token estimate aligned with LearnHarness chars/4 accounting. */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Computes unresolved direct/transitive prerequisite blockers inside the DAG
 * for the target strand so context prompts always highlight root-cause prerequisites.
 */
function findActiveDagBlockers(
  targetStrandId: string | undefined,
  profile: UserPatternProfile | undefined,
): string[] {
  if (!targetStrandId || !profile) return [];
  const ancestors = ANCESTOR_STRANDS.get(targetStrandId) ?? [];
  const blockers: string[] = [];
  for (const ancId of ancestors) {
    const st = profile.strands[ancId];
    if (st && (st.status === "gap" || st.mastery < 65)) {
      blockers.push(
        `${ancId.split(":")[1] ?? ancId}(${st.status}:${st.mastery}%)`,
      );
    }
  }
  return blockers.slice(0, 3);
}

/**
 * Priority-tiered cognitive context window compactor (LearnHarness compaction law):
 * strictly preserves P0 (RetestQueue, Probe bounds, DAG blockers) and P1 (active
 * error signatures), summarizes older turns into a single rollup line (P2), and
 * fits recent turns verbatim (P3) within `maxChars` without slicing off P0 control state.
 */
export function analyzeContextBudget(opts: {
  session?: Pick<
    PatternSessionState,
    | "patternId"
    | "probeState"
    | "questionHistory"
    | "pendingRemediationStrands"
    | "retestQueue"
    | "resolvedStrandsInSession"
  > | null;
  profile?: UserPatternProfile;
  targetStrandId?: string;
  sideUpdatesText?: string;
  maxChars?: number;
}): ContextBudgetAnalysis {
  const maxChars = Math.max(320, opts.maxChars ?? DEFAULT_CONTEXT_BUDGET_CHARS);
  const session = opts.session;
  if (!session && !opts.profile) {
    const empty = "No prior in-session turns.";
    return {
      packet: empty,
      charCount: empty.length,
      estimatedTokens: estimateTokens(empty),
      retainedP0Control: true,
      retainedP1Signatures: 0,
      compactedOlderTurns: 0,
      recentVerbatimTurns: 0,
    };
  }

  // P0: Mandatory control & probe anchors (never evicted ahead of verbose history)
  const p0Lines: string[] = [];
  if (session?.retestQueue && session.retestQueue.length > 0) {
    p0Lines.push(
      `RetestQueue: ${session.retestQueue.map((s) => s.split(":")[1] ?? s).join(", ")}`,
    );
  }
  if (session?.pendingRemediationStrands && session.pendingRemediationStrands.length > 0) {
    p0Lines.push(
      `PendingRemediation: ${session.pendingRemediationStrands.map((s) => s.split(":")[1] ?? s).join(", ")}`,
    );
  }

  const blockers = findActiveDagBlockers(opts.targetStrandId, opts.profile);
  if (blockers.length > 0) {
    p0Lines.push(`DagRootBlockers: ${blockers.join(", ")}`);
  }

  const observed = session?.probeState?.strandsObserved;
  if (observed && observed.length > 0) {
    const probeLine = observed
      .slice(-3)
      .map(
        (o) =>
          `${o.strandId.split(":")[1] ?? o.strandId}[floor=${o.floor},ceil=${o.ceiling}]`,
      )
      .join(" | ");
    p0Lines.push(`Probe: ${probeLine}`);
  }

  // P1: Active cross-session error signatures (prioritize matching strandId first)
  const patternId: PatternId | undefined = session?.patternId;
  const activeSigs = (opts.profile?.errorSignatures ?? [])
    .filter((s) => s.status === "active" && (!patternId || s.patternId === patternId))
    .sort((a, b) => {
      const aMatch = a.strandId === opts.targetStrandId ? 1 : 0;
      const bMatch = b.strandId === opts.targetStrandId ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch;
      return b.recurrenceCount - a.recurrenceCount;
    })
    .slice(0, 3);

  const p1Lines: string[] = [];
  if (activeSigs.length > 0) {
    const sigText = activeSigs
      .map(
        (s) =>
          `${s.strandId.split(":")[1] ?? s.strandId}(${s.missClass}x${s.recurrenceCount}: ${s.summary.slice(0, 55)})`,
      )
      .join(" | ");
    p1Lines.push(`ActiveErrors: ${sigText}`);
  }
  if (opts.sideUpdatesText?.trim()) {
    p1Lines.push(`SideQuestions:\n${opts.sideUpdatesText.trim()}`);
  }

  // P2: Resolved progress + rolled-up older turn history beyond recent window
  const p2Lines: string[] = [];
  if (session && session.resolvedStrandsInSession.length > 0) {
    p2Lines.push(
      `Resolved: ${session.resolvedStrandsInSession.map((s) => s.split(":")[1] ?? s).join(", ")}`,
    );
  }

  const history = session?.questionHistory ?? [];
  const keepRecent = Math.min(3, history.length);
  const olderCount = Math.max(0, history.length - keepRecent);
  if (olderCount > 0) {
    const olderSlice = history.slice(0, olderCount);
    const passes = olderSlice.filter((h) => h.score >= 70 && !h.missClass).length;
    const misses = olderCount - passes;
    const avgScore = Math.round(
      olderSlice.reduce((acc, h) => acc + h.score, 0) / olderCount,
    );
    p2Lines.push(
      `EarlierTurns(${olderCount}): ${passes} pass, ${misses} miss, avg=${avgScore}%`,
    );
  }

  // Helper to render recent verbatim turns (P3) at a chosen verbalSummary char cap
  const renderRecentLine = (summaryCap: number): string => {
    if (keepRecent === 0) return "";
    const recentStart = history.length - keepRecent;
    const items = history.slice(recentStart).map((h, i) => {
      const idx = recentStart + i + 1;
      const shortStrand =
        STRAND_MAP.get(h.strandId)?.id.split(":")[1] ?? h.strandId;
      const missTag = h.missClass ? `,miss=${h.missClass}` : "";
      const hintTag = h.highestHintRung ? `,hint=${h.highestHintRung}` : "";
      const verbalSnippet =
        summaryCap > 0 && h.verbalSummary
          ? `,note="${h.verbalSummary.slice(0, summaryCap)}"`
          : "";
      return `T${idx}(${shortStrand},${h.modality},${h.score}%${missTag}${hintTag}${verbalSnippet})`;
    });
    return `RecentTurns: ${items.join("; ")}`;
  };

  // Assemble progressively from P0 -> P1 -> P2 -> P3 respecting maxChars
  const baseSections = [...p0Lines, ...p1Lines, ...p2Lines];
  const baseText = baseSections.join("\n");

  let recentLine = "";
  let actualRecentIncluded = 0;
  for (const cap of [85, 40, 0]) {
    const candidateRecent = renderRecentLine(cap);
    if (!candidateRecent) break;
    const testJoined = baseText
      ? `${baseText}\n${candidateRecent}`
      : candidateRecent;
    if (testJoined.length <= maxChars) {
      recentLine = candidateRecent;
      actualRecentIncluded = keepRecent;
      break;
    }
  }

  // If even 0-summary 3 turns exceed remaining budget, keep strictly newest 1 turn
  if (!recentLine && keepRecent > 0) {
    const last = history[history.length - 1]!;
    const minLine = `RecentTurns: T${history.length}(${last.strandId.split(":")[1] ?? last.strandId},${last.score}%)`;
    const testLast = baseText ? `${baseText}\n${minLine}` : minLine;
    if (testLast.length <= maxChars) {
      recentLine = minLine;
      actualRecentIncluded = 1;
    }
  }

  let finalSections = recentLine ? [...baseSections, recentLine] : baseSections;
  let packet = finalSections.join("\n").trim();

  // Safety clamp if extreme P0+P1+P2 alone exceeds tight custom maxChars
  if (packet.length > maxChars) {
    const essentialOnly = [...p0Lines, ...p1Lines].join("\n").trim();
    packet =
      essentialOnly.length <= maxChars
        ? essentialOnly
        : `${essentialOnly.slice(0, Math.max(0, maxChars - 3))}...`;
  }

  if (!packet) packet = "No prior in-session turns.";

  return {
    packet,
    charCount: packet.length,
    estimatedTokens: estimateTokens(packet),
    retainedP0Control:
      !session?.retestQueue?.length || packet.includes("RetestQueue:"),
    retainedP1Signatures: activeSigs.length,
    compactedOlderTurns: olderCount,
    recentVerbatimTurns: actualRecentIncluded,
  };
}
