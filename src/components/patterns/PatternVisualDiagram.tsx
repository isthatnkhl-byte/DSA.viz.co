import React, { Suspense, useMemo, useState } from "react";
import { Eye, EyeOff, Loader2, Workflow } from "lucide-react";
import {
  buildExcalidrawBinarySearchLesson,
  buildExcalidrawDpTableLesson,
  buildExcalidrawGraphShortestPathLesson,
  buildExcalidrawHashMapLesson,
  buildExcalidrawHeapPriorityQueueLesson,
  buildExcalidrawIntervalsLesson,
  buildExcalidrawLinkedListLesson,
  buildExcalidrawMonotonicStackLesson,
  buildExcalidrawSlidingWindowLesson,
  buildExcalidrawTreeLesson,
  buildExcalidrawTwoPointersLesson,
  generateAiExcalidrawLessonForQuery,
  type AiWhiteboardLesson,
} from "@/shared/whiteboard";
import type { PatternId } from "@/lib/master-patterns/types";

const LazyAiWhiteboard = React.lazy(() =>
  import("@/components/interview/AiWhiteboard").then((m) => ({
    default: m.AiWhiteboard,
  })),
);

function buildLessonForPattern(patternId: PatternId): AiWhiteboardLesson {
  switch (patternId) {
    case "two-pointers":
      return buildExcalidrawTwoPointersLesson([1, 3, 5, 8, 12, 17, 21], 17);
    case "sliding-window":
      return buildExcalidrawSlidingWindowLesson([2, 1, 5, 1, 3, 2], 3);
    case "fast-slow-pointers":
      return buildExcalidrawLinkedListLesson();
    case "binary-search":
      return buildExcalidrawBinarySearchLesson([2, 5, 8, 12, 16, 23, 38], 16);
    case "prefix-sum-hashmap":
      return buildExcalidrawHashMapLesson([2, 7, 11, 15], 9);
    case "monotonic-stack":
      return buildExcalidrawMonotonicStackLesson([2, 1, 5, 6, 2, 3]);
    case "intervals-sweep":
      return buildExcalidrawIntervalsLesson();
    case "heap-top-k":
      return buildExcalidrawHeapPriorityQueueLesson();
    case "trees-dfs-bfs":
      return buildExcalidrawTreeLesson();
    case "graphs-topo-union-find":
      return buildExcalidrawGraphShortestPathLesson();
    case "backtracking":
      return generateAiExcalidrawLessonForQuery("backtracking subsets recursion decision tree");
    case "dynamic-programming":
      return buildExcalidrawDpTableLesson();
    default:
      return buildExcalidrawTwoPointersLesson([1, 3, 5, 8, 12], 13);
  }
}

interface PatternVisualDiagramProps {
  patternId: PatternId;
  title?: string;
}

export const PatternVisualDiagram: React.FC<PatternVisualDiagramProps> = ({
  patternId,
  title = "Interactive Invariant Whiteboard Diagram",
}) => {
  const [expanded, setExpanded] = useState(false);

  const lesson = useMemo(() => buildLessonForPattern(patternId), [patternId]);

  return (
    <div className="border border-border bg-background">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em]">
          <Workflow className="size-3.5 text-primary" />
          <span>{title}</span>
          <span className="text-[10px] font-normal text-muted-foreground">
            ({lesson.frames.length} animated invariant frames)
          </span>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="inline-flex items-center gap-1.5 border border-border bg-card px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] hover:border-primary cursor-pointer"
        >
          {expanded ? (
            <>
              <EyeOff className="size-3" />
              Hide Canvas
            </>
          ) : (
            <>
              <Eye className="size-3 text-primary" />
              Open Visual Diagram
            </>
          )}
        </button>
      </div>

      {expanded && (
        <div className="h-[440px] w-full overflow-hidden">
          <Suspense
            fallback={
              <div className="h-full flex items-center justify-center gap-2 text-xs font-mono text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-primary" />
                Loading Excalidraw invariant stage...
              </div>
            }
          >
            <LazyAiWhiteboard
              roomId={`mp-visual-${patternId}`}
              readOnly={false}
              problemTitle={lesson.topic}
              activeLessonOverride={lesson}
            />
          </Suspense>
        </div>
      )}
    </div>
  );
};
