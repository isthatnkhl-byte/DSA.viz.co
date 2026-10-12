import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Pen,
  Square,
  Circle,
  MoveRight,
  Type,
  Eraser,
  Trash2,
  Download,
  RotateCcw,
  Sparkles,
  Layers,
  Cpu,
  Eye,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WhiteboardElement } from "@/lib/crdt-collab.server";

export interface AiWhiteboardProps {
  roomId?: string;
  isAiTeaching?: boolean;
  aiTeachingMessage?: string | null;
  externalElements?: WhiteboardElement[];
  onElementCreated?: (element: WhiteboardElement) => void;
  onClearBoard?: () => void;
  readOnly?: boolean;
}

type DrawTool = "pen" | "arrow" | "rect" | "circle" | "array" | "node" | "eraser";

const COLOR_PALETTE = [
  { name: "Cyan", value: "#38bdf8" },
  { name: "Emerald", value: "#34d399" },
  { name: "Purple", value: "#c084fc" },
  { name: "Amber", value: "#fbbf24" },
  { name: "Rose", value: "#fb7185" },
  { name: "White", value: "#f8fafc" },
];

export function AiWhiteboard({
  roomId = "default-room",
  isAiTeaching = false,
  aiTeachingMessage = null,
  externalElements = [],
  onElementCreated,
  onClearBoard,
  readOnly = false,
}: AiWhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [activeTool, setActiveTool] = useState<DrawTool>("pen");
  const [activeColor, setActiveColor] = useState<string>("#38bdf8");
  const [brushSize, setBrushSize] = useState<number>(3);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentStroke, setCurrentStroke] = useState<Array<{ x: number; y: number }>>([]);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [localElements, setLocalElements] = useState<WhiteboardElement[]>([]);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [activeSimulationType, setActiveSimulationType] = useState<
    "none" | "two_pointers" | "binary_search" | "tree"
  >("none");

  // Merge external and local elements
  const allElements = [...localElements, ...externalElements];

  // Redraw canvas whenever elements change
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid background
    ctx.strokeStyle = "rgba(51, 65, 85, 0.25)";
    ctx.lineWidth = 1;
    const gridSize = 32;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw elements
    for (const el of allElements) {
      ctx.save();
      if (el.type === "stroke" && el.points && el.points.length > 1) {
        ctx.strokeStyle = el.color || "#38bdf8";
        ctx.lineWidth = el.size || 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(el.points[0]!.x, el.points[0]!.y);
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.points[i]!.x, el.points[i]!.y);
        }
        ctx.stroke();
      } else if (el.type === "shape" && el.shapeData) {
        ctx.strokeStyle = el.color || "#38bdf8";
        ctx.lineWidth = el.size || 2;
        const { x = 0, y = 0, width = 50, height = 50, shapeType } = el.shapeData;
        if (shapeType === "rectangle") {
          ctx.strokeRect(x, y, width, height);
        } else if (shapeType === "circle") {
          ctx.beginPath();
          const radius = Math.abs(width) / 2;
          ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
          ctx.stroke();
        } else if (shapeType === "arrow") {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + width, y + height);
          ctx.stroke();
          // Arrow head
          const angle = Math.atan2(height, width);
          ctx.beginPath();
          ctx.moveTo(x + width, y + height);
          ctx.lineTo(x + width - 12 * Math.cos(angle - Math.PI / 6), y + height - 12 * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(x + width, y + height);
          ctx.lineTo(x + width - 12 * Math.cos(angle + Math.PI / 6), y + height - 12 * Math.sin(angle + Math.PI / 6));
          ctx.stroke();
        }
      } else if (el.type === "ai_diagram" && el.aiDiagramPayload) {
        // Draw AI visual structure
        renderAiDiagram(ctx, el.aiDiagramType, el.aiDiagramPayload);
      }
      ctx.restore();
    }

    // Draw active drawing stroke in progress
    if (isDrawing && currentStroke.length > 1) {
      ctx.save();
      ctx.strokeStyle = activeTool === "eraser" ? "#0f172a" : activeColor;
      ctx.lineWidth = activeTool === "eraser" ? 24 : brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(currentStroke[0]!.x, currentStroke[0]!.y);
      for (let i = 1; i < currentStroke.length; i++) {
        ctx.lineTo(currentStroke[i]!.x, currentStroke[i]!.y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }, [allElements, isDrawing, currentStroke, activeTool, activeColor, brushSize]);

  // Render structured AI algorithmic diagrams
  const renderAiDiagram = (
    ctx: CanvasRenderingContext2D,
    type: string | undefined,
    payload: any
  ) => {
    ctx.font = "13px JetBrains Mono, monospace";

    if (type === "array_pointers" || type === "two_pointers" || type === "binary_search") {
      const items = payload.elements || [2, 7, 11, 15, 19, 23, 29];
      const startX = 60;
      const startY = 160;
      const cellWidth = 56;
      const cellHeight = 44;

      // Title
      ctx.fillStyle = "#38bdf8";
      ctx.fillText(payload.title || "AI Algorithmic Simulation: Array & Two Pointers", startX, startY - 70);

      if (payload.stepDescription) {
        ctx.fillStyle = "#94a3b8";
        ctx.fillText(payload.stepDescription, startX, startY - 45);
      }

      // Draw Cells
      items.forEach((item: any, idx: number) => {
        const x = startX + idx * cellWidth;
        const y = startY;

        // Background
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(x, y, cellWidth, cellHeight);

        // Border
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, cellWidth, cellHeight);

        // Value
        ctx.fillStyle = "#f8fafc";
        ctx.textAlign = "center";
        ctx.fillText(String(item), x + cellWidth / 2, y + 26);

        // Index
        ctx.fillStyle = "#64748b";
        ctx.fillText(`[${idx}]`, x + cellWidth / 2, y + cellHeight + 18);
      });

      // Draw Pointers
      const pointers = payload.pointers || [
        { label: "L (Low)", index: 0, color: "#34d399" },
        { label: "R (High)", index: items.length - 1, color: "#fb7185" },
      ];

      pointers.forEach((ptr: any) => {
        const ptrX = startX + ptr.index * cellWidth + cellWidth / 2;
        const ptrY = startY - 8;

        ctx.fillStyle = ptr.color || "#38bdf8";
        ctx.strokeStyle = ptr.color || "#38bdf8";
        ctx.lineWidth = 2;

        // Arrow pointing down
        ctx.beginPath();
        ctx.moveTo(ptrX, ptrY - 20);
        ctx.lineTo(ptrX, ptrY);
        ctx.lineTo(ptrX - 5, ptrY - 6);
        ctx.moveTo(ptrX, ptrY);
        ctx.lineTo(ptrX + 5, ptrY - 6);
        ctx.stroke();

        ctx.textAlign = "center";
        ctx.fillText(ptr.label, ptrX, ptrY - 26);
      });
    } else if (type === "tree") {
      ctx.fillStyle = "#c084fc";
      ctx.fillText(payload.title || "AI Algorithmic Simulation: Tree State", 80, 50);

      const nodes = [
        { id: "1", val: "Root(10)", x: 260, y: 100 },
        { id: "2", val: "L(5)", x: 180, y: 170 },
        { id: "3", val: "R(15)", x: 340, y: 170 },
        { id: "4", val: "L.L(3)", x: 130, y: 240 },
        { id: "5", val: "L.R(7)", x: 230, y: 240 },
      ];

      // Edges
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 2;
      const drawEdge = (n1: any, n2: any) => {
        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);
        ctx.stroke();
      };
      drawEdge(nodes[0], nodes[1]);
      drawEdge(nodes[0], nodes[2]);
      drawEdge(nodes[1], nodes[3]);
      drawEdge(nodes[1], nodes[4]);

      // Nodes
      nodes.forEach((n) => {
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(n.x, n.y, 22, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "#f8fafc";
        ctx.textAlign = "center";
        ctx.fillText(n.val, n.x, n.y + 5);
      });
    }
  };

  // Resize observer
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      canvasRef.current.width = rect.width;
      canvasRef.current.height = Math.max(380, rect.height);
      renderCanvas();
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [renderCanvas]);

  // Re-render when elements change
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Pointer event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setStartPoint({ x, y });
    setCurrentStroke([{ x, y }]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentStroke((prev) => [...prev, { x, y }]);
  };

  const handlePointerUp = () => {
    if (!isDrawing || readOnly) return;
    setIsDrawing(false);

    if (currentStroke.length > 1) {
      const newEl: WhiteboardElement = {
        id: `wb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: "stroke",
        tool: activeTool,
        points: currentStroke,
        color: activeTool === "eraser" ? "#0f172a" : activeColor,
        size: activeTool === "eraser" ? 24 : brushSize,
        timestamp: Date.now(),
        authorId: "candidate",
      };

      setLocalElements((prev) => [...prev, newEl]);
      onElementCreated?.(newEl);
    }

    setCurrentStroke([]);
    setStartPoint(null);
  };

  // AI Teaching Preset Dispatcher
  const triggerAiTeachingSimulation = (type: "two_pointers" | "binary_search" | "tree") => {
    setActiveSimulationType(type);

    let diagramPayload: any = {};
    if (type === "two_pointers") {
      diagramPayload = {
        title: "Two Pointers Technique: Target Sum Invariant",
        elements: [1, 2, 4, 6, 8, 11, 15],
        pointers: [
          { label: "Left (0)", index: 0, color: "#34d399" },
          { label: "Right (6)", index: 6, color: "#fb7185" },
        ],
        stepDescription: "Invariant: Sum = arr[L] + arr[R]. If sum > target, decrement R; else increment L.",
      };
    } else if (type === "binary_search") {
      diagramPayload = {
        title: "Binary Search Interval Halving",
        elements: [3, 9, 14, 19, 27, 35, 42, 51, 68],
        pointers: [
          { label: "Low", index: 0, color: "#34d399" },
          { label: "Mid", index: 4, color: "#38bdf8" },
          { label: "High", index: 8, color: "#fb7185" },
        ],
        stepDescription: "Search space halved at each step: O(log N) operations guaranteed.",
      };
    } else if (type === "tree") {
      diagramPayload = {
        title: "Binary Search Tree Invariant",
        stepDescription: "All left subtree values < Root (10) < All right subtree values.",
      };
    }

    const aiEl: WhiteboardElement = {
      id: `ai-sim-${Date.now()}`,
      type: "ai_diagram",
      aiDiagramType: type,
      aiDiagramPayload: diagramPayload,
      timestamp: Date.now(),
      authorId: "ai_interviewer",
    };

    setLocalElements((prev) => [...prev, aiEl]);
    onElementCreated?.(aiEl);
  };

  const handleClear = () => {
    setLocalElements([]);
    onClearBoard?.();
  };

  const handleDownloadSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `interview-whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl transition-all ${
        isFullScreen ? "fixed inset-4 z-50 h-[calc(100vh-2rem)]" : "h-[460px] w-full"
      }`}
    >
      {/* Top Glassmorphic Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 backdrop-blur border-b border-slate-800 text-xs">
        {/* Left: Status & AI Indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-sky-950/60 border border-sky-800/50 text-sky-400 font-medium">
            <Cpu className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span>AI Live Whiteboard</span>
          </div>

          {isAiTeaching && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-950/60 border border-emerald-800/50 text-emerald-400">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
              <span>AI Teaching Active</span>
            </div>
          )}
        </div>

        {/* Center: Tools & Presets */}
        <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTool("pen")}
            className={`p-1.5 rounded transition ${
              activeTool === "pen" ? "bg-sky-500/20 text-sky-400 border border-sky-500/40" : "text-slate-400 hover:text-slate-200"
            }`}
            title="Pen Tool"
          >
            <Pen className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActiveTool("eraser")}
            className={`p-1.5 rounded transition ${
              activeTool === "eraser" ? "bg-rose-500/20 text-rose-400 border border-rose-500/40" : "text-slate-400 hover:text-slate-200"
            }`}
            title="Eraser"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* Color palette */}
          <div className="flex items-center gap-1">
            {COLOR_PALETTE.map((col) => (
              <button
                key={col.value}
                onClick={() => setActiveColor(col.value)}
                className={`w-3.5 h-3.5 rounded-full border transition ${
                  activeColor === col.value ? "border-white scale-110 shadow-sm" : "border-transparent opacity-70 hover:opacity-100"
                }`}
                style={{ backgroundColor: col.value }}
                title={col.name}
              />
            ))}
          </div>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* AI Teaching Simulation Presets */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => triggerAiTeachingSimulation("two_pointers")}
              className="h-6 px-2 text-[11px] text-sky-400 hover:bg-sky-950/50"
            >
              Simulate Pointers
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => triggerAiTeachingSimulation("binary_search")}
              className="h-6 px-2 text-[11px] text-emerald-400 hover:bg-emerald-950/50"
            >
              Binary Search
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => triggerAiTeachingSimulation("tree")}
              className="h-6 px-2 text-[11px] text-purple-400 hover:bg-purple-950/50"
            >
              Tree
            </Button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-7 px-2 text-slate-400 hover:text-rose-400"
            title="Clear Board"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Clear
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownloadSnapshot}
            className="h-7 px-2 text-slate-400 hover:text-slate-200"
            title="Download PNG"
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="h-7 px-2 text-slate-400 hover:text-slate-200"
          >
            {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative flex-1 bg-slate-950 overflow-hidden cursor-crosshair">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="absolute inset-0 w-full h-full touch-none"
        />

        {/* AI Teaching Overlay Banner */}
        {aiTeachingMessage && (
          <div className="absolute bottom-3 left-4 right-4 bg-slate-900/90 border border-sky-500/40 rounded-lg p-2.5 backdrop-blur shadow-xl flex items-center gap-2 text-xs text-sky-200 animate-in fade-in slide-in-from-bottom-2">
            <Sparkles className="w-4 h-4 text-sky-400 shrink-0 animate-pulse" />
            <div className="flex-1">
              <span className="font-semibold text-sky-400">AI Explaining on Board: </span>
              {aiTeachingMessage}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
