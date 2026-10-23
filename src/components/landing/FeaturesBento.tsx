import { useEffect, useRef, useState } from "react";
import { AiWord } from "@/components/brand/AiWord";
import {
  Bot,
  ArrowRight,
  GitBranch,
  Play,
  Pause,
  RotateCcw,
  Crosshair,
  Film,
  CheckCircle2,
  Camera,
  Activity,
  Cpu,
  Workflow,
  Sun,
  Moon,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

interface DryRunStep {
  step: number;
  title: string;
  winStart: number;
  winEnd: number;
  windowSum: number;
  maxSum: number;
  invariant: string;
  narration: string;
  cursorTargetIdx: number;
}

const LIVE_WHITEBOARD_STEPS: DryRunStep[] = [
  {
    step: 1,
    title: "Initialize Window [0..2]",
    winStart: 0,
    winEnd: 2,
    windowSum: 8,
    maxSum: 8,
    invariant: "windowSum = arr[0] + arr[1] + arr[2] = 2 + 1 + 5 = 8",
    narration:
      "AI draws raw input banner, array cells [0..5], and wraps first k=3 elements in a dashed window frame.",
    cursorTargetIdx: 2,
  },
  {
    step: 2,
    title: "Slide Window Right [1..3]",
    winStart: 1,
    winEnd: 3,
    windowSum: 7,
    maxSum: 8,
    invariant: "windowSum = prevSum - arr[0] + arr[3] = 8 - 2 + 1 = 7",
    narration:
      "AI advances L=1, R=3 pointer arrows and subtracts outgoing arr[0]=2 while adding incoming arr[3]=1 in O(1).",
    cursorTargetIdx: 3,
  },
  {
    step: 3,
    title: "Peak Window Found [2..4] 🎯",
    winStart: 2,
    winEnd: 4,
    windowSum: 9,
    maxSum: 9,
    invariant: "windowSum = prevSum - arr[1] + arr[4] = 7 - 1 + 3 = 9 (New Max!)",
    narration:
      "Window [5, 1, 3] hits peak sum 9! AI highlights cells in emerald and updates maxSum = 9 tracker card.",
    cursorTargetIdx: 4,
  },
  {
    step: 4,
    title: "Final Slide [3..5] & Converge",
    winStart: 3,
    winEnd: 5,
    windowSum: 6,
    maxSum: 9,
    invariant: "windowSum = 9 - 5 + 2 = 6 < maxSum (9 remains optimal)",
    narration:
      "R reaches end of array (index 5). Optimal O(n) pass completes with max subarray sum = 9.",
    cursorTargetIdx: 5,
  },
];

const MOTION_CHAPTERS = [
  {
    id: 0,
    timeRange: [0, 3.2] as const,
    code: "01 // LIVE PROMPT",
    title: "Live Prompt & Model Badge",
    subtitle:
      "Instant query submission with verified LIVE AI: gemini-3.5-flash-lite badge.",
  },
  {
    id: 1,
    timeRange: [3.2, 9.2] as const,
    code: "02 // AI WHITEBOARD DRAW",
    title: "Array, Window & Pointer Markers",
    subtitle:
      "Stroke-by-stroke raw array cells, dashed sliding window, and L/R pointer markers.",
  },
  {
    id: 2,
    timeRange: [9.2, 11.2] as const,
    code: "03 // LINK ZONE CONTEXT",
    title: "Pin Zone #1 (🎯 #1) Context",
    subtitle:
      "Tagging Zone #1 automatically injects its dataset [2,1,5,1,3,2] and step invariant.",
  },
  {
    id: 3,
    timeRange: [11.2, 15.0] as const,
    code: "04 // BRANCH & TAKE OVER",
    title: "Branch Zone #2 With Zero Overlap",
    subtitle:
      "Spawns connected comparison Zone #2 with dashed branch connector and delta cards.",
  },
];

interface CursorKeyframe {
  t: number;
  x: number;
  y: number;
  zoom: number;
  click: boolean;
}

const CURSOR_KEYFRAMES: CursorKeyframe[] = [
  { t: 0.0, x: 260, y: 110, zoom: 1.34, click: false },
  { t: 1.5, x: 560, y: 110, zoom: 1.38, click: false },
  { t: 2.1, x: 1110, y: 110, zoom: 1.44, click: true },
  { t: 2.9, x: 575, y: 47, zoom: 1.42, click: false },
  { t: 3.8, x: 162, y: 416, zoom: 1.34, click: false },
  { t: 4.7, x: 346, y: 416, zoom: 1.36, click: false },
  { t: 5.4, x: 398, y: 566, zoom: 1.34, click: false },
  { t: 6.2, x: 254, y: 416, zoom: 1.35, click: false },
  { t: 7.0, x: 438, y: 416, zoom: 1.36, click: false },
  { t: 7.8, x: 346, y: 416, zoom: 1.38, click: false },
  { t: 8.5, x: 530, y: 416, zoom: 1.42, click: true },
  { t: 9.1, x: 602, y: 566, zoom: 1.40, click: true },
  { t: 9.9, x: 925, y: 47, zoom: 1.46, click: true },
  { t: 10.7, x: 1110, y: 110, zoom: 1.42, click: true },
  { t: 11.6, x: 768, y: 395, zoom: 1.24, click: false },
  { t: 12.6, x: 1015, y: 375, zoom: 1.34, click: false },
  { t: 13.7, x: 1165, y: 505, zoom: 1.38, click: true },
  { t: 14.5, x: 640, y: 360, zoom: 1.0, click: false },
  { t: 15.0, x: 260, y: 110, zoom: 1.34, click: false },
];

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * clamp(t, 0, 1);
}

function smoothstep(t: number) {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
}

function easeInOutCubic(t: number) {
  const c = clamp(t, 0, 1);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

function sampleCursorAndZoom(t: number, totalDuration: number) {
  const clampedT = clamp(t, 0, totalDuration);
  for (let i = 0; i < CURSOR_KEYFRAMES.length - 1; i++) {
    const a = CURSOR_KEYFRAMES[i]!;
    const b = CURSOR_KEYFRAMES[i + 1]!;
    if (clampedT >= a.t && clampedT <= b.t) {
      const span = Math.max(0.0001, b.t - a.t);
      const localT = (clampedT - a.t) / span;
      const e = easeInOutCubic(localT);
      return {
        x: lerp(a.x, b.x, e),
        y: lerp(a.y, b.y, e),
        zoom: lerp(a.zoom, b.zoom, smoothstep(localT)),
      };
    }
  }
  const last = CURSOR_KEYFRAMES[CURSOR_KEYFRAMES.length - 1]!;
  return { x: last.x, y: last.y, zoom: last.zoom };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill?: string,
  stroke?: string,
  lineWidth = 2,
  dashed = false
) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    if (dashed) ctx.setLineDash([8, 6]);
    ctx.stroke();
  }
  ctx.restore();
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 3,
  dashed = false
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  if (dashed) ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 10;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLen * Math.cos(angle - Math.PI / 6),
    y2 - headLen * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    x2 - headLen * Math.cos(angle + Math.PI / 6),
    y2 - headLen * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function FeaturesBento() {
  // Independent Whiteboard Canvas Mode (board-specific theme, decoupled from overall website theme)
  const [boardTheme, setBoardTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("dsa_board_canvas_theme");
        if (saved === "light" || saved === "dark") return saved;
      } catch {}
    }
    return "light";
  });
  const isBoardDark = boardTheme === "dark";
  const [activeStepIdx, setActiveStepIdx] = useState(2);
  const [linkMode, setLinkMode] = useState<"branch" | "takeover">("branch");

  // Motion-Graphics Overview Player state (starts clean at 1.0x wide canvas view)
  const [cameraTrackEnabled, setCameraTrackEnabled] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [elapsedSec, setElapsedSec] = useState(0);

  const TOTAL_DURATION = 15.0;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const elapsedRef = useRef(0);
  const camStateRef = useRef({
    curX: 260,
    curY: 110,
    curVx: 0,
    curVy: 0,
    camX: 640,
    camY: 360,
    camZoom: 1.0,
    history: [] as Array<{ x: number; y: number }>,
  });

  // 60fps Canvas Render Loop with Offscreen Cache & Spring Physics
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const W = 1280;
    const H = 720;

    // Pre-render static background + dot grid ONCE into an offscreen canvas
    const bgCanvas = document.createElement("canvas");
    bgCanvas.width = W + 640;
    bgCanvas.height = H + 640;
    const bgCtx = bgCanvas.getContext("2d", { alpha: false });
    if (bgCtx) {
      bgCtx.translate(320, 320);

      if (isBoardDark) {
        const bgGrad = bgCtx.createLinearGradient(0, 0, W, H);
        bgGrad.addColorStop(0, "#09040e");
        bgGrad.addColorStop(0.5, "#12061c");
        bgGrad.addColorStop(1, "#07020b");
        bgCtx.fillStyle = bgGrad;
        bgCtx.fillRect(-320, -320, W + 640, H + 640);

        const rad1 = bgCtx.createRadialGradient(340, 180, 10, 340, 180, 460);
        rad1.addColorStop(0, "rgba(124, 58, 237, 0.20)");
        rad1.addColorStop(1, "rgba(124, 58, 237, 0)");
        bgCtx.fillStyle = rad1;
        bgCtx.fillRect(0, 0, W, H);

        const rad2 = bgCtx.createRadialGradient(980, 460, 10, 980, 460, 460);
        rad2.addColorStop(0, "rgba(245, 158, 11, 0.15)");
        rad2.addColorStop(1, "rgba(245, 158, 11, 0)");
        bgCtx.fillStyle = rad2;
        bgCtx.fillRect(0, 0, W, H);

        roundRect(bgCtx, 28, 148, W - 56, 512, 18, "#100918", "rgba(139, 92, 246, 0.25)", 2);
        bgCtx.fillStyle = "rgba(139, 92, 246, 0.18)";
        for (let wx = 48; wx < W - 48; wx += 24) {
          for (let wy = 168; wy < 644; wy += 24) {
            bgCtx.fillRect(wx, wy, 1.5, 1.5);
          }
        }
      } else {
        // Light mode: pristine studio whiteboard
        const bgGrad = bgCtx.createLinearGradient(0, 0, W, H);
        bgGrad.addColorStop(0, "#f8fafc");
        bgGrad.addColorStop(0.5, "#f1f5f9");
        bgGrad.addColorStop(1, "#e2e8f0");
        bgCtx.fillStyle = bgGrad;
        bgCtx.fillRect(-320, -320, W + 640, H + 640);

        const rad1 = bgCtx.createRadialGradient(340, 180, 10, 340, 180, 460);
        rad1.addColorStop(0, "rgba(124, 58, 237, 0.08)");
        rad1.addColorStop(1, "rgba(124, 58, 237, 0)");
        bgCtx.fillStyle = rad1;
        bgCtx.fillRect(0, 0, W, H);

        const rad2 = bgCtx.createRadialGradient(980, 460, 10, 980, 460, 460);
        rad2.addColorStop(0, "rgba(245, 158, 11, 0.08)");
        rad2.addColorStop(1, "rgba(245, 158, 11, 0)");
        bgCtx.fillStyle = rad2;
        bgCtx.fillRect(0, 0, W, H);

        roundRect(bgCtx, 28, 148, W - 56, 512, 18, "#ffffff", "#cbd5e1", 2);
        bgCtx.fillStyle = "#cbd5e1";
        for (let wx = 48; wx < W - 48; wx += 24) {
          for (let wy = 168; wy < 644; wy += 24) {
            bgCtx.fillRect(wx, wy, 1.5, 1.5);
          }
        }
      }
    }

    let lastTime = performance.now();
    let rafId = 0;
    let frameCount = 0;

    const drawWorldScene = (t: number) => {
      ctx.drawImage(bgCanvas, -320, -320);

      // Top App Chrome Bar
      if (isBoardDark) {
        roundRect(
          ctx,
          28,
          20,
          W - 56,
          54,
          14,
          "rgba(22, 14, 30, 0.94)",
          "rgba(139, 92, 246, 0.35)",
          1.5
        );
        ctx.fillStyle = "#c084fc";
      } else {
        roundRect(
          ctx,
          28,
          20,
          W - 56,
          54,
          14,
          "rgba(255, 255, 255, 0.96)",
          "rgba(148, 163, 184, 0.35)",
          1.5
        );
        ctx.fillStyle = "#6366f1";
      }
      ctx.font = "bold 14px monospace";
      ctx.fillText("DSA.viz.co // AI Co-Teacher Whiteboard Engine", 52, 52);

      // Live Model Badge
      const badgePulse = 0.75 + 0.25 * Math.sin(t * 6);
      roundRect(
        ctx,
        455,
        31,
        255,
        32,
        8,
        isBoardDark ? "rgba(6, 78, 59, 0.9)" : "#ecfdf5",
        isBoardDark ? "rgba(16, 185, 129, 0.9)" : "#10b981",
        1.8
      );
      ctx.fillStyle = `rgba(16, 185, 129, ${badgePulse.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(472, 47, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isBoardDark ? "#ecfdf5" : "#047857";
      ctx.font = "bold 12px monospace";
      ctx.fillText("LIVE AI: gemini-3.5-flash-lite", 486, 51);

      // Board Zones Bar
      ctx.fillStyle = isBoardDark ? "#94a3b8" : "#64748b";
      ctx.font = "bold 11px monospace";
      ctx.fillText("BOARD ZONES:", 740, 51);

      const isZone1Linked = t >= 9.8;
      roundRect(
        ctx,
        835,
        31,
        185,
        32,
        8,
        isZone1Linked
          ? isBoardDark
            ? "rgba(124, 58, 237, 0.32)"
            : "#f5f3ff"
          : isBoardDark
          ? "rgba(30, 41, 59, 0.85)"
          : "#f1f5f9",
        isZone1Linked
          ? isBoardDark
            ? "#a78bfa"
            : "#7c3aed"
          : isBoardDark
          ? "#475569"
          : "#cbd5e1",
        isZone1Linked ? 2.2 : 1.2
      );
      ctx.fillStyle = isZone1Linked
        ? isBoardDark
          ? "#ede9fe"
          : "#5b21b6"
        : isBoardDark
        ? "#e2e8f0"
        : "#334155";
      ctx.font = "bold 11px monospace";
      ctx.fillText(
        isZone1Linked ? "🎯 #1 Sliding Window" : "#1 Sliding Window",
        848,
        51
      );

      if (t >= 11.2) {
        const z2Alpha = smoothstep((t - 11.2) / 0.5);
        ctx.save();
        ctx.globalAlpha = z2Alpha;
        roundRect(
          ctx,
          1030,
          31,
          195,
          32,
          8,
          isBoardDark ? "rgba(245, 158, 11, 0.26)" : "#fef3c7",
          "#f59e0b",
          2
        );
        ctx.fillStyle = isBoardDark ? "#fde68a" : "#b45309";
        ctx.font = "bold 11px monospace";
        ctx.fillText("🌿 #2 Optimal Branch", 1042, 51);
        ctx.restore();
      }

      // Prompt Bar Row
      if (isBoardDark) {
        roundRect(
          ctx,
          28,
          84,
          W - 56,
          52,
          12,
          "rgba(18, 10, 26, 0.96)",
          "rgba(139, 92, 246, 0.35)",
          1.5
        );
        ctx.fillStyle = "#c084fc";
      } else {
        roundRect(
          ctx,
          28,
          84,
          W - 56,
          52,
          12,
          "rgba(255, 255, 255, 0.98)",
          "rgba(148, 163, 184, 0.35)",
          1.5
        );
        ctx.fillStyle = "#6366f1";
      }
      const prompt1 =
        "Simulate sliding window algorithm for max subarray sum k=3 with dry run";
      const prompt2 =
        "Zone #1 Linked -> Branch optimal O(n) vs O(n*k) comparison from Step 3";
      const activePrompt = t < 9.8 ? prompt1 : prompt2;
      const typedLen =
        t < 1.9
          ? Math.floor(lerp(0, prompt1.length, t / 1.8))
          : t < 9.8
          ? prompt1.length
          : Math.floor(lerp(0, prompt2.length, (t - 9.8) / 0.8));

      ctx.font = "bold 12px monospace";
      ctx.fillText("ASK AI >", 48, 115);

      ctx.fillStyle = isBoardDark ? "#f8fafc" : "#0f172a";
      ctx.font = "13px monospace";
      ctx.fillText(
        activePrompt.slice(0, typedLen) +
          (Math.floor(t * 4) % 2 === 0 ? "▋" : ""),
        120,
        115
      );

      const btnLabel =
        t >= 9.8 ? "🌿 Branch From Zone #1" : "✨ Ask AI Co-Teacher";
      const btnColor = t >= 9.8 ? "#7c3aed" : "#f59e0b";
      roundRect(ctx, W - 245, 92, 205, 36, 8, btnColor, "#ffffff", 1.2);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px monospace";
      ctx.fillText(btnLabel, W - 228, 115);

      let stepIdx = 0;
      if (t >= 5.6 && t < 7.3) stepIdx = 1;
      else if (t >= 7.3) stepIdx = 2;

      const winStart = stepIdx;
      const winEnd = stepIdx + 2;
      const arr = [2, 1, 5, 1, 3, 2];
      const winSums = [8, 7, 9];
      const maxSums = [8, 8, 9];
      const stepTitles = [
        "Step 1/4: Initialize Window [0..2] (Sum = 8)",
        "Step 2/4: Slide Window Right [1..3] (-2, +1 -> Sum = 7)",
        "Step 3/4: Peak Window Found at [2..4] (-1, +3 -> Max = 9 🎯)",
      ];
      const invariants = [
        "Invariant: windowSum = arr[0] + arr[1] + arr[2] = 2 + 1 + 5 = 8 | maxSum = 8",
        "Invariant: windowSum = prevSum - arr[0] + arr[3] = 8 - 2 + 1 = 7 | maxSum = 8",
        "Invariant: windowSum = prevSum - arr[1] + arr[4] = 7 - 1 + 3 = 9 | maxSum = 9 (Optimal)",
      ];

      const smoothWinStart =
        t < 5.6
          ? 0
          : t < 6.1
          ? easeInOutCubic((t - 5.6) / 0.5)
          : t < 7.3
          ? 1
          : t < 7.8
          ? 1 + easeInOutCubic((t - 7.3) / 0.5)
          : 2;

      // ZONE #1 BOUNDED FRAME
      const z1Alpha = smoothstep((t - 2.1) / 0.5);
      if (z1Alpha > 0) {
        ctx.save();
        ctx.globalAlpha = z1Alpha;

        const zx = 48;
        const zy = 166;
        const zw = 668;
        const zh = 476;

        const z1Bg = isBoardDark
          ? isZone1Linked
            ? "#130920"
            : "#0d1322"
          : "#ffffff";
        const z1Border = isZone1Linked
          ? isBoardDark
            ? "#8b5cf6"
            : "#7c3aed"
          : isBoardDark
          ? "#38bdf8"
          : "#0284c7";

        roundRect(
          ctx,
          zx,
          zy,
          zw,
          zh,
          14,
          z1Bg,
          z1Border,
          isZone1Linked ? 2.5 : 2,
          true
        );

        const z1HeaderBg = isZone1Linked
          ? isBoardDark
            ? "rgba(124, 58, 237, 0.28)"
            : "#f5f3ff"
          : isBoardDark
          ? "rgba(2, 132, 199, 0.25)"
          : "#e0f2fe";

        roundRect(
          ctx,
          zx,
          zy,
          zw,
          42,
          12,
          z1HeaderBg,
          z1Border,
          1.5
        );
        ctx.fillStyle = isZone1Linked
          ? isBoardDark
            ? "#ede9fe"
            : "#5b21b6"
          : isBoardDark
          ? "#bae6fd"
          : "#0369a1";
        ctx.font = "bold 13px monospace";
        ctx.fillText(
          "ZONE #1 • SLIDING WINDOW MAX SUBARRAY SUM (K=3)",
          zx + 16,
          zy + 26
        );

        roundRect(
          ctx,
          zx + zw - 216,
          zy + 7,
          202,
          28,
          6,
          isBoardDark ? "rgba(6, 78, 59, 0.9)" : "#dcfce7",
          isBoardDark ? "rgba(16, 185, 129, 0.9)" : "#16a34a",
          1.5
        );
        ctx.fillStyle = isBoardDark ? "#ecfdf5" : "#15803d";
        ctx.font = "bold 11px monospace";
        ctx.fillText("LIVE AI: gemini-3.5-flash-lite", zx + zw - 206, zy + 25);

        roundRect(
          ctx,
          zx + 18,
          zy + 54,
          zw - 36,
          62,
          10,
          isBoardDark ? "rgba(2, 132, 199, 0.15)" : "#f0f9ff",
          isBoardDark ? "#38bdf8" : "#0284c7",
          1.5
        );
        ctx.fillStyle = isBoardDark ? "#38bdf8" : "#0369a1";
        ctx.font = "bold 14px monospace";
        ctx.fillText(stepTitles[stepIdx]!, zx + 30, zy + 76);
        ctx.fillStyle = isBoardDark ? "#f8fafc" : "#0f172a";
        ctx.font = "12px monospace";
        ctx.fillText(invariants[stepIdx]!, zx + 30, zy + 100);

        roundRect(
          ctx,
          zx + 18,
          zy + 128,
          zw - 36,
          32,
          8,
          isBoardDark ? "rgba(30, 41, 59, 0.7)" : "#f8fafc",
          isBoardDark ? "#475569" : "#cbd5e1",
          1.2
        );
        ctx.fillStyle = isBoardDark ? "#94a3b8" : "#334155";
        ctx.font = "bold 12px monospace";
        ctx.fillText(
          "Raw Input Dataset: arr = [2, 1, 5, 1, 3, 2]  |  Window Size k = 3",
          zx + 30,
          zy + 149
        );

        const cellW = 78;
        const cellH = 64;
        const cellGap = 14;
        const rowStartX = zx + 54;
        const rowY = zy + 216;

        const winX = rowStartX + smoothWinStart * (cellW + cellGap) - 8;
        const winW = 3 * cellW + 2 * cellGap + 16;
        roundRect(
          ctx,
          winX,
          rowY - 10,
          winW,
          cellH + 20,
          12,
          isBoardDark ? "rgba(245, 158, 11, 0.22)" : "rgba(254, 243, 199, 0.65)",
          "#d97706",
          3,
          true
        );
        ctx.fillStyle = isBoardDark ? "#fde68a" : "#b45309";
        ctx.font = "bold 11px monospace";
        ctx.fillText(
          `ACTIVE WINDOW [${winStart}..${winEnd}]`,
          winX + 10,
          rowY - 16
        );

        for (let i = 0; i < arr.length; i++) {
          const cx = rowStartX + i * (cellW + cellGap);
          const inWin = i >= winStart && i <= winEnd;
          const isPeak = stepIdx === 2 && inWin;
          const stroke = isPeak
            ? isBoardDark
              ? "#4ade80"
              : "#16a34a"
            : inWin
            ? "#d97706"
            : isBoardDark
            ? "#475569"
            : "#cbd5e1";
          const bg = isPeak
            ? isBoardDark
              ? "rgba(22, 163, 74, 0.25)"
              : "#dcfce7"
            : inWin
            ? isBoardDark
              ? "rgba(217, 119, 6, 0.25)"
              : "#fef3c7"
            : isBoardDark
            ? "rgba(30, 41, 59, 0.8)"
            : "#ffffff";

          ctx.fillStyle = isBoardDark ? "#94a3b8" : "#64748b";
          ctx.font = "11px monospace";
          ctx.fillText(`[${i}]`, cx + 28, rowY - 4);

          roundRect(ctx, cx, rowY, cellW, cellH, 10, bg, stroke, inWin ? 3 : 1.5);
          ctx.fillStyle = isBoardDark ? "#f8fafc" : "#0f172a";
          ctx.font = "bold 22px monospace";
          ctx.fillText(String(arr[i]), cx + 31, rowY + 40);
        }

        const lx = rowStartX + smoothWinStart * (cellW + cellGap) + cellW / 2;
        const rx =
          rowStartX + (smoothWinStart + 2) * (cellW + cellGap) + cellW / 2;
        drawArrow(ctx, lx, rowY + cellH + 38, lx, rowY + cellH + 6, isBoardDark ? "#38bdf8" : "#0284c7", 3);
        ctx.fillStyle = isBoardDark ? "#38bdf8" : "#0284c7";
        ctx.font = "bold 13px monospace";
        ctx.fillText(`L=${winStart}`, lx - 16, rowY + cellH + 54);

        drawArrow(ctx, rx, rowY + cellH + 38, rx, rowY + cellH + 6, isBoardDark ? "#4ade80" : "#16a34a", 3);
        ctx.fillStyle = isBoardDark ? "#4ade80" : "#16a34a";
        ctx.font = "bold 13px monospace";
        ctx.fillText(`R=${winEnd}`, rx - 16, rowY + cellH + 54);

        const cards = [
          {
            k: "window [L..R]",
            v: `[${winStart} .. ${winEnd}]`,
            stroke: isBoardDark ? "#38bdf8" : "#0284c7",
            bg: isBoardDark ? "rgba(2, 132, 199, 0.2)" : "#e0f2fe",
          },
          {
            k: "windowSum",
            v: String(winSums[stepIdx]),
            stroke: "#d97706",
            bg: isBoardDark ? "rgba(217, 119, 6, 0.2)" : "#fef3c7",
          },
          {
            k: "maxSum (Best)",
            v: `${maxSums[stepIdx]}${stepIdx === 2 ? " 🎯" : ""}`,
            stroke: isBoardDark ? "#4ade80" : "#16a34a",
            bg: isBoardDark ? "rgba(22, 163, 74, 0.2)" : "#dcfce7",
          },
        ];
        cards.forEach((c, idx) => {
          const kx = zx + 26 + idx * 206;
          const ky = zy + 365;
          roundRect(ctx, kx, ky, 192, 68, 10, c.bg, c.stroke, 2);
          ctx.fillStyle = c.stroke;
          ctx.font = "bold 11px monospace";
          ctx.fillText(c.k, kx + 12, ky + 22);
          ctx.fillStyle = isBoardDark ? "#f8fafc" : "#0f172a";
          ctx.font = "bold 18px monospace";
          ctx.fillText(c.v, kx + 12, ky + 50);
        });

        if (isZone1Linked) {
          roundRect(
            ctx,
            zx + 18,
            zy + 442,
            zw - 36,
            24,
            6,
            isBoardDark ? "rgba(124, 58, 237, 0.25)" : "#f5f3ff",
            isBoardDark ? "#a78bfa" : "#7c3aed",
            1.5
          );
          ctx.fillStyle = isBoardDark ? "#ede9fe" : "#5b21b6";
          ctx.font = "bold 11px monospace";
          ctx.fillText(
            "🎯 LINKED CONTEXT PINNED: Topic + Step 3/4 + Data [2, 1, 5, 1, 3, 2] sent to AI",
            zx + 26,
            zy + 458
          );
        }

        ctx.restore();
      }

      // ZONE #2: BRANCHED ZONE SPAWNED AT t >= 11.0
      if (t >= 11.0) {
        const z2Alpha = smoothstep((t - 11.0) / 0.55);
        ctx.save();
        ctx.globalAlpha = z2Alpha;

        const arrowColor = isBoardDark ? "#a78bfa" : "#7c3aed";
        drawArrow(ctx, 720, 395, 768, 395, arrowColor, 3.5, true);

        const z2x = 774;
        const z2y = 166;
        const z2w = 462;
        const z2h = 476;

        roundRect(
          ctx,
          z2x,
          z2y,
          z2w,
          z2h,
          14,
          isBoardDark ? "#120a1c" : "#ffffff",
          "#d97706",
          2.5,
          true
        );
        roundRect(
          ctx,
          z2x,
          z2y,
          z2w,
          42,
          12,
          isBoardDark ? "rgba(245, 158, 11, 0.25)" : "#fef3c7",
          "#d97706",
          1.5
        );
        ctx.fillStyle = isBoardDark ? "#fde68a" : "#b45309";
        ctx.font = "bold 12px monospace";
        ctx.fillText("🌿 ZONE #2 • BRANCHED FROM ZONE #1", z2x + 14, z2y + 26);

        roundRect(
          ctx,
          z2x + z2w - 196,
          z2y + 7,
          184,
          28,
          6,
          isBoardDark ? "rgba(6, 78, 59, 0.9)" : "#dcfce7",
          isBoardDark ? "rgba(16, 185, 129, 0.9)" : "#16a34a",
          1.5
        );
        ctx.fillStyle = isBoardDark ? "#ecfdf5" : "#15803d";
        ctx.font = "bold 10px monospace";
        ctx.fillText("LIVE AI: gemini-3.5-flash", z2x + z2w - 186, z2y + 25);

        roundRect(
          ctx,
          z2x + 16,
          z2y + 52,
          z2w - 32,
          32,
          8,
          isBoardDark ? "rgba(124, 58, 237, 0.25)" : "#f5f3ff",
          isBoardDark ? "#a78bfa" : "#7c3aed",
          1.5
        );
        ctx.fillStyle = isBoardDark ? "#ede9fe" : "#5b21b6";
        ctx.font = "bold 11px monospace";
        ctx.fillText(
          "Branched from Zone #1 • Dataset [2, 1, 5, 1, 3, 2]",
          z2x + 26,
          z2y + 72
        );

        roundRect(
          ctx,
          z2x + 16,
          z2y + 96,
          z2w - 32,
          150,
          10,
          isBoardDark ? "rgba(2, 132, 199, 0.15)" : "#f8fafc",
          isBoardDark ? "#38bdf8" : "#0284c7",
          1.8
        );
        ctx.fillStyle = isBoardDark ? "#38bdf8" : "#0369a1";
        ctx.font = "bold 13px monospace";
        ctx.fillText(
          "Why Sliding Window Beats Nested Loops:",
          z2x + 28,
          z2y + 120
        );

        roundRect(
          ctx,
          z2x + 28,
          z2y + 134,
          z2w - 56,
          44,
          8,
          isBoardDark ? "rgba(239, 68, 68, 0.2)" : "#fee2e2",
          isBoardDark ? "#f87171" : "#dc2626",
          1.5
        );
        ctx.fillStyle = isBoardDark ? "#fca5a5" : "#991b1b";
        ctx.font = "bold 12px monospace";
        ctx.fillText(
          "Brute Force O(n*k): Re-sums 3 cells each step (18 ops)",
          z2x + 38,
          z2y + 160
        );

        roundRect(
          ctx,
          z2x + 28,
          z2y + 188,
          z2w - 56,
          44,
          8,
          isBoardDark ? "rgba(22, 163, 74, 0.2)" : "#dcfce7",
          isBoardDark ? "#4ade80" : "#16a34a",
          1.5
        );
        ctx.fillStyle = isBoardDark ? "#86efac" : "#166534";
        ctx.font = "bold 12px monospace";
        ctx.fillText(
          "Sliding Window O(n): Subtract outgoing, add incoming (6 ops)",
          z2x + 38,
          z2y + 214
        );

        roundRect(
          ctx,
          z2x + 16,
          z2y + 262,
          z2w - 32,
          188,
          10,
          isBoardDark ? "rgba(22, 163, 74, 0.15)" : "#f0fdf4",
          isBoardDark ? "#22c55e" : "#16a34a",
          1.8
        );
        ctx.fillStyle = isBoardDark ? "#4ade80" : "#15803d";
        ctx.font = "bold 13px monospace";
        ctx.fillText(
          "O(1) Window Transition Delta at Step 3:",
          z2x + 28,
          z2y + 288
        );

        roundRect(
          ctx,
          z2x + 26,
          z2y + 306,
          118,
          64,
          8,
          isBoardDark ? "rgba(2, 132, 199, 0.2)" : "#e0f2fe",
          isBoardDark ? "#38bdf8" : "#0284c7",
          2
        );
        ctx.fillStyle = isBoardDark ? "#38bdf8" : "#0369a1";
        ctx.font = "bold 11px monospace";
        ctx.fillText("Prev Sum [1..3]", z2x + 38, z2y + 328);
        ctx.fillStyle = isBoardDark ? "#f8fafc" : "#0f172a";
        ctx.font = "bold 20px monospace";
        ctx.fillText("7", z2x + 76, z2y + 355);

        roundRect(
          ctx,
          z2x + 164,
          z2y + 306,
          126,
          64,
          8,
          isBoardDark ? "rgba(217, 119, 6, 0.2)" : "#fef3c7",
          "#d97706",
          2
        );
        ctx.fillStyle = isBoardDark ? "#fde68a" : "#b45309";
        ctx.font = "bold 11px monospace";
        ctx.fillText("Delta (-arr[1]+arr[4])", z2x + 170, z2y + 328);
        ctx.fillStyle = isBoardDark ? "#f8fafc" : "#0f172a";
        ctx.font = "bold 18px monospace";
        ctx.fillText("-1 + 3 = +2", z2x + 178, z2y + 355);

        roundRect(
          ctx,
          z2x + 310,
          z2y + 306,
          122,
          64,
          8,
          isBoardDark ? "rgba(22, 163, 74, 0.2)" : "#dcfce7",
          isBoardDark ? "#4ade80" : "#16a34a",
          2.5
        );
        ctx.fillStyle = isBoardDark ? "#4ade80" : "#15803d";
        ctx.font = "bold 11px monospace";
        ctx.fillText("Peak Sum [2..4]", z2x + 322, z2y + 328);
        ctx.fillStyle = isBoardDark ? "#4ade80" : "#15803d";
        ctx.font = "bold 20px monospace";
        ctx.fillText("9 🎯", z2x + 350, z2y + 355);

        ctx.fillStyle = isBoardDark ? "#94a3b8" : "#334155";
        ctx.font = "bold 12px monospace";
        ctx.fillText(
          "✓ Preserves full context from Linked Zone #1 automatically!",
          z2x + 28,
          z2y + 416
        );

        ctx.restore();
      }
    };

    const drawCursorClean = (
      t: number,
      cursorX: number,
      cursorY: number,
      vx: number,
      vy: number
    ) => {
      const speed = Math.hypot(vx, vy);
      const hist = camStateRef.current.history;

      // 1. Smooth Neon Comet Ribbon Trail (Primary theme violet/indigo)
      if (hist.length > 2) {
        ctx.save();
        ctx.lineCap = "round";
        for (let i = 1; i < hist.length; i++) {
          const p0 = hist[i - 1]!;
          const p1 = hist[i]!;
          const ratio = i / hist.length;
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.strokeStyle = isBoardDark
            ? `rgba(167, 139, 250, ${(ratio * ratio * 0.55).toFixed(3)})`
            : `rgba(124, 58, 237, ${(ratio * ratio * 0.45).toFixed(3)})`;
          ctx.lineWidth = 1.5 + ratio * 10;
          ctx.stroke();
        }
        ctx.restore();
      }

      // 2. Click Shockwave Ripples
      for (const kf of CURSOR_KEYFRAMES) {
        if (kf.click && t >= kf.t && t <= kf.t + 0.5) {
          const p = (t - kf.t) / 0.5;
          const r = 8 + smoothstep(p) * 42;
          ctx.save();
          ctx.beginPath();
          ctx.arc(kf.x, kf.y, r, 0, Math.PI * 2);
          ctx.strokeStyle = isBoardDark
            ? `rgba(167, 139, 250, ${((1 - p) * 0.85).toFixed(3)})`
            : `rgba(124, 58, 237, ${((1 - p) * 0.80).toFixed(3)})`;
          ctx.lineWidth = 3 * (1 - p);
          ctx.stroke();
          ctx.restore();
        }
      }

      // 3. Directional Motion-Blur Samples for Cursor (no text below cursor!)
      const blurSamples = speed > 1.8 ? 5 : 1;
      for (let s = blurSamples - 1; s >= 0; s--) {
        const frac = s / blurSamples;
        const gx = cursorX - vx * frac * 2.0;
        const gy = cursorY - vy * frac * 2.0;
        const alpha = s === 0 ? 1 : (1 - frac) * 0.28;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(gx, gy);

        const tilt = clamp(vx * 0.012, -0.28, 0.28);
        ctx.rotate(tilt);

        // Outer laser halo
        ctx.beginPath();
        ctx.arc(4, 10, 16, 0, Math.PI * 2);
        ctx.fillStyle = isBoardDark
          ? "rgba(167, 139, 250, 0.25)"
          : "rgba(124, 58, 237, 0.20)";
        ctx.fill();

        // Crisp vector pointer arrow (no text label below it)
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 22);
        ctx.lineTo(6, 17);
        ctx.lineTo(11, 26);
        ctx.lineTo(15, 24);
        ctx.lineTo(10, 15);
        ctx.lineTo(18, 15);
        ctx.closePath();
        ctx.fillStyle = isBoardDark ? "#8b5cf6" : "#7c3aed";
        ctx.fill();
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();

        ctx.restore();
      }
    };

    const renderLoop = (now: number) => {
      const dt = Math.min(0.033, Math.max(0.004, (now - lastTime) / 1000));
      lastTime = now;

      if (isPlaying) {
        elapsedRef.current = (elapsedRef.current + dt) % TOTAL_DURATION;
      }
      const t = elapsedRef.current;

      const target = sampleCursorAndZoom(t, TOTAL_DURATION);
      const st = camStateRef.current;

      // 2nd-order critically damped spring for cursor (smooth velocity & acceleration)
      const omega = 15.0;
      const ax = omega * omega * (target.x - st.curX) - 2 * omega * st.curVx;
      const ay = omega * omega * (target.y - st.curY) - 2 * omega * st.curVy;
      st.curVx += ax * dt;
      st.curVy += ay * dt;
      st.curX += st.curVx * dt;
      st.curY += st.curVy * dt;

      const vx = st.curVx * dt;
      const vy = st.curVy * dt;

      st.history.push({ x: st.curX, y: st.curY });
      if (st.history.length > 16) st.history.shift();

      if (cameraTrackEnabled) {
        const desiredCamX = lerp(W / 2, st.curX, 0.58);
        const desiredCamY = lerp(H / 2, st.curY, 0.58);
        st.camX = lerp(st.camX, desiredCamX, 1 - Math.exp(-7.0 * dt));
        st.camY = lerp(st.camY, desiredCamY, 1 - Math.exp(-7.0 * dt));
        st.camZoom = lerp(st.camZoom, target.zoom, 1 - Math.exp(-6.0 * dt));
      } else {
        st.camX = lerp(st.camX, W / 2, 0.15);
        st.camY = lerp(st.camY, H / 2, 0.15);
        st.camZoom = lerp(st.camZoom, 1.0, 0.15);
      }

      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.scale(st.camZoom, st.camZoom);
      ctx.translate(-st.camX, -st.camY);

      drawWorldScene(t);
      drawCursorClean(t, st.curX, st.curY, vx, vy);
      ctx.restore();

      // Screen-space Cinematic Vignette (subtle in light mode, cinematic in dark mode)
      const vig = ctx.createRadialGradient(
        W / 2,
        H / 2,
        H * 0.38,
        W / 2,
        H / 2,
        W * 0.65
      );
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(
        1,
        isBoardDark ? "rgba(5, 2, 8, 0.46)" : "rgba(148, 163, 184, 0.10)"
      );
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      frameCount++;
      if (frameCount % 6 === 0) {
        setElapsedSec(t);
      }

      rafId = requestAnimationFrame(renderLoop);
    };

    rafId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, cameraTrackEnabled, isBoardDark]);

  const activeStep =
    LIVE_WHITEBOARD_STEPS[activeStepIdx] ?? LIVE_WHITEBOARD_STEPS[2]!;
  const demoArray = [2, 1, 5, 1, 3, 2];

  const currentChapterIdx =
    MOTION_CHAPTERS.findIndex(
      (ch) => elapsedSec >= ch.timeRange[0] && elapsedSec < ch.timeRange[1]
    ) !== -1
      ? MOTION_CHAPTERS.findIndex(
          (ch) => elapsedSec >= ch.timeRange[0] && elapsedSec < ch.timeRange[1]
        )
      : 0;
  const currentChapter = MOTION_CHAPTERS[currentChapterIdx]!;

  const handleJumpToChapter = (chapterIndex: number) => {
    const target = MOTION_CHAPTERS[chapterIndex];
    if (!target) return;
    const nextT = target.timeRange[0] + 0.05;
    elapsedRef.current = nextT;
    setElapsedSec(nextT);
  };

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto w-full">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-primary mb-4 shadow-xs">
          <AiWord className="size-3.5 text-primary" />
          <span>AI-Assisted Excalidraw Co-Teacher</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-black tracking-tight text-foreground">
          AI-Assisted Whiteboard <br />
          <span className="font-pixel text-4xl sm:text-5xl md:text-6xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent py-2 block mt-6 mb-4 drop-shadow-[0_0_20px_color-mix(in_oklch,var(--primary)_60%,transparent)]">
            learning
          </span>
        </h2>
        <p className="mt-3 text-base sm:text-lg text-muted-foreground font-sans leading-relaxed">
          Ask any algorithm question in plain English and watch a live AI model draw raw input arrays, dashed sliding windows, pointer markers, and context-linked branches directly on an interactive whiteboard.
        </p>
      </div>

      {/* Top 2 Key Interactive Feature Cards (Card 1: Dry Run & Card 2: Zone Link) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-12">
        {/* Card 1: Live Prompt-to-Whiteboard Dry Run Simulation (Span 7) */}
        <div className="md:col-span-7 group rounded-3xl border border-border/80 bg-card/85 p-6 sm:p-8 backdrop-blur-xl flex flex-col justify-between hover:border-primary/50 hover:shadow-2xl transition-all duration-300">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-xs">
                  <Bot className="size-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                    Live Excalidraw Generation
                  </span>
                  <h3 className="font-display text-xl sm:text-2xl font-black text-foreground group-hover:text-primary transition-colors">
                    Prompt-to-Whiteboard Dry Run
                  </h3>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 font-mono text-[11px] font-bold text-emerald-400">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                LIVE AI: gemini-3.5-flash-lite
              </span>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-sans">
              Prioritizes live Gemini generation for any query—drawing the raw input banner, array index cells, vertical pointer arrows (<code className="text-primary font-mono">L</code>, <code className="text-primary font-mono">R</code>), dashed active window frames, and a smooth AI laser cursor.
            </p>

            {/* Interactive Mini Whiteboard Canvas Preview */}
            <div className="my-5 rounded-2xl border border-border/80 bg-slate-50/80 dark:bg-card/90 text-foreground p-4 font-mono text-xs shadow-inner relative overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-border/60">
                <span className="inline-flex items-center gap-1.5 font-bold text-[11px] text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-800 rounded-md px-2.5 py-0.5">
                  ZONE #1 • SLIDING WINDOW MAX SUBARRAY SUM (K=3)
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-400 dark:border-emerald-800 rounded-md px-2 py-0.5">
                  ✓ LIVE AI: gemini-3.5-flash-lite
                </span>
              </div>

              <div className="rounded-lg border border-border/70 bg-background/90 px-3 py-1.5 text-[11px] font-bold text-foreground mb-3 flex items-center justify-between">
                <span>Input: arr = [2, 1, 5, 1, 3, 2], k = 3</span>
                <span className="text-sky-600 dark:text-sky-400">
                  Step {activeStep.step}/4: {activeStep.title}
                </span>
              </div>

              <div className="relative py-4 px-2 flex items-center justify-center gap-2 sm:gap-3">
                {demoArray.map((val, idx) => {
                  const inWin =
                    idx >= activeStep.winStart && idx <= activeStep.winEnd;
                  const isPeak = activeStep.step === 3 && inWin;
                  const isLeft = idx === activeStep.winStart;
                  const isRight = idx === activeStep.winEnd;
                  return (
                    <div key={idx} className="flex flex-col items-center relative">
                      <span className="text-[10px] text-muted-foreground mb-1">
                        [{idx}]
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveStepIdx(
                            Math.min(
                              LIVE_WHITEBOARD_STEPS.length - 1,
                              Math.max(0, idx - 1)
                            )
                          )
                        }
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-bold text-sm sm:text-base transition-all duration-500 ease-out ${
                          isPeak
                            ? "bg-emerald-500/20 border-2 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-amber-500/50 shadow-md scale-105"
                            : inWin
                            ? "bg-amber-500/20 border-2 border-amber-500 text-amber-700 dark:text-amber-300 ring-2 ring-amber-400/40 shadow-xs scale-105"
                            : "bg-background border border-border text-foreground hover:border-primary/50"
                        }`}
                      >
                        {val}
                      </button>
                      <div className="h-6 mt-1 flex items-center justify-center">
                        {isLeft && (
                          <span className="inline-flex items-center rounded bg-sky-500/15 border border-sky-500/40 px-1.5 py-0.5 text-[9px] font-bold text-sky-700 dark:text-sky-300">
                            ↑ L={idx}
                          </span>
                        )}
                        {isRight && (
                          <span className="inline-flex items-center rounded bg-emerald-500/15 border border-emerald-500/40 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
                            ↑ R={idx}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-3 gap-2 mt-1 pt-2.5 border-t border-border/60">
                <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1.5">
                  <div className="text-[9px] font-bold text-sky-700 dark:text-sky-300 uppercase">
                    window [L..R]
                  </div>
                  <div className="text-xs font-black text-foreground">
                    [{activeStep.winStart} .. {activeStep.winEnd}]
                  </div>
                </div>
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5">
                  <div className="text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase">
                    windowSum
                  </div>
                  <div className="text-xs font-black text-foreground">
                    {activeStep.windowSum}
                  </div>
                </div>
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5">
                  <div className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">
                    maxSum (Best)
                  </div>
                  <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                    {activeStep.maxSum} {activeStep.step >= 3 ? "🎯" : ""}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 bg-muted/40 rounded-lg px-3 py-1.5 border border-border/60">
                <span className="text-[10px] font-bold text-foreground truncate">
                  {activeStep.invariant}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  {LIVE_WHITEBOARD_STEPS.map((st, idx) => (
                    <button
                      key={st.step}
                      type="button"
                      onClick={() => setActiveStepIdx(idx)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                        idx === activeStepIdx
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-background text-muted-foreground border border-border hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      S{st.step}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/40 flex items-center justify-between font-mono text-xs text-primary">
            <span className="font-bold">
              Live Markers, Raw Arrays &amp; AI Laser Cursor
            </span>
            <Link
              to="/ai-learning"
              className="flex items-center gap-1 hover:underline font-bold"
            >
              <span>Open AI Whiteboard</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 2: Context-Aware Zone Linking, Branching & Takeover (Span 5) */}
        <div className="md:col-span-5 group rounded-3xl border border-border/80 bg-card/85 p-6 sm:p-8 backdrop-blur-xl flex flex-col justify-between hover:border-primary/50 hover:shadow-2xl transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="size-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-xs">
                <GitBranch className="size-6" />
              </div>
              <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[11px] font-bold text-primary">
                🎯 Linked Zone Context
              </span>
            </div>

            <h3 className="font-display text-2xl font-black text-foreground group-hover:text-primary transition-colors">
              Select, Branch or Take Over Any Zone
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed font-sans">
              Click any previous zone on the canvas or in the{" "}
              <code className="text-primary font-mono">Board Zones</code> bar (
              <code className="text-primary font-mono">🎯 #1</code>) to pin its
              topic, active step invariant, and dataset for follow-up questions.
            </p>

            <div className="my-5 rounded-2xl border border-primary/25 bg-background/85 p-4 font-mono text-xs space-y-3 shadow-inner">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/50">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary">
                  <Crosshair className="size-3.5" />
                  <span>Linked Zone #1: Sliding Window (Step 3/4)</span>
                </span>
                <span className="rounded bg-primary/15 border border-primary/30 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                  Pinned
                </span>
              </div>

              <div className="rounded-xl bg-card/80 border border-border/60 p-2.5 text-[11px] space-y-1">
                <div className="text-muted-foreground">
                  Injected Dataset:{" "}
                  <span className="text-foreground font-bold">
                    [2, 1, 5, 1, 3, 2, 3]
                  </span>
                </div>
                <div className="text-muted-foreground">
                  Active Invariant:{" "}
                  <span className="text-primary font-bold">
                    windowSum = 9 (Peak [2..4])
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLinkMode("branch")}
                  className={`rounded-xl border px-3 py-2 text-left transition-all ${
                    linkMode === "branch"
                      ? "border-primary bg-primary/15 text-primary font-bold shadow-xs"
                      : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="text-[11px]">🌿 Branch Zone #2</div>
                  <div className="text-[9px] opacity-80 font-sans">
                    Connect new zone with arrow
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setLinkMode("takeover")}
                  className={`rounded-xl border px-3 py-2 text-left transition-all ${
                    linkMode === "takeover"
                      ? "border-amber-500 bg-amber-500/20 text-amber-600 dark:text-amber-300 font-bold shadow-xs"
                      : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="text-[11px]">⚡ AI Take Over #1</div>
                  <div className="text-[9px] opacity-80 font-sans">
                    Replace Zone #1 in-place
                  </div>
                </button>
              </div>

              <div className="rounded-xl border border-border/50 bg-secondary/30 px-3 py-2 text-[11px] text-foreground/90 font-sans">
                {linkMode === "branch" ? (
                  <span>
                    <strong className="text-primary font-mono">
                      Branch Mode:
                    </strong>{" "}
                    Spawns non-overlapping <strong>Zone #2</strong> to the right
                    of Zone #1 with a connecting dashed arrow and full context banner.
                  </span>
                ) : (
                  <span>
                    <strong className="text-amber-600 dark:text-amber-400 font-mono">
                      Takeover Mode:
                    </strong>{" "}
                    Replaces <strong>Zone #1</strong> directly in-place at its
                    exact <code className="font-mono">(originX, originY)</code>{" "}
                    slot using the linked dataset.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/40 font-mono text-xs text-primary font-bold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4" />
              <span>Zero context loss across zones</span>
            </span>
            <Link
              to="/ai-learning"
              className="inline-flex items-center gap-1 text-[11px] hover:underline"
            >
              <span>Try Zone Linking</span>
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* =====================================================================
          ENHANCED FLAGSHIP LIVE MOTION GRAPHICS SHOWCASE
         ===================================================================== */}
      <div className="relative group rounded-3xl p-1 bg-gradient-to-r from-primary/30 via-accent/20 to-primary/30 shadow-[0_20px_80px_-20px_color-mix(in_oklch,var(--primary)_25%,transparent)]">
        <div className="rounded-[23px] bg-card/95 border border-border/70 backdrop-blur-2xl p-5 sm:p-8 shadow-xl">
          {/* Showcase Header Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-border/60">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-mono font-bold text-primary mb-2 shadow-xs">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <Film className="size-3.5 text-primary" />
                <span>60FPS AI WHITEBOARD MOTION GRAPHICS SHOWCASE</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-display font-black text-foreground">
                Watch the AI Co-Teacher Draw, Link Zones &amp; Branch Live
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground font-sans mt-1">
                Interactive 60fps simulation illustrating live natural-language prompt parsing, stroke-by-stroke array drawing, zone tagging (<code className="text-primary font-mono">🎯 Zone #1</code>), and branching into <code className="text-accent font-mono">🌿 Zone #2</code> with full context.
              </p>
            </div>

            {/* Camera Zoom Toggle, Board Theme Mode & Play Controls */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Dedicated Whiteboard Theme Toggle (Board-Specific, Independent of Website Theme) */}
              <button
                type="button"
                onClick={() => {
                  const next = boardTheme === "dark" ? "light" : "dark";
                  setBoardTheme(next);
                  try {
                    localStorage.setItem("dsa_board_canvas_theme", next);
                  } catch {}
                }}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 font-mono text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  isBoardDark
                    ? "border-amber-500/60 bg-amber-500/15 text-amber-500 dark:text-amber-400"
                    : "border-primary/60 bg-primary/15 text-primary"
                }`}
                title="Toggle Whiteboard Canvas Mode (Board only, independent of overall website theme)"
              >
                {isBoardDark ? (
                  <>
                    <Sun className="size-3.5 text-amber-400" />
                    <span>Board: Dark</span>
                  </>
                ) : (
                  <>
                    <Moon className="size-3.5 text-primary" />
                    <span>Board: Light</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setCameraTrackEnabled((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 font-mono text-xs font-bold transition-all ${
                  cameraTrackEnabled
                    ? "border-primary/60 bg-primary/15 text-primary shadow-xs ring-1 ring-primary/30"
                    : "border-border/80 bg-secondary/60 text-muted-foreground hover:text-foreground hover:border-border"
                }`}
                title="Toggle Dynamic Camera Center Tracking & Zoom Focus"
              >
                <Camera className="size-3.5 text-primary" />
                <span>Camera Zoom: {cameraTrackEnabled ? "ON" : "OFF"}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3.5 py-2 font-mono text-xs font-bold hover:opacity-90 transition-opacity shadow-sm"
              >
                {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                <span>{isPlaying ? "Pause" : "Play"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  elapsedRef.current = 0;
                  setElapsedSec(0);
                  setIsPlaying(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-secondary/60 hover:bg-secondary px-3 py-2 font-mono text-xs font-bold text-foreground transition-colors"
                title="Restart Animation"
              >
                <RotateCcw className="size-3.5 text-primary" />
                <span>Restart</span>
              </button>
            </div>
          </div>

          {/* Widescreen 16:9 Cinema Bezel */}
          <div className="mt-6 relative rounded-2xl border border-border/80 dark:border-primary/30 bg-muted/20 dark:bg-black/40 overflow-hidden shadow-2xl">
            {/* Window Studio Chrome Header */}
            <div className={`border-b transition-colors duration-300 px-4 py-2.5 flex items-center justify-between gap-3 text-xs font-mono ${
              isBoardDark ? "border-border/40 bg-[#120716]" : "border-slate-200 bg-slate-100"
            }`}>
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-rose-500" />
                <span className="size-2.5 rounded-full bg-amber-400" />
                <span className="size-2.5 rounded-full bg-emerald-400" />
                <span className={`ml-2 hidden sm:inline text-[11px] ${
                  isBoardDark ? "text-slate-300" : "text-slate-700 font-semibold"
                }`}>
                  dsa.viz.co / ai-whiteboard / sliding-window-dry-run
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                {/* 1-Click Board Mode Switcher Badge */}
                <button
                  type="button"
                  onClick={() => {
                    const next = boardTheme === "dark" ? "light" : "dark";
                    setBoardTheme(next);
                    try {
                      localStorage.setItem("dsa_board_canvas_theme", next);
                    } catch {}
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded font-mono font-bold cursor-pointer transition-colors ${
                    isBoardDark
                      ? "bg-slate-800 text-amber-300 border border-slate-700 hover:bg-slate-700"
                      : "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 shadow-xs"
                  }`}
                  title="Toggle Whiteboard Canvas Mode"
                >
                  {isBoardDark ? (
                    <>
                      <Sun className="size-3 text-amber-400" />
                      <span>Dark Board</span>
                    </>
                  ) : (
                    <>
                      <Moon className="size-3 text-primary" />
                      <span>Light Board</span>
                    </>
                  )}
                </button>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                  gemini-3.5-flash-lite
                </span>
                <span className={`font-bold ${isBoardDark ? "text-slate-300" : "text-slate-700 font-bold"}`}>
                  {elapsedSec.toFixed(1)}s / {TOTAL_DURATION.toFixed(1)}s
                </span>
              </div>
            </div>

            {/* 60fps Native Retina Canvas */}
            <div className={`relative w-full aspect-video transition-colors duration-300 ${isBoardDark ? "bg-[#070305]" : "bg-[#f8fafc]"}`}>
              <canvas
                ref={canvasRef}
                width={1280}
                height={720}
                className="w-full h-full block object-contain"
              />
            </div>

            {/* Bottom Timeline Caption Strip */}
            <div className={`border-t transition-colors duration-300 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs ${
              isBoardDark ? "border-border/40 bg-[#120716]" : "border-slate-200 bg-slate-100"
            }`}>
              <div className="flex items-center gap-2">
                <span className="rounded bg-primary/15 border border-primary/30 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {currentChapter.code}
                </span>
                <span className={`font-bold text-xs ${isBoardDark ? "text-foreground" : "text-slate-900"}`}>
                  {currentChapter.title}
                </span>
              </div>
              <span className={`text-[11px] font-sans truncate ${isBoardDark ? "text-slate-300" : "text-slate-700 font-medium"}`}>
                {currentChapter.subtitle}
              </span>
            </div>
          </div>

          {/* Interactive 4-Chapter Deck (Click to Jump) */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {MOTION_CHAPTERS.map((ch, idx) => {
              const isActive = idx === currentChapterIdx;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => handleJumpToChapter(idx)}
                  className={`relative rounded-2xl border p-3.5 text-left transition-all duration-300 overflow-hidden ${
                    isActive
                      ? "border-primary bg-primary/10 dark:bg-primary/15 shadow-md ring-1 ring-primary/40"
                      : "border-border/60 bg-card/60 hover:border-primary/40 hover:bg-card/90"
                  }`}
                >
                  {/* Subtle active top progress hairline */}
                  {isActive && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-accent animate-pulse" />
                  )}
                  <div className="flex items-center justify-between font-mono text-[10px] mb-1.5">
                    <span className={isActive ? "text-primary font-bold" : "text-muted-foreground"}>
                      {ch.code}
                    </span>
                    <span className="text-muted-foreground font-mono">
                      {ch.timeRange[0]}s–{ch.timeRange[1]}s
                    </span>
                  </div>
                  <div className="font-display text-sm font-black text-foreground">
                    {ch.title}
                  </div>
                  <div className="text-[11px] text-muted-foreground font-sans mt-1 line-clamp-2 leading-relaxed">
                    {ch.subtitle}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 3 Sleek Highlight Feature Strips Underneath the Player */}
          <div className="mt-8 pt-6 border-t border-border/60 grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
            <div className="rounded-2xl border border-border/70 bg-card/60 p-4 flex items-start gap-3 hover:border-emerald-500/50 transition-colors">
              <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                <Cpu className="size-4" />
              </div>
              <div>
                <div className="font-bold text-foreground text-sm font-display">100% Live Model Attribution</div>
                <div className="text-muted-foreground text-xs font-sans mt-0.5 leading-relaxed">
                  Every simulation stamps a verified <code className="text-emerald-600 dark:text-emerald-400 font-mono">LIVE AI: gemini-3.5-flash-lite</code> badge on the zone header.
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card/60 p-4 flex items-start gap-3 hover:border-primary/50 transition-colors">
              <div className="p-2 rounded-xl bg-primary/15 border border-primary/30 text-primary shrink-0 mt-0.5">
                <Activity className="size-4" />
              </div>
              <div>
                <div className="font-bold text-foreground text-sm font-display">Context-Aware Branching</div>
                <div className="text-muted-foreground text-xs font-sans mt-0.5 leading-relaxed">
                  Tag any zone (<code className="text-primary font-mono">🎯 #1</code>) to inject its exact array values and active invariant into follow-up queries.
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card/60 p-4 flex items-start gap-3 hover:border-accent/50 transition-colors">
              <div className="p-2 rounded-xl bg-accent/15 border border-accent/30 text-accent shrink-0 mt-0.5">
                <Workflow className="size-4" />
              </div>
              <div>
                <div className="font-bold text-foreground text-sm font-display">Zero-Overlap Spatial Zones</div>
                <div className="text-muted-foreground text-xs font-sans mt-0.5 leading-relaxed">
                  Non-overlapping architectural frames ensure newly branched diagrams never collide with previous whiteboard sketches.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
