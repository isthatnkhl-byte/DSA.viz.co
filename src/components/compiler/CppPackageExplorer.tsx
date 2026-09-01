import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CPP_DSA_HEADERS } from "@/lib/compiler-headers";
import type { CppHeaderDoc } from "@/lib/compiler.types";
import { toast } from "sonner";

interface CppPackageExplorerProps {
  onInsertHeader: (headerInclude: string) => void;
  onLoadSnippet: (snippet: string) => void;
}

export function CppPackageExplorer({ onInsertHeader, onLoadSnippet }: CppPackageExplorerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedHeader, setExpandedHeader] = useState<string | null>("iostream");

  const filteredHeaders = useMemo(() => {
    if (!searchQuery.trim()) return CPP_DSA_HEADERS;
    const q = searchQuery.toLowerCase();
    return CPP_DSA_HEADERS.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.description.toLowerCase().includes(q) ||
        h.dsaUseCases.some((u) => u.toLowerCase().includes(q)) ||
        h.commonFunctions.some((f) => f.name.toLowerCase().includes(q)),
    );
  }, [searchQuery]);

  const toggleExpand = (name: string) => {
    setExpandedHeader(expandedHeader === name ? null : name);
  };

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
              C++ DSA Libraries &amp; Packages
            </h3>
            <p className="text-[10px] text-muted-foreground/80 font-medium">
              Standard headers for raw DSA problem practice
            </p>
          </div>
        </div>

        <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary">
          {CPP_DSA_HEADERS.length} Packages
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
                    &lt;{header.name}&gt;
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
                    title="Insert #include at top"
                    className="h-6 px-2 text-[10px] font-mono text-primary hover:bg-primary/15"
                  >
                    <Plus className="mr-0.5 size-2.5" /> Include
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

                  {/* Load Example Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onLoadSnippet(header.exampleSnippet);
                      toast.info(`Loaded <${header.name}> practice example`);
                    }}
                    className="mt-1 h-7 w-full gap-1.5 text-xs font-semibold"
                  >
                    <Code2 className="size-3 text-primary" />
                    <span>Load &lt;{header.name}&gt; Example</span>
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {filteredHeaders.length === 0 && (
          <div className="p-4 text-center text-xs text-muted-foreground">
            No matching C++ packages found for &quot;{searchQuery}&quot;
          </div>
        )}
      </div>
    </div>
  );
}
