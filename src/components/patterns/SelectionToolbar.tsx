import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MessageCircleQuestion, Quote } from "lucide-react";
import {
  CITATION_MAX_TEXT_LENGTH,
  createTextSelector,
  type PatternCitation,
} from "@/lib/master-patterns/citations";
import type { SideChatAnchor, SideSegmentKind } from "@/lib/master-patterns/types";

export interface CapturedSegmentSelection {
  citation: PatternCitation;
  anchor: SideChatAnchor;
  rect: DOMRect;
}

interface SelectionToolbarProps {
  containerRef: React.RefObject<HTMLElement | null>;
  sessionId: string;
  onAsk: (capture: CapturedSegmentSelection) => void;
  onCite: (capture: CapturedSegmentSelection) => void;
}

function findSegmentElement(node: Node | null): HTMLElement | null {
  let curr: Node | null = node;
  while (curr) {
    if (
      curr instanceof HTMLElement &&
      curr.hasAttribute("data-side-segment-id")
    ) {
      return curr;
    }
    curr = curr.parentNode;
  }
  return null;
}

function isEditableElement(node: Node | null): boolean {
  let curr: Node | null = node;
  while (curr) {
    if (curr instanceof HTMLElement) {
      if (
        curr.tagName === "INPUT" ||
        curr.tagName === "TEXTAREA" ||
        curr.tagName === "SELECT" ||
        curr.tagName === "BUTTON" ||
        curr.isContentEditable
      ) {
        return true;
      }
    }
    curr = curr.parentNode;
  }
  return false;
}

export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  containerRef,
  sessionId,
  onAsk,
  onCite,
}) => {
  const [capture, setCapture] = useState<CapturedSegmentSelection | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = toolbarRef.current;
    if (!el || !capture) return;
    const tb = el.getBoundingClientRect();
    const x = Math.max(
      8,
      Math.min(
        capture.rect.left + capture.rect.width / 2 - tb.width / 2,
        window.innerWidth - tb.width - 8,
      ),
    );
    const aboveTop = capture.rect.top - tb.height - 8;
    const y =
      aboveTop >= 8
        ? aboveTop
        : Math.min(capture.rect.bottom + 8, window.innerHeight - tb.height - 8);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }, [capture]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const inspectSelection = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setCapture(null);
        return;
      }

      const range = sel.getRangeAt(0);
      if (
        !root.contains(range.commonAncestorContainer) ||
        isEditableElement(range.startContainer) ||
        isEditableElement(range.endContainer)
      ) {
        setCapture(null);
        return;
      }

      const segmentEl = findSegmentElement(range.commonAncestorContainer);
      if (!segmentEl) {
        setCapture(null);
        return;
      }

      const selectedText = sel.toString().trim();
      if (selectedText.length < 3 || selectedText.length > CITATION_MAX_TEXT_LENGTH) {
        setCapture(null);
        return;
      }

      const fullText = segmentEl.innerText || segmentEl.textContent || "";
      const approxIdx = fullText.indexOf(selectedText);
      const start = approxIdx >= 0 ? approxIdx : 0;
      const selector = createTextSelector(
        fullText || selectedText,
        start,
        start + selectedText.length,
      ) ?? {
        text: selectedText,
        start: 0,
        end: selectedText.length,
        prefix: "",
        suffix: "",
      };

      const segmentId = segmentEl.getAttribute("data-side-segment-id")!;
      const kind = (segmentEl.getAttribute("data-side-segment-kind") ??
        "notes") as SideSegmentKind;
      const title = segmentEl.getAttribute("data-side-segment-title") ?? undefined;
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setCapture(null);
        return;
      }

      setCapture({
        citation: {
          version: 1,
          sessionId,
          segmentId,
          ...selector,
        },
        anchor: {
          segmentId,
          kind,
          title,
          excerpt: selectedText.slice(0, 260),
        },
        rect,
      });
    };

    const onMouseUp = () => setTimeout(inspectSelection, 10);
    const onScrollOrResize = () => setCapture(null);

    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("keyup", onMouseUp);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("keyup", onMouseUp);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [containerRef, sessionId]);

  if (!capture || typeof document === "undefined") return null;

  const clearSelection = () => {
    window.getSelection()?.removeAllRanges();
    setCapture(null);
  };

  return createPortal(
    <div
      ref={toolbarRef}
      style={{ position: "fixed", zIndex: 70 }}
      className="flex items-center gap-1 border-2 border-primary bg-card p-1 shadow-[4px_4px_0px_0px_var(--border)]"
      onPointerDown={(e) => e.preventDefault()}
    >
      <button
        type="button"
        onClick={() => {
          onAsk(capture);
          clearSelection();
        }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 font-mono text-[11px] font-bold uppercase text-primary hover:bg-primary/10 cursor-pointer"
      >
        <MessageCircleQuestion className="size-3.5" />
        Ask
      </button>
      <span className="h-4 w-px bg-border" />
      <button
        type="button"
        onClick={() => {
          onCite(capture);
          clearSelection();
        }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 font-mono text-[11px] font-bold uppercase text-foreground hover:bg-muted cursor-pointer"
      >
        <Quote className="size-3.5 text-amber-500" />
        Cite
      </button>
    </div>,
    document.body,
  );
};
