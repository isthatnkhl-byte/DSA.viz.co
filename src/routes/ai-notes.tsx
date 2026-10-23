import React, { useState, useMemo, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  FileText,
  Download,
  Printer,
  Trash2,
  Plus,
  CheckSquare,
  Square,
  Layers,
  Search,
  BookOpen,
  Code2,
  PenTool,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Eye,
  X,
  FileDown,
  Info,
  Hash,
  Bookmark,
  Sun,
  Moon,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { useNotesBag, INITIAL_SAMPLE_NOTES } from "@/context/NotesBagContext";
import { NotesBagItem, NoteSourceType, PdfCompilationResponse } from "@/lib/notes/types";
import { compileHandwrittenNotesHtml } from "@/lib/notes/pdf-compiler";
import { parseNotesFromJson } from "@/lib/notes/json-importer";
import { Button } from "@/components/ui/button";
import { useThemeColor } from "@/hooks/useThemeColor";
import { AiWord } from "@/components/brand/AiWord";
import { SingleLineBagIcon } from "@/components/notes/SingleLineBagIcon";

export const Route = createFileRoute("/ai-notes" as any)({
  head: () => ({
    meta: [
      { title: "AI Notes & Handwritten Algorithm PDF Compiler — DSA.viz.co" },
      {
        name: "description",
        content:
          "Synthesize multi-page handwritten algorithm notebooks, LeetCode invariants, Excalidraw whiteboards, and compiler solutions into clean printable A4 revision booklets with calibrated 2-3 items per page layout.",
      },
      {
        name: "keywords",
        content:
          "algorithm handwritten notes, DSA revision notes, multi page algorithm PDF, LeetCode cheat sheet generator, handwritten notebook compiler, data structures revision booklet, DSA.viz.co notes",
      },
      { property: "og:title", content: "AI Notes & Multi-Page Handwritten PDF Engine — DSA.viz.co" },
      {
        property: "og:description",
        content:
          "Collect algorithm solutions, invariant proofs, whiteboard diagrams, and compiler runs into beautifully styled handwritten A4 notebook pages.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://dsa.viz.co/ai-notes" },
      { property: "og:image", content: "https://dsa.viz.co/og-image.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@dsaviz" },
      { name: "twitter:title", content: "AI Notes & Multi-Page Handwritten PDF Engine — DSA.viz.co" },
      {
        name: "twitter:description",
        content:
          "Synthesize multi-page handwritten algorithm notes, invariant proofs, and compiler runs into clean A4 printable sheets.",
      },
      { name: "twitter:image", content: "https://dsa.viz.co/og-image.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://dsa.viz.co/ai-notes" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "DSA.viz.co AI Notes Engine",
          "applicationCategory": "EducationalApplication",
          "operatingSystem": "Web",
          "url": "https://dsa.viz.co/ai-notes",
          "description": "Multi-page handwritten-style PDF compiler and algorithm revision notebook engine.",
          "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://dsa.viz.co/" },
            { "@type": "ListItem", "position": 2, "name": "AI Notes", "item": "https://dsa.viz.co/ai-notes" },
          ],
        }),
      },
    ],
  }),
  component: AiNotesDashboardPage,
});

export function AiNotesDashboardPage() {
  const {
    items,
    removeItem,
    updateItem,
    clearBag,
    selectedItemIds,
    toggleSelectItem,
    selectAllItems,
    deselectAllItems,
    addItem,
    addItems,
  } = useNotesBag();

  const { mode, toggleMode, isDark } = useThemeColor();

  // Synthesis configuration
  const [docTitle, setDocTitle] = useState("DSA Technical Interview & Algorithm Cheatsheet");
  const [itemsPerPage, setItemsPerPage] = useState<2 | 3>(2);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCompiling, setIsCompiling] = useState(false);

  // Modal / Preview state
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [compilationMeta, setCompilationMeta] = useState<PdfCompilationResponse | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isAddCustomModalOpen, setIsAddCustomModalOpen] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [imageLightboxUrl, setImageLightboxUrl] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New custom note form state
  const [newTitle, setNewTitle] = useState("");
  const [newSourceType, setNewSourceType] = useState<NoteSourceType>("CUSTOM_NOTE");
  const [newCodeSnippet, setNewCodeSnippet] = useState("");
  const [newCodeLanguage, setNewCodeLanguage] = useState("cpp");
  const [newInvariant, setNewInvariant] = useState("");
  const [newUserNotes, setNewUserNotes] = useState("");
  const [newAiTakeaway, setNewAiTakeaway] = useState("");
  const [newTags, setNewTags] = useState("");

  // Filtered and searched items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Filter by source type
      if (activeFilter !== "ALL" && item.sourceType !== activeFilter) {
        return false;
      }
      // Search text filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesCode = item.codeSnippet?.toLowerCase().includes(q);
        const matchesUserNotes = item.userNotes?.toLowerCase().includes(q);
        const matchesInvariant = item.invariantText?.toLowerCase().includes(q);
        const matchesAi = item.aiTakeaway?.toLowerCase().includes(q);
        const matchesTags = item.tags.some((t) => t.toLowerCase().includes(q));
        return matchesTitle || matchesCode || matchesUserNotes || matchesInvariant || matchesAi || matchesTags;
      }
      return true;
    });
  }, [items, activeFilter, searchQuery]);

  // Selected items strictly for PDF compilation
  const selectedItems = useMemo(() => {
    return items.filter((i) => selectedItemIds.includes(i.id));
  }, [items, selectedItemIds]);

  // Estimated page count based on strict itemsPerPage limit
  const estimatedPages = useMemo(() => {
    if (selectedItems.length === 0) return 0;
    return Math.ceil(selectedItems.length / itemsPerPage);
  }, [selectedItems.length, itemsPerPage]);

  const handleCompilePdf = async () => {
    if (selectedItems.length === 0) {
      toast.error("Please select at least 1 note to synthesize PDF");
      return;
    }

    setIsCompiling(true);
    try {
      // Strict pagination compiler: maximum 2 or 3 items per page to prevent layout overflow
      const { html, totalPages } = compileHandwrittenNotesHtml(selectedItems, {
        itemsPerPage,
        documentTitle: docTitle,
        styleTheme: "HANDWRITTEN_NOTEBOOK",
        includeAiSummaries: true,
      });

      setPreviewHtml(html);
      setCompilationMeta({
        ok: true,
        htmlDocument: html,
        totalPages,
        itemsPerPage,
        totalItems: selectedItems.length,
        title: docTitle,
      });
      setIsPreviewModalOpen(true);
      toast.success(`Synthesized ${totalPages} handwritten A4 pages (${selectedItems.length} items)`);
    } catch (err: any) {
      toast.error(`Compilation error: ${err?.message || "Unknown error"}`);
    } finally {
      setIsCompiling(false);
    }
  };

  const handlePrint = () => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) {
      toast.error("Preview frame not ready yet");
      return;
    }
    iframeRef.current.contentWindow.focus();
    iframeRef.current.contentWindow.print();
  };

  const handleDownloadHtml = () => {
    if (!previewHtml) return;
    const blob = new Blob([previewHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${docTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-notes.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded HTML document.");
  };

  const handleOpenNewTab = () => {
    if (!previewHtml) return;
    const blob = new Blob([previewHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const result = parseNotesFromJson(content, file.name);

        if (!result.success || result.importedItems.length === 0) {
          toast.error(result.errorMessage || "Could not parse valid note data from file.");
        } else {
          addItems(result.importedItems);
          toast.success(`Successfully imported ${result.importedItems.length} note(s) from "${file.name}"!`);
        }
      } catch (err: any) {
        toast.error(`Import failed: ${err?.message || "Invalid file content"}`);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    reader.onerror = () => {
      toast.error("Failed to read the file");
      if (fileInputRef.current) fileInputRef.current.value = "";
    };

    reader.readAsText(file);
  };

  const handleRestoreSamples = () => {
    INITIAL_SAMPLE_NOTES.forEach((sample) => {
      addItem({
        title: sample.title,
        sourceType: sample.sourceType,
        tags: sample.tags,
        codeSnippet: sample.codeSnippet,
        codeLanguage: sample.codeLanguage,
        invariantText: sample.invariantText,
        activePointers: sample.activePointers,
        userNotes: sample.userNotes,
        aiTakeaway: sample.aiTakeaway,
      });
    });
    toast.success("Restored sample algorithm notes");
  };

  const handleAddCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error("Please enter a note title");
      return;
    }

    const tagsArray = newTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    addItem({
      title: newTitle.trim(),
      sourceType: newSourceType,
      codeSnippet: newCodeSnippet.trim() || undefined,
      codeLanguage: newCodeLanguage,
      invariantText: newInvariant.trim() || undefined,
      userNotes: newUserNotes.trim() || undefined,
      aiTakeaway: newAiTakeaway.trim() || undefined,
      tags: tagsArray.length > 0 ? tagsArray : ["CustomNote"],
    });

    // Reset form
    setNewTitle("");
    setNewCodeSnippet("");
    setNewInvariant("");
    setNewUserNotes("");
    setNewAiTakeaway("");
    setNewTags("");
    setIsAddCustomModalOpen(false);
  };

  const getSourceBadge = (type: NoteSourceType) => {
    switch (type) {
      case "COMPILER_CODE":
        return {
          label: "COMPILER RUN",
          color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
          icon: <Code2 className="size-3" />,
        };
      case "SMARTBOARD_WHITEBOARD":
        return {
          label: "WHITEBOARD CANVAS",
          color: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
          icon: <PenTool className="size-3" />,
        };
      case "VISUALIZER_TRACE":
        return {
          label: "VISUALIZER TRACE",
          color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
          icon: <Layers className="size-3" />,
        };
      case "AI_LEARNING_MODULE":
        return {
          label: "AI LEARNING",
          color: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
          icon: <AiWord variant="chip" className="text-[9px]" />,
        };
      case "PROBLEM_SOLUTION":
        return {
          label: "PROBLEM SOLUTION",
          color: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
          icon: <BookOpen className="size-3" />,
        };
      default:
        return {
          label: "CUSTOM NOTE",
          color: "bg-muted text-muted-foreground border-border",
          icon: <FileText className="size-3" />,
        };
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-200">
      <SiteHeader />

      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Banner */}
        <section className="relative border-2 border-border bg-card p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)] dark:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.6)]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/15 border border-primary/40 text-primary font-mono text-xs font-semibold tracking-wider uppercase rounded-xs">
                  <AiWord variant="badge" />
                  <span>Multi-Page Handwritten PDF Engine</span>
                </div>

                {/* Quick Theme Toggle Button */}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xs border border-border bg-muted/60 hover:bg-muted text-foreground font-mono text-xs font-semibold transition-colors cursor-pointer"
                  title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
                >
                  {isDark ? (
                    <>
                      <Sun className="size-3.5 text-amber-400" />
                      <span>Light Mode</span>
                    </>
                  ) : (
                    <>
                      <Moon className="size-3.5 text-indigo-500" />
                      <span>Dark Mode</span>
                    </>
                  )}
                </button>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black font-display tracking-tight text-foreground flex items-center gap-2">
                <span>AI NOTES</span>
                <span className="text-primary font-mono font-normal">/</span>
                <span>DASHBOARD</span>
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Collect algorithm solutions, visualizer invariant states, Excalidraw whiteboards, and compiler runs
                from anywhere across the platform. Compile them into a beautifully rendered multi-page handwritten
                notebook PDF with ruled paper, margin lines, and sticky note annotations.
              </p>
            </div>

            {/* Quick Synthesis Control Box */}
            <div className="flex flex-col gap-3 min-w-[280px] bg-background/90 border border-border p-4 shadow-inner rounded-sm">
              <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                <span>PAGINATION DENSITY:</span>
                <span className="text-primary font-bold">{itemsPerPage} ITEMS / PAGE</span>
              </div>

              {/* Items per page selector: strictly 2 or 3 */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setItemsPerPage(2)}
                  className={`px-3 py-2 text-xs font-mono font-bold uppercase border transition-all cursor-pointer ${
                    itemsPerPage === 2
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-muted text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  2 Per Page (Ideal)
                </button>
                <button
                  type="button"
                  onClick={() => setItemsPerPage(3)}
                  className={`px-3 py-2 text-xs font-mono font-bold uppercase border transition-all cursor-pointer ${
                    itemsPerPage === 3
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-muted text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  3 Per Page (Compact)
                </button>
              </div>

              <div className="text-[10px] font-mono text-muted-foreground italic leading-tight">
                *Strict 2–3 items limit guarantees A4 layout integrity, handwritten font legibility, and diagram margins.
              </div>

              <Button
                type="button"
                onClick={handleCompilePdf}
                disabled={isCompiling || selectedItems.length === 0}
                className="w-full h-11 bg-primary text-primary-foreground font-mono font-bold text-xs uppercase tracking-wider border-2 border-primary/80 hover:bg-primary/90 shadow-sm cursor-pointer"
              >
                {isCompiling ? (
                  <>
                    <RefreshCw className="size-4 animate-spin mr-2" />
                    <span>Compiling PDF...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="size-4 mr-2" />
                    <span>Synthesize PDF ({estimatedPages} {estimatedPages === 1 ? "Page" : "Pages"})</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-6 pt-6 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-background/80 p-3 border border-border">
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">BAG CAPACITY</div>
              <div className="text-xl sm:text-2xl font-black font-mono text-foreground mt-0.5">
                {items.length} <span className="text-xs text-muted-foreground font-normal">items</span>
              </div>
            </div>
            <div className="bg-background/80 p-3 border border-border">
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">SELECTED FOR PDF</div>
              <div className="text-xl sm:text-2xl font-black font-mono text-primary mt-0.5">
                {selectedItems.length} <span className="text-xs text-muted-foreground font-normal">items</span>
              </div>
            </div>
            <div className="bg-background/80 p-3 border border-border">
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">PROJECTED A4 PAGES</div>
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                {estimatedPages} <span className="text-xs text-muted-foreground font-normal">pages</span>
              </div>
            </div>
            <div className="bg-background/80 p-3 border border-border">
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">CANVAS / WHITEBOARDS</div>
              <div className="text-xl sm:text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                {items.filter((i) => i.canvasSnapshotUrl || i.sourceType === "SMARTBOARD_WHITEBOARD").length}
              </div>
            </div>
          </div>
        </section>

        {/* Action & Filter Toolbar */}
        <section className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-card border border-border p-4 shadow-xs">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code, tags, invariant proof..."
              className="w-full bg-background border border-border pl-9 pr-4 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Quick Selection, Upload & Custom Note Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Hidden JSON file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json,.txt"
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted border border-border text-xs font-mono text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
              title="Upload LeetCode visualization JSON or Notes Bag file"
            >
              <Upload className="size-3.5 text-primary" />
              <span>Upload JSON</span>
            </button>

            <button
              type="button"
              onClick={selectAllItems}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted border border-border text-xs font-mono text-foreground hover:border-primary transition-colors cursor-pointer"
            >
              <CheckSquare className="size-3.5 text-primary" />
              <span>Select All</span>
            </button>
            <button
              type="button"
              onClick={deselectAllItems}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted border border-border text-xs font-mono text-foreground hover:border-primary transition-colors cursor-pointer"
            >
              <Square className="size-3.5" />
              <span>Deselect</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddCustomModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/15 border border-primary/40 text-xs font-mono text-primary font-bold hover:bg-primary/25 transition-colors cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>Add Custom Note</span>
            </button>
            {items.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("Are you sure you want to clear your entire Notes Bag?")) {
                    clearBag();
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 text-xs font-mono text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
              >
                <Trash2 className="size-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </section>

        {/* Source Type Filter Chips */}
        <section className="flex flex-wrap items-center gap-2">
          {[
            { id: "ALL", label: "All Items", count: items.length },
            {
              id: "COMPILER_CODE",
              label: "Compiler Code",
              count: items.filter((i) => i.sourceType === "COMPILER_CODE").length,
            },
            {
              id: "SMARTBOARD_WHITEBOARD",
              label: "Whiteboard Canvas",
              count: items.filter((i) => i.sourceType === "SMARTBOARD_WHITEBOARD").length,
            },
            {
              id: "VISUALIZER_TRACE",
              label: "Visualizer Trace",
              count: items.filter((i) => i.sourceType === "VISUALIZER_TRACE").length,
            },
            {
              id: "AI_LEARNING_MODULE",
              label: "AI Lessons",
              count: items.filter((i) => i.sourceType === "AI_LEARNING_MODULE").length,
            },
            {
              id: "PROBLEM_SOLUTION",
              label: "Problem Solution",
              count: items.filter((i) => i.sourceType === "PROBLEM_SOLUTION").length,
            },
            {
              id: "CUSTOM_NOTE",
              label: "Custom Notes",
              count: items.filter((i) => i.sourceType === "CUSTOM_NOTE").length,
            },
          ].map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className={`px-3 py-1.5 font-mono text-xs font-medium border transition-colors cursor-pointer ${
                activeFilter === filter.id
                  ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                  : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
              }`}
            >
              <span>{filter.label}</span>
              <span className="ml-1.5 text-[10px] opacity-75">({filter.count})</span>
            </button>
          ))}
        </section>

        {/* Document Title Customizer */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-card border border-border p-3 text-xs font-mono shadow-xs">
          <span className="text-muted-foreground uppercase tracking-wider shrink-0 flex items-center gap-1.5">
            <Bookmark className="size-3.5 text-primary" />
            PDF COVER TITLE:
          </span>
          <input
            type="text"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            className="flex-1 bg-background border border-border px-3 py-1.5 font-mono text-xs text-foreground focus:outline-none focus:border-primary"
            placeholder="Document title printed on cover..."
          />
        </div>

        {/* Main Note Items Grid */}
        {filteredItems.length === 0 ? (
          <div className="border-2 border-dashed border-border bg-card p-12 text-center space-y-4 shadow-xs">
            <div className="size-14 mx-auto rounded-full bg-muted flex items-center justify-center text-primary">
              <SingleLineBagIcon className="size-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold font-display text-foreground">Your Notes Bag is Empty</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Collect snippets from the Compiler, Visualizer states, or Excalidraw Smartboard using the
                <span className="text-primary font-mono font-semibold"> "Add to Notes"</span> button, or upload an algorithm JSON file directly.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-primary text-primary-foreground font-mono text-xs font-bold border border-primary hover:bg-primary/90 cursor-pointer"
              >
                <Upload className="size-3.5 mr-1.5" />
                <span>Upload Algorithm JSON</span>
              </Button>
              <Button
                type="button"
                onClick={handleRestoreSamples}
                className="bg-muted text-foreground font-mono text-xs font-bold border border-border hover:bg-muted/80 cursor-pointer"
              >
                <AiWord variant="chip" className="mr-1.5" />
                <span>Restore Starter Notes</span>
              </Button>
              <Link
                to="/compiler"
                className="px-4 py-2 bg-muted border border-border text-xs font-mono text-foreground hover:border-primary transition-colors"
              >
                Go to Compiler
              </Link>
              <Link
                to="/playground"
                className="px-4 py-2 bg-muted border border-border text-xs font-mono text-foreground hover:border-primary transition-colors"
              >
                Go to Visualizer
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredItems.map((item, index) => {
              const isSelected = selectedItemIds.includes(item.id);
              const badge = getSourceBadge(item.sourceType);

              return (
                <article
                  key={item.id}
                  className={`relative flex flex-col border-2 transition-all bg-card shadow-[3px_3px_0px_0px_rgba(0,0,0,0.06)] dark:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] ${
                    isSelected
                      ? "border-primary ring-1 ring-primary/40"
                      : "border-border opacity-85 hover:opacity-100 hover:border-border/80"
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 p-4 border-b border-border bg-muted/30">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleSelectItem(item.id)}
                        className="mt-1 shrink-0 text-primary transition-transform hover:scale-110 cursor-pointer"
                        title={isSelected ? "Uncheck from PDF" : "Include in PDF"}
                      >
                        {isSelected ? (
                          <CheckSquare className="size-5 fill-primary text-primary-foreground" />
                        ) : (
                          <Square className="size-5 text-muted-foreground" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 border text-[10px] font-mono font-bold tracking-wider uppercase rounded-xs ${badge.color}`}
                          >
                            {badge.icon}
                            <span>{badge.label}</span>
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-foreground font-mono leading-snug truncate" title={item.title}>
                          {item.title}
                        </h3>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer rounded-xs"
                      title="Remove from bag"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-4 flex-1 flex flex-col">
                    {/* Tags */}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {item.tags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted/60 border border-border text-[10px] font-mono text-muted-foreground rounded-xs"
                          >
                            <Hash className="size-2.5 opacity-60" />
                            <span>{tag}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Canvas Snapshot Thumbnail */}
                    {item.canvasSnapshotUrl && (
                      <div className="relative group border border-border bg-white overflow-hidden max-h-48 flex items-center justify-center rounded-sm">
                        <img
                          src={item.canvasSnapshotUrl}
                          alt={item.title}
                          className="object-contain w-full h-auto max-h-48 cursor-pointer"
                          onClick={() => setImageLightboxUrl(item.canvasSnapshotUrl || null)}
                        />
                        <button
                          type="button"
                          onClick={() => setImageLightboxUrl(item.canvasSnapshotUrl || null)}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 text-white font-mono text-xs transition-opacity cursor-pointer"
                        >
                          <Eye className="size-4" />
                          <span>Expand Canvas Preview</span>
                        </button>
                      </div>
                    )}

                    {/* Code Snippet Box */}
                    {item.codeSnippet && (
                      <div className="relative border border-border bg-muted/70 p-3 rounded-xs">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/80 text-[10px] font-mono text-muted-foreground">
                          <span className="uppercase text-primary font-semibold">
                            {item.codeLanguage || "CODE"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(item.id, item.codeSnippet!)}
                            className="flex items-center gap-1 hover:text-foreground cursor-pointer"
                          >
                            {copiedCodeId === item.id ? (
                              <>
                                <Check className="size-3 text-emerald-500" />
                                <span className="text-emerald-500">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="size-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="font-mono text-xs text-foreground overflow-x-auto max-h-40 leading-relaxed no-scrollbar select-text">
                          <code>{item.codeSnippet}</code>
                        </pre>
                      </div>
                    )}

                    {/* Invariant Proof / State Box */}
                    {item.invariantText && (
                      <div className="border-l-2 border-amber-500 bg-amber-500/10 p-2.5 space-y-1 rounded-r-xs">
                        <div className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                          <Info className="size-3" />
                          <span>Algorithm Invariant</span>
                        </div>
                        <p className="text-xs text-foreground leading-relaxed italic">
                          "{item.invariantText}"
                        </p>
                      </div>
                    )}

                    {/* AI Key Takeaway */}
                    {item.aiTakeaway && (
                      <div className="border-l-2 border-primary bg-primary/10 p-2.5 space-y-1 rounded-r-xs">
                        <div className="text-[10px] font-mono font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                          <AiWord variant="chip" className="text-[9px]" />
                          <span>AI Key Takeaway</span>
                        </div>
                        <p className="text-xs text-foreground leading-relaxed">
                          {item.aiTakeaway}
                        </p>
                      </div>
                    )}

                    {/* Active Pointers / Variables */}
                    {item.activePointers && Object.keys(item.activePointers).length > 0 && (
                      <div className="bg-muted/50 border border-border p-2 flex flex-wrap gap-2 text-[10px] font-mono rounded-xs">
                        <span className="text-muted-foreground uppercase font-semibold">POINTER STATE:</span>
                        {Object.entries(item.activePointers).map(([k, v]) => (
                          <span key={k} className="px-1.5 py-0.5 bg-background border border-border text-amber-600 dark:text-amber-400 rounded-xs">
                            {k} = {String(v)}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* User Editable Annotation Field */}
                    <div className="mt-auto pt-2 space-y-1">
                      <label className="block text-[10px] font-mono text-muted-foreground uppercase">
                        Handwritten Margin Note (User Annotation):
                      </label>
                      <textarea
                        value={item.userNotes || ""}
                        onChange={(e) => updateItem(item.id, { userNotes: e.target.value })}
                        placeholder="Write personal interview tip or memory trick here (will appear on ruled lines)..."
                        rows={2}
                        className="w-full bg-background border border-border p-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none rounded-xs"
                      />
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                    <span>Item #{index + 1}</span>
                    <span className={isSelected ? "text-primary font-bold" : "text-muted-foreground"}>
                      {isSelected ? "Included in PDF" : "Excluded from PDF"}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* PDF Synthesis Preview Modal */}
      {isPreviewModalOpen && previewHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-6xl h-[92vh] flex flex-col bg-card border-2 border-primary shadow-2xl rounded-sm overflow-hidden text-card-foreground">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/15 text-primary border border-primary/40 rounded-xs">
                  <Printer className="size-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold font-mono text-foreground">
                    {compilationMeta?.title || docTitle}
                  </h2>
                  <p className="text-xs font-mono text-muted-foreground">
                    {compilationMeta?.totalPages || estimatedPages} Pages Generated • {compilationMeta?.itemsPerPage || itemsPerPage} items/page strict layout
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={handlePrint}
                  className="bg-primary text-primary-foreground font-mono font-bold text-xs uppercase px-4 py-2 hover:bg-primary/90 border border-primary/80 shadow-xs cursor-pointer"
                >
                  <Printer className="size-4 mr-1.5" />
                  <span>Print / Save PDF</span>
                </Button>

                <button
                  type="button"
                  onClick={handleDownloadHtml}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 bg-muted border border-border text-xs font-mono text-foreground hover:border-primary transition-colors cursor-pointer rounded-xs"
                  title="Download standalone HTML document"
                >
                  <Download className="size-4" />
                  <span>Download .html</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenNewTab}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 bg-muted border border-border text-xs font-mono text-foreground hover:border-primary transition-colors cursor-pointer rounded-xs"
                  title="Open in new window"
                >
                  <ExternalLink className="size-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ml-2 cursor-pointer rounded-xs"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Embedded iframe with compiled handwritten HTML */}
            <div className="flex-1 bg-neutral-900 dark:bg-neutral-950 p-2 sm:p-4 overflow-hidden relative">
              <iframe
                ref={iframeRef}
                srcDoc={previewHtml}
                title="Handwritten Notes Preview"
                className="w-full h-full border border-border shadow-2xl bg-white"
              />
            </div>

            {/* Modal Footer Note */}
            <div className="px-6 py-2.5 border-t border-border bg-muted/40 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono text-muted-foreground">
              <span>
                💡 Tip: Click "Print / Save PDF" and select "Save as PDF" in your browser print dialogue.
              </span>
              <span className="text-primary font-bold">
                A4 Portrait Format • Margins & Ruled Lines Calibrated
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Note Modal */}
      {isAddCustomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-xl bg-card border-2 border-primary p-6 shadow-2xl rounded-sm space-y-5 text-card-foreground">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Plus className="size-5 text-primary" />
                <h3 className="text-base font-bold font-mono text-foreground">Add Custom Note to Bag</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCustomModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomSubmit} className="space-y-4 text-xs font-mono">
              <div className="space-y-1">
                <label className="block text-muted-foreground uppercase">Note Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Kadane's Algorithm — Dynamic Programming State Transition"
                  className="w-full bg-background border border-border px-3 py-2 text-foreground focus:outline-none focus:border-primary rounded-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-muted-foreground uppercase">Source Category</label>
                  <select
                    value={newSourceType}
                    onChange={(e) => setNewSourceType(e.target.value as NoteSourceType)}
                    className="w-full bg-background border border-border px-3 py-2 text-foreground focus:outline-none focus:border-primary rounded-xs"
                  >
                    <option value="CUSTOM_NOTE">Custom Student Note</option>
                    <option value="COMPILER_CODE">Compiler Code Snippet</option>
                    <option value="VISUALIZER_TRACE">Visualizer Trace / Invariant</option>
                    <option value="SMARTBOARD_WHITEBOARD">Smartboard Whiteboard</option>
                    <option value="AI_LEARNING_MODULE">AI Learning Lesson</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-muted-foreground uppercase">Language</label>
                  <select
                    value={newCodeLanguage}
                    onChange={(e) => setNewCodeLanguage(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2 text-foreground focus:outline-none focus:border-primary rounded-xs"
                  >
                    <option value="cpp">C++ (std::vector)</option>
                    <option value="python">Python 3</option>
                    <option value="javascript">JavaScript / TypeScript</option>
                    <option value="java">Java 21</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-muted-foreground uppercase">Code Snippet (Optional)</label>
                <textarea
                  value={newCodeSnippet}
                  onChange={(e) => setNewCodeSnippet(e.target.value)}
                  placeholder="int maxSubArray(vector<int>& nums) { ... }"
                  rows={4}
                  className="w-full bg-background border border-border p-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-mono rounded-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-muted-foreground uppercase">Algorithm Invariant Proof (Optional)</label>
                <input
                  type="text"
                  value={newInvariant}
                  onChange={(e) => setNewInvariant(e.target.value)}
                  placeholder="e.g., current_sum >= 0 holds before adding nums[i]"
                  className="w-full bg-background border border-border px-3 py-2 text-foreground focus:outline-none focus:border-primary rounded-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-muted-foreground uppercase">Personal Margin Notes</label>
                <textarea
                  value={newUserNotes}
                  onChange={(e) => setNewUserNotes(e.target.value)}
                  placeholder="Key interview caveat or edge cases to remember..."
                  rows={2}
                  className="w-full bg-background border border-border p-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary rounded-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-muted-foreground uppercase">Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="DP, Kadane, GoogleOA, MustReview"
                  className="w-full bg-background border border-border px-3 py-2 text-foreground focus:outline-none focus:border-primary rounded-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddCustomModalOpen(false)}
                  className="px-4 py-2 border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded-xs"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  className="bg-primary text-primary-foreground font-mono font-bold px-5 py-2 border border-primary/80 hover:bg-primary/90 cursor-pointer"
                >
                  Save to Notes Bag
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Full Image Expansion */}
      {imageLightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setImageLightboxUrl(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] bg-card p-2 rounded-sm border border-border">
            <button
              type="button"
              onClick={() => setImageLightboxUrl(null)}
              className="absolute -top-10 right-0 text-white hover:text-primary flex items-center gap-1 font-mono text-xs cursor-pointer"
            >
              <X className="size-5" /> Close Preview
            </button>
            <img
              src={imageLightboxUrl}
              alt="Whiteboard Snapshot"
              className="object-contain max-h-[85vh] mx-auto rounded-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default AiNotesDashboardPage;
