import React, { useState, useMemo, useRef, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  FileText,
  Download,
  Printer,
  Trash2,
  Plus,
  CheckSquare,
  Square,
  Layers,
  Search,
  Filter,
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
  Calendar,
  Hash,
  Share2,
  Bookmark,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { useNotesBag, INITIAL_SAMPLE_NOTES } from "@/context/NotesBagContext";
import { NotesBagItem, NoteSourceType, PdfCompilationResponse } from "@/lib/notes/types";
import { compileHandwrittenNotesHtml } from "@/lib/notes/pdf-compiler";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/ai-notes" as any)({
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
  } = useNotesBag();

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

  // Selected items for compilation
  const selectedItems = useMemo(() => {
    return items.filter((i) => selectedItemIds.includes(i.id));
  }, [items, selectedItemIds]);

  const estimatedPages = useMemo(() => {
    if (selectedItems.length === 0) return 0;
    return Math.ceil(selectedItems.length / itemsPerPage);
  }, [selectedItems.length, itemsPerPage]);

  // Handle PDF Compilation
  const handleCompilePdf = async () => {
    if (selectedItems.length === 0) {
      toast.error("Please select at least one item from your Notes Bag to compile.");
      return;
    }

    setIsCompiling(true);
    const toastId = toast.loading("Synthesizing handwritten multi-page PDF notes...");

    try {
      // Call server endpoint
      const response = await fetch("/api/notes/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentTitle: docTitle.trim() || "DSA Algorithm Notes",
          itemsPerPage: itemsPerPage,
          selectedItemIds: selectedItemIds,
          items: selectedItems,
        }),
      });

      if (response.ok) {
        const data: PdfCompilationResponse = await response.json();
        setPreviewHtml(data.htmlDocument);
        setCompilationMeta(data);
        setIsPreviewModalOpen(true);
        toast.success(`Synthesized ${data.totalPages} page(s) successfully!`, { id: toastId });
      } else {
        // Fallback to client-side compiler if backend is offline/erroring
        console.warn("[AiNotes] Server compile returned non-ok, falling back to local client compiler");
        const fallbackResult = compileHandwrittenNotesHtml(selectedItems, {
          documentTitle: docTitle.trim() || "DSA Algorithm Notes",
          itemsPerPage: itemsPerPage,
        });
        const fallbackMeta: PdfCompilationResponse = {
          ok: true,
          title: docTitle.trim() || "DSA Algorithm Notes",
          totalPages: fallbackResult.totalPages,
          itemsPerPage,
          totalItems: selectedItems.length,
          htmlDocument: fallbackResult.html,
        };
        setPreviewHtml(fallbackResult.html);
        setCompilationMeta(fallbackMeta);
        setIsPreviewModalOpen(true);
        toast.success(`Synthesized ${fallbackMeta.totalPages} page(s) via client compiler!`, { id: toastId });
      }
    } catch (err: any) {
      console.warn("[AiNotes] Server compile exception, using client compiler:", err);
      const fallbackResult = compileHandwrittenNotesHtml(selectedItems, {
        documentTitle: docTitle.trim() || "DSA Algorithm Notes",
        itemsPerPage: itemsPerPage,
      });
      const fallbackMeta: PdfCompilationResponse = {
        ok: true,
        title: docTitle.trim() || "DSA Algorithm Notes",
        totalPages: fallbackResult.totalPages,
        itemsPerPage,
        totalItems: selectedItems.length,
        htmlDocument: fallbackResult.html,
      };
      setPreviewHtml(fallbackResult.html);
      setCompilationMeta(fallbackMeta);
      setIsPreviewModalOpen(true);
      toast.success(`Synthesized ${fallbackMeta.totalPages} page(s) successfully!`, { id: toastId });
    } finally {
      setIsCompiling(false);
    }
  };

  const handlePrint = () => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) {
      toast.error("Preview frame not ready for printing.");
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
          color: "bg-emerald-950/80 text-emerald-400 border-emerald-800",
          icon: <Code2 className="size-3" />,
        };
      case "SMARTBOARD_WHITEBOARD":
        return {
          label: "WHITEBOARD CANVAS",
          color: "bg-indigo-950/80 text-indigo-400 border-indigo-800",
          icon: <PenTool className="size-3" />,
        };
      case "VISUALIZER_TRACE":
        return {
          label: "VISUALIZER TRACE",
          color: "bg-amber-950/80 text-amber-400 border-amber-800",
          icon: <Layers className="size-3" />,
        };
      case "AI_LEARNING_MODULE":
        return {
          label: "AI LEARNING",
          color: "bg-purple-950/80 text-purple-400 border-purple-800",
          icon: <Sparkles className="size-3" />,
        };
      case "PROBLEM_SOLUTION":
        return {
          label: "PROBLEM SOLUTION",
          color: "bg-cyan-950/80 text-cyan-400 border-cyan-800",
          icon: <BookOpen className="size-3" />,
        };
      default:
        return {
          label: "CUSTOM NOTE",
          color: "bg-neutral-800 text-neutral-300 border-neutral-700",
          icon: <FileText className="size-3" />,
        };
    }
  };

  return (
    <div className="min-h-screen bg-[#141211] text-[#EAE6DF] font-sans">
      <SiteHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Banner with Neo-Brutalist Frame */}
        <section className="relative border-2 border-primary/40 bg-[#1E1B19] p-6 sm:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/20 border border-primary/50 text-primary font-mono text-xs font-semibold tracking-wider uppercase">
                <Sparkles className="size-3.5" />
                <span>Multi-Page Handwritten PDF Engine</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black font-display tracking-tight text-white">
                AI NOTES <span className="text-primary font-mono font-normal">/</span> DASHBOARD
              </h1>
              <p className="text-sm sm:text-base text-[#A39B8F] leading-relaxed">
                Collect algorithm solutions, visualizer invariant states, Excalidraw whiteboards, and compiler runs
                from anywhere across the platform. Compile them into a beautifully rendered multi-page handwritten
                notebook PDF with ruled paper, margin lines, and sticky note annotations.
              </p>
            </div>

            {/* Quick Synthesis Control Box */}
            <div className="flex flex-col gap-3 min-w-[280px] bg-[#171513] border border-[#3E3832] p-4 shadow-inner">
              <div className="flex items-center justify-between text-xs font-mono text-[#A39B8F]">
                <span>PAGINATION DENSITY:</span>
                <span className="text-primary font-bold">{itemsPerPage} ITEMS / PAGE</span>
              </div>

              {/* Items per page selector: strictly 2 or 3 */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setItemsPerPage(2)}
                  className={`px-3 py-2 text-xs font-mono font-bold uppercase border transition-all ${
                    itemsPerPage === 2
                      ? "bg-primary text-black border-primary shadow-[2px_2px_0px_0px_#000]"
                      : "bg-[#221E1C] text-[#C2BBB0] border-[#4A433B] hover:border-primary/50"
                  }`}
                >
                  2 Per Page (Ideal)
                </button>
                <button
                  type="button"
                  onClick={() => setItemsPerPage(3)}
                  className={`px-3 py-2 text-xs font-mono font-bold uppercase border transition-all ${
                    itemsPerPage === 3
                      ? "bg-primary text-black border-primary shadow-[2px_2px_0px_0px_#000]"
                      : "bg-[#221E1C] text-[#C2BBB0] border-[#4A433B] hover:border-primary/50"
                  }`}
                >
                  3 Per Page (Compact)
                </button>
              </div>

              <div className="text-[10px] font-mono text-[#8C8477] italic leading-tight">
                *Strict 2–3 items limit guarantees A4 layout integrity, handwritten font legibility, and diagram margins.
              </div>

              <Button
                type="button"
                onClick={handleCompilePdf}
                disabled={isCompiling || selectedItems.length === 0}
                className="w-full h-11 bg-primary text-primary-foreground font-mono font-bold text-xs uppercase tracking-wider border-2 border-black hover:bg-primary/90 shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
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
          <div className="mt-6 pt-6 border-t border-[#3E3832] grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#141211] p-3 border border-[#2D2824]">
              <div className="text-[10px] font-mono text-[#8C8477] uppercase tracking-wider">BAG CAPACITY</div>
              <div className="text-xl sm:text-2xl font-black font-mono text-white mt-0.5">
                {items.length} <span className="text-xs text-[#8C8477] font-normal">items</span>
              </div>
            </div>
            <div className="bg-[#141211] p-3 border border-[#2D2824]">
              <div className="text-[10px] font-mono text-[#8C8477] uppercase tracking-wider">SELECTED FOR PDF</div>
              <div className="text-xl sm:text-2xl font-black font-mono text-primary mt-0.5">
                {selectedItems.length} <span className="text-xs text-[#8C8477] font-normal">items</span>
              </div>
            </div>
            <div className="bg-[#141211] p-3 border border-[#2D2824]">
              <div className="text-[10px] font-mono text-[#8C8477] uppercase tracking-wider">PROJECTED A4 PAGES</div>
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-0.5">
                {estimatedPages} <span className="text-xs text-[#8C8477] font-normal">pages</span>
              </div>
            </div>
            <div className="bg-[#141211] p-3 border border-[#2D2824]">
              <div className="text-[10px] font-mono text-[#8C8477] uppercase tracking-wider">CANVAS / WHITEBOARDS</div>
              <div className="text-xl sm:text-2xl font-black font-mono text-indigo-400 mt-0.5">
                {items.filter((i) => i.canvasSnapshotUrl || i.sourceType === "SMARTBOARD_WHITEBOARD").length}
              </div>
            </div>
          </div>
        </section>

        {/* Action & Filter Toolbar */}
        <section className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-[#1E1B19] border border-[#3E3832] p-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#8C8477]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code, tags, invariant proof..."
              className="w-full bg-[#141211] border border-[#3E3832] pl-9 pr-4 py-2 font-mono text-xs text-[#EAE6DF] placeholder-[#736B61] focus:outline-none focus:border-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C8477] hover:text-white"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Quick Selection & Custom Note Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={selectAllItems}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#26221F] border border-[#4A433B] text-xs font-mono text-[#C2BBB0] hover:text-white hover:border-[#6B6155] transition-colors"
            >
              <CheckSquare className="size-3.5 text-primary" />
              <span>Select All</span>
            </button>
            <button
              type="button"
              onClick={deselectAllItems}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#26221F] border border-[#4A433B] text-xs font-mono text-[#C2BBB0] hover:text-white hover:border-[#6B6155] transition-colors"
            >
              <Square className="size-3.5" />
              <span>Deselect</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddCustomModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 border border-primary/50 text-xs font-mono text-primary font-bold hover:bg-primary/30 transition-colors"
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-950/40 border border-red-900/60 text-xs font-mono text-red-400 hover:bg-red-900/40 transition-colors"
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
              className={`px-3 py-1.5 font-mono text-xs font-medium border transition-colors ${
                activeFilter === filter.id
                  ? "bg-primary text-black border-primary font-bold shadow-[2px_2px_0px_0px_#000]"
                  : "bg-[#1E1B19] text-[#A39B8F] border-[#3E3832] hover:border-[#6B6155] hover:text-white"
              }`}
            >
              <span>{filter.label}</span>
              <span className="ml-1.5 text-[10px] opacity-70">({filter.count})</span>
            </button>
          ))}
        </section>

        {/* Document Title Customizer */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-[#1E1B19] border border-[#3E3832] p-3 text-xs font-mono">
          <span className="text-[#8C8477] uppercase tracking-wider shrink-0 flex items-center gap-1.5">
            <Bookmark className="size-3.5 text-primary" />
            PDF COVER TITLE:
          </span>
          <input
            type="text"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            className="flex-1 bg-[#141211] border border-[#3E3832] px-3 py-1.5 font-mono text-xs text-[#EAE6DF] focus:outline-none focus:border-primary"
            placeholder="Document title printed on cover..."
          />
        </div>

        {/* Main Note Items Grid */}
        {filteredItems.length === 0 ? (
          <div className="border-2 border-dashed border-[#3E3832] bg-[#1E1B19] p-12 text-center space-y-4">
            <div className="size-14 mx-auto rounded-full bg-[#26221F] flex items-center justify-center text-[#8C8477]">
              <BookOpen className="size-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold font-display text-white">Your Notes Bag is Empty</h3>
              <p className="text-xs text-[#A39B8F] max-w-md mx-auto">
                Collect snippets from the Compiler, Visualizer states, or Excalidraw Smartboard using the
                <span className="text-primary font-mono font-semibold"> "Add to Notes"</span> button across the platform.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                type="button"
                onClick={handleRestoreSamples}
                className="bg-primary text-black font-mono text-xs font-bold border border-black hover:bg-primary/90"
              >
                <Sparkles className="size-3.5 mr-1.5" />
                <span>Restore Starter Sample Notes</span>
              </Button>
              <Link
                to="/compiler"
                className="px-4 py-2 bg-[#26221F] border border-[#4A433B] text-xs font-mono text-[#EAE6DF] hover:border-primary transition-colors"
              >
                Go to Compiler
              </Link>
              <Link
                to="/playground"
                className="px-4 py-2 bg-[#26221F] border border-[#4A433B] text-xs font-mono text-[#EAE6DF] hover:border-primary transition-colors"
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
                  className={`relative flex flex-col border-2 transition-all bg-[#1E1B19] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.6)] ${
                    isSelected
                      ? "border-primary/80 ring-1 ring-primary/40"
                      : "border-[#3E3832] opacity-80 hover:opacity-100"
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 p-4 border-b border-[#2D2824] bg-[#171513]">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleSelectItem(item.id)}
                        className="mt-1 shrink-0 text-primary transition-transform hover:scale-110"
                        title={isSelected ? "Uncheck from PDF" : "Include in PDF"}
                      >
                        {isSelected ? (
                          <CheckSquare className="size-5 fill-primary text-black" />
                        ) : (
                          <Square className="size-5 text-[#6B6155]" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 border text-[10px] font-mono font-bold tracking-wider uppercase ${badge.color}`}
                          >
                            {badge.icon}
                            <span>{badge.label}</span>
                          </span>
                          <span className="text-[10px] font-mono text-[#8C8477]">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white font-mono leading-snug truncate" title={item.title}>
                          {item.title}
                        </h3>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 text-[#8C8477] hover:text-red-400 hover:bg-red-950/30 transition-colors shrink-0"
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
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#141211] border border-[#2D2824] text-[10px] font-mono text-[#A39B8F]"
                          >
                            <Hash className="size-2.5 opacity-60" />
                            <span>{tag}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Canvas Snapshot Thumbnail */}
                    {item.canvasSnapshotUrl && (
                      <div className="relative group border border-[#3E3832] bg-white overflow-hidden max-h-48 flex items-center justify-center">
                        <img
                          src={item.canvasSnapshotUrl}
                          alt={item.title}
                          className="object-contain w-full h-auto max-h-48 cursor-pointer"
                          onClick={() => setImageLightboxUrl(item.canvasSnapshotUrl || null)}
                        />
                        <button
                          type="button"
                          onClick={() => setImageLightboxUrl(item.canvasSnapshotUrl || null)}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 text-white font-mono text-xs transition-opacity"
                        >
                          <Eye className="size-4" />
                          <span>Expand Canvas Preview</span>
                        </button>
                      </div>
                    )}

                    {/* Code Snippet Box */}
                    {item.codeSnippet && (
                      <div className="relative border border-[#2D2824] bg-[#12100F] p-3">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#24201D] text-[10px] font-mono text-[#8C8477]">
                          <span className="uppercase text-primary font-semibold">
                            {item.codeLanguage || "CODE"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(item.id, item.codeSnippet!)}
                            className="flex items-center gap-1 hover:text-white"
                          >
                            {copiedCodeId === item.id ? (
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
                        <pre className="font-mono text-xs text-[#D8D2C5] overflow-x-auto max-h-40 leading-relaxed no-scrollbar select-text">
                          <code>{item.codeSnippet}</code>
                        </pre>
                      </div>
                    )}

                    {/* Invariant Proof / State Box */}
                    {item.invariantText && (
                      <div className="border-l-2 border-amber-500 bg-amber-950/20 p-2.5 space-y-1">
                        <div className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                          <Info className="size-3" />
                          <span>Algorithm Invariant</span>
                        </div>
                        <p className="text-xs text-[#EAE6DF] leading-relaxed italic">
                          "{item.invariantText}"
                        </p>
                      </div>
                    )}

                    {/* AI Key Takeaway */}
                    {item.aiTakeaway && (
                      <div className="border-l-2 border-primary bg-primary/10 p-2.5 space-y-1">
                        <div className="text-[10px] font-mono font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="size-3" />
                          <span>AI Key Takeaway</span>
                        </div>
                        <p className="text-xs text-[#EAE6DF] leading-relaxed">
                          {item.aiTakeaway}
                        </p>
                      </div>
                    )}

                    {/* Active Pointers / Variables */}
                    {item.activePointers && Object.keys(item.activePointers).length > 0 && (
                      <div className="bg-[#141211] border border-[#2D2824] p-2 flex flex-wrap gap-2 text-[10px] font-mono">
                        <span className="text-[#8C8477] uppercase font-semibold">POINTER STATE:</span>
                        {Object.entries(item.activePointers).map(([k, v]) => (
                          <span key={k} className="px-1.5 py-0.5 bg-[#26221F] border border-[#3E3832] text-amber-300">
                            {k} = {String(v)}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* User Editable Annotation Field */}
                    <div className="mt-auto pt-2 space-y-1">
                      <label className="block text-[10px] font-mono text-[#8C8477] uppercase">
                        Handwritten Margin Note (User Annotation):
                      </label>
                      <textarea
                        value={item.userNotes || ""}
                        onChange={(e) => updateItem(item.id, { userNotes: e.target.value })}
                        placeholder="Write personal interview tip or memory trick here (will appear on ruled lines)..."
                        rows={2}
                        className="w-full bg-[#141211] border border-[#2D2824] p-2 font-mono text-xs text-[#EAE6DF] placeholder-[#6B6155] focus:outline-none focus:border-primary resize-none"
                      />
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-4 py-2 border-t border-[#2D2824] bg-[#171513] flex items-center justify-between text-[10px] font-mono text-[#8C8477]">
                    <span>Item #{index + 1}</span>
                    <span className={isSelected ? "text-primary font-bold" : "text-[#6B6155]"}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-6xl h-[92vh] flex flex-col bg-[#1E1B19] border-2 border-primary shadow-[8px_8px_0px_0px_#000]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#3E3832] bg-[#171513]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 text-primary border border-primary/50">
                  <Printer className="size-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold font-mono text-white">
                    {compilationMeta?.title || docTitle}
                  </h2>
                  <p className="text-xs font-mono text-[#A39B8F]">
                    {compilationMeta?.totalPages || estimatedPages} Pages Generated • {compilationMeta?.itemsPerPage || itemsPerPage} items/page strict layout
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={handlePrint}
                  className="bg-primary text-black font-mono font-bold text-xs uppercase px-4 py-2 hover:bg-primary/90 border border-black shadow-[2px_2px_0px_0px_#000]"
                >
                  <Printer className="size-4 mr-1.5" />
                  <span>Print / Save PDF</span>
                </Button>

                <button
                  type="button"
                  onClick={handleDownloadHtml}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 bg-[#26221F] border border-[#4A433B] text-xs font-mono text-[#EAE6DF] hover:border-primary transition-colors"
                  title="Download standalone HTML document"
                >
                  <Download className="size-4" />
                  <span>Download .html</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenNewTab}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 bg-[#26221F] border border-[#4A433B] text-xs font-mono text-[#EAE6DF] hover:border-primary transition-colors"
                  title="Open in new window"
                >
                  <ExternalLink className="size-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="p-2 text-[#8C8477] hover:text-white hover:bg-[#26221F] transition-colors ml-2"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Embedded iframe with compiled handwritten HTML */}
            <div className="flex-1 bg-[#2C2927] p-2 sm:p-4 overflow-hidden relative">
              <iframe
                ref={iframeRef}
                srcDoc={previewHtml}
                title="Handwritten Notes Preview"
                className="w-full h-full border border-black shadow-2xl bg-white"
              />
            </div>

            {/* Modal Footer Note */}
            <div className="px-6 py-2.5 border-t border-[#3E3832] bg-[#171513] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono text-[#8C8477]">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-xl bg-[#1E1B19] border-2 border-primary p-6 shadow-[6px_6px_0px_0px_#000] space-y-5">
            <div className="flex items-center justify-between border-b border-[#3E3832] pb-3">
              <div className="flex items-center gap-2">
                <Plus className="size-5 text-primary" />
                <h3 className="text-base font-bold font-mono text-white">Add Custom Note to Bag</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCustomModalOpen(false)}
                className="text-[#8C8477] hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomSubmit} className="space-y-4 text-xs font-mono">
              <div className="space-y-1">
                <label className="block text-[#A39B8F] uppercase">Note Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Kadane's Algorithm — Dynamic Programming State Transition"
                  className="w-full bg-[#141211] border border-[#3E3832] px-3 py-2 text-[#EAE6DF] focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[#A39B8F] uppercase">Source Category</label>
                  <select
                    value={newSourceType}
                    onChange={(e) => setNewSourceType(e.target.value as NoteSourceType)}
                    className="w-full bg-[#141211] border border-[#3E3832] px-3 py-2 text-[#EAE6DF] focus:outline-none focus:border-primary"
                  >
                    <option value="CUSTOM_NOTE">Custom Student Note</option>
                    <option value="COMPILER_CODE">Compiler Code Snippet</option>
                    <option value="VISUALIZER_TRACE">Visualizer Trace / Invariant</option>
                    <option value="SMARTBOARD_WHITEBOARD">Smartboard Whiteboard</option>
                    <option value="AI_LEARNING_MODULE">AI Learning Lesson</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[#A39B8F] uppercase">Language</label>
                  <select
                    value={newCodeLanguage}
                    onChange={(e) => setNewCodeLanguage(e.target.value)}
                    className="w-full bg-[#141211] border border-[#3E3832] px-3 py-2 text-[#EAE6DF] focus:outline-none focus:border-primary"
                  >
                    <option value="cpp">C++ (std::vector)</option>
                    <option value="python">Python 3</option>
                    <option value="javascript">JavaScript / TypeScript</option>
                    <option value="java">Java 21</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[#A39B8F] uppercase">Code Snippet (Optional)</label>
                <textarea
                  value={newCodeSnippet}
                  onChange={(e) => setNewCodeSnippet(e.target.value)}
                  placeholder="int maxSubArray(vector<int>& nums) { ... }"
                  rows={4}
                  className="w-full bg-[#141211] border border-[#3E3832] p-2 text-[#EAE6DF] placeholder-[#6B6155] focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[#A39B8F] uppercase">Algorithm Invariant Proof (Optional)</label>
                <input
                  type="text"
                  value={newInvariant}
                  onChange={(e) => setNewInvariant(e.target.value)}
                  placeholder="e.g., current_sum >= 0 holds before adding nums[i]"
                  className="w-full bg-[#141211] border border-[#3E3832] px-3 py-2 text-[#EAE6DF] focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[#A39B8F] uppercase">Personal Margin Notes</label>
                <textarea
                  value={newUserNotes}
                  onChange={(e) => setNewUserNotes(e.target.value)}
                  placeholder="Key interview caveat or edge cases to remember..."
                  rows={2}
                  className="w-full bg-[#141211] border border-[#3E3832] p-2 text-[#EAE6DF] placeholder-[#6B6155] focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[#A39B8F] uppercase">Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="DP, Kadane, GoogleOA, MustReview"
                  className="w-full bg-[#141211] border border-[#3E3832] px-3 py-2 text-[#EAE6DF] focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#3E3832]">
                <button
                  type="button"
                  onClick={() => setIsAddCustomModalOpen(false)}
                  className="px-4 py-2 border border-[#4A433B] text-[#A39B8F] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  className="bg-primary text-black font-mono font-bold px-5 py-2 border border-black hover:bg-primary/90"
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
          <div className="relative max-w-5xl max-h-[90vh] bg-white p-2">
            <button
              type="button"
              onClick={() => setImageLightboxUrl(null)}
              className="absolute -top-10 right-0 text-white hover:text-primary flex items-center gap-1 font-mono text-xs"
            >
              <X className="size-5" /> Close Preview
            </button>
            <img
              src={imageLightboxUrl}
              alt="Whiteboard Snapshot"
              className="object-contain max-h-[85vh] mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
export default AiNotesDashboardPage;
