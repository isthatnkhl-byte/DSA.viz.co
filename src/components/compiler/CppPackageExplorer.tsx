import React, { useState, useMemo, useEffect } from "react";
import {
  Package,
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  Code2,
  Play,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getHeadersForLanguage } from "@/lib/compiler-headers";
import type { SupportedLanguage } from "@/lib/compiler.types";
import { toast } from "sonner";

interface CppPackageExplorerProps {
  onInsertHeader: (headerInclude: string) => void;
  onLoadSnippet: (snippet: string) => void;
  language?: SupportedLanguage;
}

export function CppPackageExplorer({
  onInsertHeader,
  onLoadSnippet,
  language = "cpp",
}: CppPackageExplorerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const allHeaders = useMemo(() => getHeadersForLanguage(language), [language]);
  const [expandedHeader, setExpandedHeader] = useState<string | null>(allHeaders[0]?.name || null);
  const [copiedName, setCopiedName] = useState<string | null>(null);

  useEffect(() => {
    setExpandedHeader(allHeaders[0]?.name || null);
  }, [allHeaders]);

  const filteredHeaders = useMemo(() => {
    if (!searchQuery.trim()) return allHeaders;
    const q = searchQuery.toLowerCase();
    return allHeaders.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.description.toLowerCase().includes(q) ||
        h.dsaUseCases.some((u) => u.toLowerCase().includes(q)) ||
        h.commonFunctions.some((f) => f.name.toLowerCase().includes(q)),
    );
  }, [searchQuery, allHeaders]);

  const toggleExpand = (name: string) => {
    setExpandedHeader(expandedHeader === name ? null : name);
  };

  const languageLabels: Record<SupportedLanguage, { title: string; subtitle: string; tag: string }> = {
    cpp: {
      title: "C++ STL Headers & Containers",
      subtitle: "Standard library headers, member methods & ready-to-run snippets",
      tag: "Headers",
    },
    c: {
      title: "C Standard Library Headers",
      subtitle: "Core C headers, memory allocation & stdio utilities",
      tag: "Headers",
    },
    java: {
      title: "Java Collections & Packages",
      subtitle: "Collections framework, PriorityQueue, Maps & Fast I/O",
      tag: "Packages",
    },
    python: {
      title: "Python DSA Modules & Built-ins",
      subtitle: "heapq, collections.deque, bisect, functools & standard modules",
      tag: "Modules",
    },
  };

  const activeLabel = languageLabels[language] || languageLabels.cpp;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card/85 p-5 shadow-xl backdrop-blur-2xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 border border-primary/35 text-primary">
            <Package className="size-4.5" />
          </div>
          <div>
            <h3 className="font-mono text-sm font-bold text-foreground">
              {activeLabel.title}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {activeLabel.subtitle}
            </p>
          </div>
        </div>

        <span className="rounded-full border border-primary/35 bg-primary/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-primary shrink-0">
          {allHeaders.length} {activeLabel.tag}
        </span>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search STL / packages (e.g. vector, sort, map, queue, heapq)..."
          className="h-9 pl-9 font-mono text-xs bg-background/90 border-border/80"
        />
      </div>

      {/* Headers List */}
      <div className="flex flex-col gap-2.5 max-h-[520px] overflow-y-auto pr-1 scrollbar-thin">
        {filteredHeaders.map((header) => {
          const isExpanded = expandedHeader === header.name;
          return (
            <div
              key={header.name}
              className={`rounded-xl border transition-all ${
                isExpanded
                  ? "border-primary/60 bg-background/95 shadow-md"
                  : "border-border/70 bg-background/50 hover:bg-background/80"
              }`}
            >
              {/* Header Title Bar */}
              <div
                onClick={() => toggleExpand(header.name)}
                className="flex items-center justify-between p-3 cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="size-4 text-primary" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground" />
                  )}
                  <code className="font-mono text-xs sm:text-[13px] font-bold text-foreground">
                    {language === "cpp" || language === "c" ? `<${header.name}>` : header.name}
                  </code>
                </div>

                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onInsertHeader(header.include);
                    }}
                    title={
                      language === "python" || language === "java"
                        ? "Insert import at top of file"
                        : "Insert #include at top of file"
                    }
                    className="h-7 px-2.5 text-[11px] font-mono font-bold text-primary border-primary/40 bg-primary/10 hover:bg-primary hover:text-primary-foreground cursor-pointer"
                  >
                    <Plus className="mr-1 size-3" />
                    {language === "python" || language === "java" ? "Import" : "Include"}
                  </Button>
                </div>
              </div>

              {/* Expanded Documentation Details */}
              {isExpanded && (
                <div className="border-t border-border/60 p-3.5 pt-3 text-xs flex flex-col gap-3">
                  <p className="text-foreground/90 text-xs leading-relaxed">
                    {header.description}
                  </p>

                  {/* DSA Use cases */}
                  <div className="flex flex-wrap gap-1.5">
                    {header.dsaUseCases.map((useCase, idx) => (
                      <span
                        key={idx}
                        className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary"
                      >
                        #{useCase}
                      </span>
                    ))}
                  </div>

                  {/* Common Member Functions */}
                  <div className="flex flex-col gap-1.5">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Common Methods &amp; Complexity:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {header.commonFunctions.map((fn) => (
                        <div
                          key={fn.name}
                          className="rounded-lg border border-border/70 bg-secondary/45 p-2 font-mono text-[11px] flex flex-col gap-0.5"
                        >
                          <div className="text-primary font-bold">{fn.signature}</div>
                          <div className="text-muted-foreground text-[10px] leading-snug">{fn.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* High-Contrast Code Snippet Example Preview & Load */}
                  <div className="mt-1 flex flex-col gap-2 rounded-xl border border-slate-700/80 bg-[#0b0f19] p-3 shadow-inner">
                    <div className="flex items-center justify-between text-[11px] font-mono font-bold text-indigo-300">
                      <span className="flex items-center gap-1.5">
                        <Code2 className="size-3.5 text-primary" />
                        <span>Runnable Example Snippet</span>
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(header.exampleSnippet);
                            setCopiedName(header.name);
                            toast.success("Snippet copied to clipboard");
                            setTimeout(() => setCopiedName(null), 1800);
                          } catch {
                            toast.error("Failed to copy snippet");
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-200 hover:bg-slate-700 cursor-pointer"
                      >
                        {copiedName === header.name ? (
                          <>
                            <Check className="size-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="size-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="max-h-44 overflow-auto rounded-lg bg-[#060911] border border-slate-800 p-3 font-mono text-xs text-slate-100 whitespace-pre leading-relaxed">
                      {header.exampleSnippet}
                    </pre>
                    <Button
                      size="sm"
                      onClick={() => {
                        onLoadSnippet(header.exampleSnippet);
                        toast.success(`Loaded ${header.name} example into Code Sheet`);
                      }}
                      className="h-8 w-full gap-1.5 text-xs font-mono font-bold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-95 transition-all cursor-pointer"
                    >
                      <Play className="size-3 fill-current" />
                      <span>Load Snippet into Code Sheet</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredHeaders.length === 0 && (
          <div className="p-6 text-center text-xs text-muted-foreground">
            No matching libraries found for &quot;{searchQuery}&quot;
          </div>
        )}
      </div>
    </div>
  );
}
