import React, { useState, useMemo, useEffect } from "react";
import {
  Package,
  Search,
  Plus,
  FileCode,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Code2,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getHeadersForLanguage } from "@/lib/compiler-headers";
import type { CppHeaderDoc, SupportedLanguage } from "@/lib/compiler.types";
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

  // Sync expanded header when language changes
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
      title: "C++ DSA Libraries & STL",
      subtitle: "Standard headers & containers for competitive programming",
      tag: "Headers",
    },
    c: {
      title: "C Standard Libraries",
      subtitle: "Core C headers & memory utilities for DSA problem solving",
      tag: "Headers",
    },
    java: {
      title: "Java Collections & Packages",
      subtitle: "Standard collections framework & I/O classes",
      tag: "Packages",
    },
    python: {
      title: "Python DSA Modules & Libs",
      subtitle: "Built-in algorithmic data structures & standard modules",
      tag: "Modules",
    },
  };

  const activeLabel = languageLabels[language] || languageLabels.cpp;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-card/40 p-5 shadow-lg backdrop-blur-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/5 border border-primary/20 text-primary shadow-inner">
            <Package className="size-4" />
          </div>
          <div>
            <h3 className="font-mono text-sm font-bold text-foreground tracking-tight">
              {activeLabel.title}
            </h3>
            <p className="text-[10px] text-muted-foreground/80 font-medium">
              {activeLabel.subtitle}
            </p>
          </div>
        </div>

        <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary">
          {allHeaders.length} {activeLabel.tag}
        </span>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search headers (e.g. vector, sort, map, queue)..."
          className="h-8 pl-8 font-mono text-xs bg-background/80"
        />
      </div>

      {/* Headers List */}
      <div className="flex flex-col gap-2 max-h-[440px] overflow-y-auto pr-1 scrollbar-thin">
        {filteredHeaders.map((header) => {
          const isExpanded = expandedHeader === header.name;
          return (
            <div
              key={header.name}
              className={`rounded-xl border transition-all ${
                isExpanded
                  ? "border-primary/50 bg-background/90 shadow-xs"
                  : "border-border/60 bg-background/40 hover:bg-background/70"
              }`}
            >
              {/* Header Title Bar */}
              <div
                onClick={() => toggleExpand(header.name)}
                className="flex items-center justify-between p-2.5 cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="size-3.5 text-primary" />
                  ) : (
                    <ChevronRight className="size-3.5 text-muted-foreground" />
                  )}
                  <code className="font-mono text-xs font-bold text-foreground">
                    {language === "cpp" || language === "c" ? `<${header.name}>` : header.name}
                  </code>
                </div>

                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onInsertHeader(header.include);
                      toast.success(`Inserted ${header.include}`);
                    }}
                    title={language === "python" || language === "java" ? "Insert import at top" : "Insert #include at top"}
                    className="h-6 px-2 text-[10px] font-mono text-primary hover:bg-primary/15"
                  >
                    <Plus className="mr-0.5 size-2.5" /> {language === "python" || language === "java" ? "Import" : "Include"}
                  </Button>
                </div>
              </div>

              {/* Expanded Documentation Details */}
              {isExpanded && (
                <div className="border-t border-border/50 p-3 pt-2 text-xs flex flex-col gap-2.5 animate-fade">
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    {header.description}
                  </p>

                  {/* DSA Use cases */}
                  <div className="flex flex-wrap gap-1">
                    {header.dsaUseCases.map((useCase, idx) => (
                      <span
                        key={idx}
                        className="rounded-md border border-border/70 bg-card/60 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground"
                      >
                        🏷️ {useCase}
                      </span>
                    ))}
                  </div>

                  {/* Common Member Functions */}
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] font-bold uppercase text-muted-foreground">
                      Key Functions:
                    </span>
                    <div className="grid grid-cols-1 gap-1">
                      {header.commonFunctions.map((fn) => (
                        <div
                          key={fn.name}
                          className="rounded bg-muted/40 p-1.5 font-mono text-[10px] flex flex-col gap-0.5"
                        >
                          <div className="text-primary font-semibold">{fn.signature}</div>
                          <div className="text-muted-foreground text-[9px]">{fn.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Code Snippet Example Preview & Load */}
                  <div className="mt-1.5 flex flex-col gap-1.5 rounded-xl border border-primary/20 bg-muted/40 p-2.5 shadow-inner">
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold text-primary uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <Code2 className="size-3.5" /> Code Snippet:
                      </span>
                      <span className="text-[9px] text-muted-foreground font-normal">Example</span>
                    </div>
                    <pre className="max-h-28 overflow-x-auto rounded-lg bg-card/80 border border-border/70 p-2 font-mono text-[10px] text-foreground whitespace-pre-wrap leading-relaxed shadow-xs">
                      {header.exampleSnippet}
                    </pre>
                    <Button
                      size="sm"
                      onClick={() => {
                        onLoadSnippet(header.exampleSnippet);
                        toast.info(`Loaded ${header.name} code snippet`);
                      }}
                      className="mt-0.5 h-7 w-full gap-1.5 text-xs font-mono font-bold bg-primary text-primary-foreground shadow-sm hover:scale-[1.01] active:scale-95 transition-all cursor-pointer"
                    >
                      <Play className="size-3 fill-current" />
                      <span>Load Snippet into Editor</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredHeaders.length === 0 && (
          <div className="p-4 text-center text-xs text-muted-foreground">
            No matching items found for &quot;{searchQuery}&quot;
          </div>
        )}
      </div>
    </div>
  );
}
