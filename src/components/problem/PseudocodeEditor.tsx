import React, { memo, useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, Brain, Code2, RotateCcw, Github } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PseudocodeEditorProps {
  pseudocode: string;
  onChange: (code: string) => void;
  onSubmit: () => void;
  loading: boolean;
  onInsertStarter: () => void;
  onPushToGithub?: (code: string, lang?: string) => void;
  githubLoading?: boolean;
}

export const PseudocodeEditor = memo(function PseudocodeEditor({
  pseudocode,
  onChange,
  onSubmit,
  loading,
  onInsertStarter,
  onPushToGithub,
  githubLoading,
}: PseudocodeEditorProps) {
  // Local state for instantaneous 0ms typing response
  const [localCode, setLocalCode] = useState(pseudocode);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Keep local state in sync when parent pushes external changes
  useEffect(() => {
    setLocalCode((prev) => (prev !== pseudocode ? pseudocode : prev));
  }, [pseudocode]);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTextChange = useCallback((newVal: string) => {
    setLocalCode(newVal);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      onChangeRef.current(newVal);
    }, 120);
  }, []);

  const flushChanges = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    onChangeRef.current(localCode);
  }, [localCode]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;

    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      flushChanges();
      onSubmit();
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      const tabSpace = "    ";
      const before = value.substring(0, selectionStart);
      const after = value.substring(selectionEnd);
      const updated = before + tabSpace + after;
      handleTextChange(updated);

      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd =
            selectionStart + tabSpace.length;
        }
      });
      return;
    }

    if (e.key === "Enter") {
      const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
      const currentLine = value.substring(lineStart, selectionStart);
      const matchIndent = currentLine.match(/^\s*/);
      let indent = matchIndent ? matchIndent[0] : "";

      const trimmedEnd = currentLine.trimEnd();
      if (trimmedEnd.endsWith(":") || trimmedEnd.endsWith("{")) {
        indent += "    ";
      }

      e.preventDefault();
      const before = value.substring(0, selectionStart);
      const after = value.substring(selectionEnd);
      const updated = before + "\n" + indent + after;
      handleTextChange(updated);

      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd =
            selectionStart + 1 + indent.length;
        }
      });
      return;
    }

    const pairs: Record<string, string> = {
      "(": ")",
      "{": "}",
      "[": "]",
      '"': '"',
      "'": "'",
    };

    if (pairs[e.key] && selectionStart === selectionEnd) {
      const closeChar = pairs[e.key];
      e.preventDefault();
      const before = value.substring(0, selectionStart);
      const after = value.substring(selectionEnd);
      const updated = before + e.key + closeChar + after;
      handleTextChange(updated);

      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd =
            selectionStart + 1;
        }
      });
      return;
    }

    if ([")", "}", "]", '"', "'"].includes(e.key) && value[selectionStart] === e.key) {
      e.preventDefault();
      textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
      return;
    }
  };

  const lineCount = localCode ? localCode.split("\n").length : 1;

  const handleSubmit = () => {
    flushChanges();
    onSubmit();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
        <div className="flex items-center gap-2">
          <Code2 className="size-4 text-primary" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
            Pseudocode Draft
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            onClick={onInsertStarter}
            variant="ghost"
            size="sm"
            className="btn-glide h-7 gap-1 font-mono text-[11px] text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3" /> Starter Template
          </Button>
        </div>
      </div>

      <div className="relative flex rounded-2xl border border-border/70 bg-background/80 font-mono text-xs shadow-inner transition-all duration-300 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20">
        <div
          aria-hidden="true"
          className="select-none border-r border-border/50 bg-muted/15 px-2.5 py-3 text-right font-mono text-[11px] text-muted-foreground/60"
        >
          {Array.from({ length: Math.max(1, lineCount) }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          value={localCode}
          onChange={(e) => handleTextChange(e.target.value)}
          onBlur={flushChanges}
          onKeyDown={handleKeyDown}
          placeholder={`# Outline your algorithm step by step\ndef solve(input):\n    # 1. Initialize pointers / state\n    # 2. Iterate through elements\n    # 3. Apply state transitions\n    return result`}
          rows={Math.max(8, Math.min(22, lineCount))}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          className="w-full resize-y bg-transparent p-3 font-mono text-xs leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-muted-foreground">
            {lineCount} lines • {localCode.length} chars
          </span>
          <span className="hidden sm:inline-block rounded-md bg-muted/40 border border-border/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            ⌘+Enter
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onPushToGithub && (
            <Button
              type="button"
              onClick={() => {
                flushChanges();
                onPushToGithub(localCode, "pseudocode");
              }}
              disabled={githubLoading || !localCode.trim()}
              variant="outline"
              className="btn-glide gap-2 font-mono text-xs font-bold shadow-xs hover:bg-[#24292e]/10 border-border"
            >
              {githubLoading ? (
                <Brain className="size-3.5 animate-spin" />
              ) : (
                <Github className="size-3.5" />
              )}
              Push to GitHub
            </Button>
          )}

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !localCode.trim()}
            className="btn-glide gap-2 font-mono text-xs font-bold shadow-md shadow-primary/20 transition-all active:scale-95"
          >
            {loading ? (
              <>
                <Brain className="size-3.5 animate-spin" /> Reviewing & Simulating...
              </>
            ) : (
              <>
                <Sparkles className="size-3.5" /> Review & Step-by-Step Trace
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
});
