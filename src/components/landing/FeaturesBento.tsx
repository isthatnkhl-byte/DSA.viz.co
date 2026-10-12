import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Sparkles,
  ArrowRight,
  GitBranch,
  Play,
  Pause,
  RotateCcw,
  Layers,
  Crosshair,
  Wand2,
  Film,
  Download,
  CheckCircle2,
  Camera,
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
    title: "Camera Tracks Prompt & Model Badge",
    subtitle:
      "Smooth zoom-in on live prompt typing, Ask AI click shockwave, and LIVE AI: gemini-3.5-flash-lite badge.",
  },
  {
    id: 1,
    timeRange: [3.2, 9.2] as const,
    code: "02 // AI WHITEBOARD DRAW",
    title: "Motion-Blurred Cursor Sweeps Array & Pointers",
    subtitle:
      "Camera dynamically centers on the AI laser cursor as it traces [0..5], L/R arrows, and maxSum = 9 🎯.",
  },
  {
    id: 2,
    timeRange: [9.2, 11.2] as const,
    code: "03 // LINK ZONE CONTEXT",
    title: "Whip-Pan to Tag Zone #1 (🎯 #1)",
    subtitle:
      "Fast directional motion-blur pan to Board Zones bar to pin Zone #1's topic, step invariant & dataset.",
  },
  {
    id: 3,
    timeRange: [11.2, 15.0] as const,
    code: "04 // BRANCH & TAKE OVER",
    title: "Camera Tracks Dashed Branch Into Zone #2",
    subtitle:
      "Follows the rose branch connector into Zone #2 for O(1) window delta comparison, then zooms out to full board.",
  },
];

interface CursorKeyframe {
  t: number;
  x: number;
  y: number;
  zoom: number;
  click: boolean;
  label: string;
}

const CURSOR_KEYFRAMES: CursorKeyframe[] = [
  { t: 0.0, x: 260, y: 110, zoom: 1.38, click: false, label: "Typing Live Prompt" },
  { t: 1.5, x: 540, y: 110, zoom: 1.42, click: false, label: "Typing Live Prompt" },
  { t: 2.1, x: 1110, y: 110, zoom: 1.48, click: true, label: "Click Ask AI Co-Teacher" },
  { t: 2.9, x: 575, y: 47, zoom: 1.46, click: false, label: "Verified Model Badge" },
  { t: 3.7, x: 162, y: 416, zoom: 1.36, click: false, label: "Inspect arr[0] = 2" },
  { t: 4.5, x: 346, y: 416, zoom: 1.38, click: false, label: "Inspect arr[2] = 5 (R=2)" },
  { t: 5.2, x: 398, y: 566, zoom: 1.35, click: false, label: "State Card: windowSum = 8" },
  { t: 6.0, x: 254, y: 416, zoom: 1.36, click: false, label: "Advance Pointer L = 1" },
  { t: 6.8, x: 438, y: 416, zoom: 1.38, click: false, label: "Advance Pointer R = 3" },
  { t: 7.6, x: 346, y: 416, zoom: 1.40, click: false, label: "Slide Window [2..4]" },
  { t: 8.3, x: 530, y: 416, zoom: 1.45, click: true, label: "Peak Window [2..4] = 9" },
  { t: 9.0, x: 602, y: 566, zoom: 1.42, click: true, label: "Peak maxSum = 9 🎯" },
  { t: 9.8, x: 925, y: 47, zoom: 1.52, click: true, label: "Link Zone #1 (🎯 #1)" },
  { t: 10.7, x: 1110, y: 110, zoom: 1.46, click: true, label: "Branch From Zone #1" },
  { t: 11.6, x: 768, y: 395, zoom: 1.26, click: false, label: "Dashed Branch Connector" },
  { t: 12.6, x: 1015, y: 375, zoom: 1.38, click: false, label: "Zone #2 O(n) Comparison" },
  { t: 13.7, x: 1165, y: 505, zoom: 1.42, click: true, label: "O(1) Delta Peak = 9 🎯" },
  { t: 14.6, x: 640, y: 360, zoom: 1.0, click: false, label: "Full Multi-Zone Overview" },
  { t: 15.0, x: 260, y: 110, zoom: 1.38, click: false, label: "Loop" },
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

function easeOutBack(t: number) {
  const c = clamp(t, 0, 1);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(c - 1, 3) + c1 * Math.pow(c - 1, 2);
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
        label: localT < 0.5 ? a.label : b.label,
      };
    }
  }
  const last = CURSOR_KEYFRAMES[CURSOR_KEYFRAMES.length - 1]!;
  return { x: last.x, y: last.y, zoom: last.zoom, label: last.label };
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
  const [activeStepIdx, setActiveStepIdx] = useState(2);
  const [linkMode, setLinkMode] = useState<"branch" | "takeover">("branch");
  const [activePrimitive, setActivePrimitive] = useState<
    "array" | "hashmap" | "tree" | "grid2d"
  >("array");

  // Motion-Graphics Overview Video Player state
  const [playerMode, setPlayerMode] = useState<"motion" | "video">("motion");
  const [cameraTrackEnabled, setCameraTrackEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [liveHudTelemetry, setLiveHudTelemetry] = useState({
    zoom: "1.38x",
    label: "Typing Live Prompt",
  });

  const TOTAL_DURATION = 15.0;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const elapsedRef = useRef(0);
  const camStateRef = useRef({
    camX: 640,
    camY: 360,
    camZoom: 1.25,
    prevCamX: 640,
    prevCamY: 360,
    history: [] as Array<{ x: number; y: number }>,
  });

  // High-Motion Graphics 60fps Canvas Render Loop with Camera Center Tracking + Directional Motion Blur
  useEffect(() => {
    if (playerMode !== "motion") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 1280;
    const H = 720;
    let lastTime = performance.now();
    let rafId = 0;
    let frameCount = 0;

    const drawWorldScene = (t: number) => {
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0, "#0b0408");
      bgGrad.addColorStop(0.5, "#13070d");
      bgGrad.addColorStop(1, "#080306");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(-320, -320, W + 640, H + 640);

      const rad1 = ctx.createRadialGradient(340, 180, 10, 340, 180, 460);
      rad1.addColorStop(0, "rgba(225, 29, 72, 0.20)");
      rad1.addColorStop(1, "rgba(225, 29, 72, 0)");
      ctx.fillStyle = rad1;
      ctx.fillRect(0, 0, W, H);

      const rad2 = ctx.createRadialGradient(980, 460, 10, 980, 460, 460);
      rad2.addColorStop(0, "rgba(249, 115, 22, 0.16)");
      rad2.addColorStop(1, "rgba(249, 115, 22, 0)");
      ctx.fillStyle = rad2;
      ctx.fillRect(0, 0, W, H);

      // Top App Chrome Bar
      roundRect(
        ctx,
        28,
        20,
        W - 56,
        54,
        14,
        "rgba(24, 12, 18, 0.94)",
        "rgba(225, 29, 72, 0.45)",
        1.5
      );
      ctx.fillStyle = "#fb7185";
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
        "rgba(6, 78, 59, 0.9)",
        "rgba(16, 185, 129, 0.9)",
        1.8
      );
      ctx.fillStyle = `rgba(52, 211, 153, ${badgePulse.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(472, 47, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ecfdf5";
      ctx.font = "bold 12px monospace";
      ctx.fillText("LIVE AI: gemini-3.5-flash-lite", 486, 51);

      // Board Zones Bar
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 11px monospace";
      ctx.fillText("BOARD ZONES:", 740, 51);

      const isZone1Linked = t >= 9.6;
      roundRect(
        ctx,
        835,
        31,
        185,
        32,
        8,
        isZone1Linked ? "rgba(225, 29, 72, 0.32)" : "rgba(30, 41, 59, 0.85)",
        isZone1Linked ? "#f43f5e" : "#475569",
        isZone1Linked ? 2.2 : 1.2
      );
      ctx.fillStyle = isZone1Linked ? "#ffe4e6" : "#e2e8f0";
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
          "rgba(245, 158, 11, 0.26)",
          "#f59e0b",
          2
        );
        ctx.fillStyle = "#fde68a";
        ctx.font = "bold 11px monospace";
        ctx.fillText("🌿 #2 Optimal Branch", 1042, 51);
        ctx.restore();
      }

      // Prompt Bar Row (y = 84..136)
      roundRect(
        ctx,
        28,
        84,
        W - 56,
        52,
        12,
        "rgba(18, 10, 15, 0.96)",
        "rgba(244, 63, 94, 0.45)",
        1.5
      );
      const prompt1 =
        "Simulate sliding window algorithm for max subarray sum k=3 with dry run";
      const prompt2 =
        "Zone #1 Linked -> Branch optimal O(n) vs O(n*k) comparison from Step 3";
      const activePrompt = t < 9.7 ? prompt1 : prompt2;
      const typedLen =
        t < 1.9
          ? Math.floor(lerp(0, prompt1.length, t / 1.8))
          : t < 9.7
          ? prompt1.length
          : Math.floor(lerp(0, prompt2.length, (t - 9.7) / 0.9));

      ctx.fillStyle = "#f43f5e";
      ctx.font = "bold 12px monospace";
      ctx.fillText("ASK AI >", 48, 115);

      ctx.fillStyle = "#f8fafc";
      ctx.font = "13px monospace";
      ctx.fillText(
        activePrompt.slice(0, typedLen) +
          (Math.floor(t * 4) % 2 === 0 ? "▋" : ""),
        120,
        115
      );

      const btnLabel =
        t >= 9.7 ? "🌿 Branch From Zone #1" : "✨ Ask AI Co-Teacher";
      const btnColor = t >= 9.7 ? "#e11d48" : "#f97316";
      roundRect(ctx, W - 245, 92, 205, 36, 8, btnColor, "#ffffff", 1.2);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px monospace";
      ctx.fillText(btnLabel, W - 228, 115);

      // Main Excalidraw Whiteboard Canvas Surface
      roundRect(ctx, 28, 148, W - 56, 512, 18, "#f8fafc", "#cbd5e1", 2);

      ctx.fillStyle = "#cbd5e1";
      for (let wx = 48; wx < W - 48; wx += 24) {
        for (let wy = 168; wy < 644; wy += 24) {
          ctx.fillRect(wx, wy, 1.5, 1.5);
        }
      }

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

      // Smooth sliding window interpolation (no discrete jump!)
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

        roundRect(
          ctx,
          zx,
          zy,
          zw,
          zh,
          14,
          "#ffffff",
          isZone1Linked ? "#e11d48" : "#0284c7",
          isZone1Linked ? 3 : 2,
          true
        );

        roundRect(
          ctx,
          zx,
          zy,
          zw,
          42,
          12,
          isZone1Linked ? "#ffe4e6" : "#e0f2fe",
          isZone1Linked ? "#e11d48" : "#0284c7",
          1.5
        );
        ctx.fillStyle = isZone1Linked ? "#be123c" : "#0369a1";
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
          "#dcfce7",
          "#16a34a",
          1.5
        );
        ctx.fillStyle = "#15803d";
        ctx.font = "bold 11px monospace";
        ctx.fillText("LIVE AI: gemini-3.5-flash-lite", zx + zw - 206, zy + 25);

        roundRect(
          ctx,
          zx + 18,
          zy + 54,
          zw - 36,
          62,
          10,
          "#f0f9ff",
          "#0284c7",
          1.5
        );
        ctx.fillStyle = "#0369a1";
        ctx.font = "bold 14px monospace";
        ctx.fillText(stepTitles[stepIdx]!, zx + 30, zy + 76);
        ctx.fillStyle = "#0f172a";
        ctx.font = "12px monospace";
        ctx.fillText(invariants[stepIdx]!, zx + 30, zy + 100);

        roundRect(
          ctx,
          zx + 18,
          zy + 128,
          zw - 36,
          32,
          8,
          "#f8fafc",
          "#64748b",
          1.2
        );
        ctx.fillStyle = "#334155";
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
          "rgba(254, 243, 199, 0.42)",
          "#d97706",
          3,
          true
        );
        ctx.fillStyle = "#b45309";
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
          const stroke = isPeak ? "#16a34a" : inWin ? "#d97706" : "#64748b";
          const bg = isPeak ? "#dcfce7" : inWin ? "#fef3c7" : "#f8fafc";

          ctx.fillStyle = "#64748b";
          ctx.font = "11px monospace";
          ctx.fillText(`[${i}]`, cx + 28, rowY - 4);

          roundRect(ctx, cx, rowY, cellW, cellH, 10, bg, stroke, inWin ? 3 : 1.5);
          ctx.fillStyle = "#0f172a";
          ctx.font = "bold 22px monospace";
          ctx.fillText(String(arr[i]), cx + 31, rowY + 40);
        }

        const lx = rowStartX + smoothWinStart * (cellW + cellGap) + cellW / 2;
        const rx =
          rowStartX + (smoothWinStart + 2) * (cellW + cellGap) + cellW / 2;
        drawArrow(ctx, lx, rowY + cellH + 38, lx, rowY + cellH + 6, "#0284c7", 3);
        ctx.fillStyle = "#0284c7";
        ctx.font = "bold 13px monospace";
        ctx.fillText(`L=${winStart}`, lx - 16, rowY + cellH + 54);

        drawArrow(ctx, rx, rowY + cellH + 38, rx, rowY + cellH + 6, "#16a34a", 3);
        ctx.fillStyle = "#16a34a";
        ctx.font = "bold 13px monospace";
        ctx.fillText(`R=${winEnd}`, rx - 16, rowY + cellH + 54);

        const cards = [
          {
            k: "window [L..R]",
            v: `[${winStart} .. ${winEnd}]`,
            stroke: "#0284c7",
            bg: "#e0f2fe",
          },
          {
            k: "windowSum",
            v: String(winSums[stepIdx]),
            stroke: "#d97706",
            bg: "#fef3c7",
          },
          {
            k: "maxSum (Best)",
            v: `${maxSums[stepIdx]}${stepIdx === 2 ? " 🎯" : ""}`,
            stroke: "#16a34a",
            bg: "#dcfce7",
          },
        ];
        cards.forEach((c, idx) => {
          const kx = zx + 26 + idx * 206;
          const ky = zy + 365;
          roundRect(ctx, kx, ky, 192, 68, 10, c.bg, c.stroke, 2);
          ctx.fillStyle = c.stroke;
          ctx.font = "bold 11px monospace";
          ctx.fillText(c.k, kx + 12, ky + 22);
          ctx.fillStyle = "#0f172a";
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
            "#ffe4e6",
            "#e11d48",
            1.5
          );
          ctx.fillStyle = "#be123c";
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

        drawArrow(ctx, 720, 395, 768, 395, "#e11d48", 3.5, true);

        const z2x = 774;
        const z2y = 166;
        const z2w = 462;
        const z2h = 476;

        roundRect(ctx, z2x, z2y, z2w, z2h, 14, "#ffffff", "#d97706", 2.5, true);
        roundRect(ctx, z2x, z2y, z2w, 42, 12, "#fef3c7", "#d97706", 1.5);
        ctx.fillStyle = "#b45309";
        ctx.font = "bold 12px monospace";
        ctx.fillText("🌿 ZONE #2 • BRANCHED FROM ZONE #1", z2x + 14, z2y + 26);

        roundRect(
          ctx,
          z2x + z2w - 196,
          z2y + 7,
          184,
          28,
          6,
          "#dcfce7",
          "#16a34a",
          1.5
        );
        ctx.fillStyle = "#15803d";
        ctx.font = "bold 10px monospace";
        ctx.fillText("LIVE AI: gemini-3.5-flash", z2x + z2w - 186, z2y + 25);

        roundRect(
          ctx,
          z2x + 16,
          z2y + 52,
          z2w - 32,
          32,
          8,
          "#ffe4e6",
          "#e11d48",
          1.5
        );
        ctx.fillStyle = "#be123c";
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
          "#f8fafc",
          "#0284c7",
          1.8
        );
        ctx.fillStyle = "#0369a1";
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
          "#fee2e2",
          "#dc2626",
          1.5
        );
        ctx.fillStyle = "#991b1b";
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
          "#dcfce7",
          "#16a34a",
          1.5
        );
        ctx.fillStyle = "#166534";
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
          "#f0fdf4",
          "#16a34a",
          1.8
        );
        ctx.fillStyle = "#15803d";
        ctx.font = "bold 13px monospace";
        ctx.fillText(
          "O(1) Window Transition Delta at Step 3:",
          z2x + 28,
          z2y + 288
        );

        roundRect(ctx, z2x + 26, z2y + 306, 118, 64, 8, "#e0f2fe", "#0284c7", 2);
        ctx.fillStyle = "#0369a1";
        ctx.font = "bold 11px monospace";
        ctx.fillText("Prev Sum [1..3]", z2x + 38, z2y + 328);
        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 20px monospace";
        ctx.fillText("7", z2x + 76, z2y + 355);

        roundRect(
          ctx,
          z2x + 164,
          z2y + 306,
          126,
          64,
          8,
          "#fef3c7",
          "#d97706",
          2
        );
        ctx.fillStyle = "#b45309";
        ctx.font = "bold 11px monospace";
        ctx.fillText("Delta (-arr[1]+arr[4])", z2x + 170, z2y + 328);
        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 18px monospace";
        ctx.fillText("-1 + 3 = +2", z2x + 178, z2y + 355);

        roundRect(
          ctx,
          z2x + 310,
          z2y + 306,
          122,
          64,
          8,
          "#dcfce7",
          "#16a34a",
          2.5
        );
        ctx.fillStyle = "#15803d";
        ctx.font = "bold 11px monospace";
        ctx.fillText("Peak Sum [2..4]", z2x + 322, z2y + 328);
        ctx.fillStyle = "#15803d";
        ctx.font = "bold 20px monospace";
        ctx.fillText("9 🎯", z2x + 350, z2y + 355);

        ctx.fillStyle = "#334155";
        ctx.font = "bold 12px monospace";
        ctx.fillText(
          "✓ Preserves full context from Linked Zone #1 automatically!",
          z2x + 28,
          z2y + 416
        );

        ctx.restore();
      }
    };

    const drawCursorWithMotionBlur = (
      t: number,
      cursorX: number,
      cursorY: number,
      vx: number,
      vy: number,
      label: string
    ) => {
      const speed = Math.hypot(vx, vy);
      const hist = camStateRef.current.history;

      // 1. Glowing Laser Comet Ribbon Trail
      if (hist.length > 2) {
        for (let i = 1; i < hist.length; i++) {
          const p0 = hist[i - 1]!;
          const p1 = hist[i]!;
          const ratio = i / hist.length;
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.strokeStyle = `rgba(244, 63, 94, ${(ratio * 0.55).toFixed(3)})`;
          ctx.lineWidth = 2 + ratio * 12;
          ctx.lineCap = "round";
          ctx.stroke();
          ctx.restore();
        }
      }

      // 2. Click Shockwave Ripples
      for (const kf of CURSOR_KEYFRAMES) {
        if (kf.click && t >= kf.t && t <= kf.t + 0.55) {
          const p = (t - kf.t) / 0.55;
          const r = 10 + easeOutBack(p) * 48;
          ctx.save();
          ctx.beginPath();
          ctx.arc(kf.x, kf.y, Math.max(2, r), 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(244, 63, 94, ${((1 - p) * 0.85).toFixed(3)})`;
          ctx.lineWidth = 3.5 * (1 - p);
          ctx.stroke();
          ctx.restore();
        }
      }

      // 3. Directional Motion Blur Ghosts when moving fast
      const blurSamples = speed > 2.2 ? 6 : 1;
      for (let s = blurSamples - 1; s >= 0; s--) {
        const frac = s / blurSamples;
        const gx = cursorX - vx * frac * 2.2;
        const gy = cursorY - vy * frac * 2.2;
        const alpha = s === 0 ? 1 : (1 - frac) * 0.28;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(gx, gy);

        const tilt = clamp(vx * 0.012, -0.32, 0.32);
        ctx.rotate(tilt);

        // Outer laser halo
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(225, 29, 72, 0.24)";
        ctx.fill();

        // Crisp vector pointer arrow
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 22);
        ctx.lineTo(6, 17);
        ctx.lineTo(11, 26);
        ctx.lineTo(15, 24);
        ctx.lineTo(10, 15);
        ctx.lineTo(18, 15);
        ctx.closePath();
        ctx.fillStyle = "#e11d48";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();

        if (s === 0) {
          roundRect(
            ctx,
            18,
            10,
            168,
            26,
            8,
            "rgba(15, 23, 42, 0.92)",
            "#f43f5e",
            1.5
          );
          ctx.fillStyle = "#fda4af";
          ctx.font = "bold 10px monospace";
          ctx.fillText(`🤖 ${label.slice(0, 22)}`, 26, 27);
        }

        ctx.restore();
      }
    };

    const renderLoop = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (isPlaying) {
        elapsedRef.current = (elapsedRef.current + dt) % TOTAL_DURATION;
      }
      const t = elapsedRef.current;

      const target = sampleCursorAndZoom(t, TOTAL_DURATION);
      const st = camStateRef.current;
      const prevCursor =
        st.history.length > 0
          ? st.history[st.history.length - 1]!
          : { x: target.x, y: target.y };
      const vx = target.x - prevCursor.x;
      const vy = target.y - prevCursor.y;

      st.history.push({ x: target.x, y: target.y });
      if (st.history.length > 18) st.history.shift();

      st.prevCamX = st.camX;
      st.prevCamY = st.camY;

      if (cameraTrackEnabled) {
        const desiredCamX = lerp(W / 2, target.x, 0.62);
        const desiredCamY = lerp(H / 2, target.y, 0.62);
        st.camX = lerp(st.camX, desiredCamX, 0.14);
        st.camY = lerp(st.camY, desiredCamY, 0.14);
        st.camZoom = lerp(st.camZoom, target.zoom, 0.12);
      } else {
        st.camX = lerp(st.camX, W / 2, 0.15);
        st.camY = lerp(st.camY, H / 2, 0.15);
        st.camZoom = lerp(st.camZoom, 1.0, 0.15);
      }

      const camVx = st.camX - st.prevCamX;
      const camVy = st.camY - st.prevCamY;
      const camSpeed = Math.hypot(camVx, camVy);

      ctx.clearRect(0, 0, W, H);

      // Multi-pass Directional Camera Motion Blur when camera whips across canvas
      const camPasses = cameraTrackEnabled && camSpeed > 2.5 ? 3 : 1;
      for (let p = camPasses - 1; p >= 0; p--) {
        const offsetFrac = p / camPasses;
        const subCamX = st.camX - camVx * offsetFrac * 1.85;
        const subCamY = st.camY - camVy * offsetFrac * 1.85;

        ctx.save();
        ctx.globalAlpha = p === 0 ? 1.0 : 0.24;
        ctx.translate(W / 2, H / 2);
        ctx.scale(st.camZoom, st.camZoom);
        ctx.translate(-subCamX, -subCamY);

        drawWorldScene(t);
        if (p === 0) {
          drawCursorWithMotionBlur(
            t,
            target.x,
            target.y,
            vx,
            vy,
            target.label
          );
        }
        ctx.restore();
      }

      // Screen-space Cinematic Vignette
      const vig = ctx.createRadialGradient(
        W / 2,
        H / 2,
        H * 0.36,
        W / 2,
        H / 2,
        W * 0.65
      );
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(5, 2, 4, 0.52)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      // Screen-space Camera Lens HUD Pill
      roundRect(
        ctx,
        20,
        16,
        310,
        28,
        8,
        "rgba(15, 7, 12, 0.86)",
        "rgba(244, 63, 94, 0.48)",
        1.2
      );
      ctx.fillStyle = "#fda4af";
      ctx.font = "bold 11px monospace";
      ctx.fillText(
        `🎥 CAM TRACK: ${st.camZoom.toFixed(2)}x • ${target.label}`,
        32,
        34
      );

      // Screen-space Bottom Caption HUD
      roundRect(
        ctx,
        24,
        H - 54,
        W - 48,
        40,
        10,
        "rgba(15, 7, 12, 0.92)",
        "rgba(244, 63, 94, 0.45)",
        1.5
      );
      const hudText =
        t < 3.2
          ? "01 / LIVE PROMPT: Type any algorithm prompt & trigger live Gemini Excalidraw generation"
          : t < 9.2
          ? "02 / AI WHITEBOARD DRAW: Camera tracks AI laser cursor across raw array, L/R pointers & state cards"
          : t < 11.2
          ? "03 / LINK ZONE #1 (🎯 #1): Tag previous zone to attach its topic, active step & dataset [2,1,5,1,3,2]"
          : "04 / BRANCH ZONE #2: Spawn connected comparison zone with full context from Linked Zone #1";
      ctx.fillStyle = "#ffe4e6";
      ctx.font = "bold 12px monospace";
      ctx.fillText(hudText, 42, H - 30);

      frameCount++;
      if (frameCount % 6 === 0) {
        setElapsedSec(t);
        setLiveHudTelemetry({
          zoom: `${st.camZoom.toFixed(2)}x`,
          label: target.label,
        });
      }

      rafId = requestAnimationFrame(renderLoop);
    };

    rafId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, playerMode, cameraTrackEnabled]);

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
    if (playerMode === "video" && videoRef.current) {
      videoRef.current.currentTime = target.timeRange[0];
      videoRef.current.play().catch(() => {});
    }
  };

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto w-full">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-primary mb-4 shadow-xs">
          <Sparkles className="size-3.5 text-primary" />
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

      {/* 4-Card AI Whiteboard Feature Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
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
            <div className="my-5 rounded-2xl border border-slate-300/80 bg-[#f8fafc] text-slate-900 p-4 font-mono text-xs shadow-inner relative overflow-hidden">
              {/* Top Zone Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-slate-200">
                <span className="inline-flex items-center gap-1.5 font-bold text-[11px] text-sky-700 bg-sky-100 border border-sky-300 rounded-md px-2.5 py-0.5">
                  ZONE #1 • SLIDING WINDOW MAX SUBARRAY SUM (K=3)
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-400 rounded-md px-2 py-0.5">
                  ✓ LIVE AI: gemini-3.5-flash-lite
                </span>
              </div>

              {/* Raw Input Dataset Banner */}
              <div className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 mb-3 flex items-center justify-between">
                <span>Input: arr = [2, 1, 5, 1, 3, 2], k = 3</span>
                <span className="text-sky-700">
                  Step {activeStep.step}/4: {activeStep.title}
                </span>
              </div>

              {/* Array Cells + Smoothly Gliding AI Laser Cursor */}
              <div className="relative py-4 px-2 flex items-center justify-center gap-2 sm:gap-3">
                {demoArray.map((val, idx) => {
                  const inWin =
                    idx >= activeStep.winStart && idx <= activeStep.winEnd;
                  const isPeak = activeStep.step === 3 && inWin;
                  const isLeft = idx === activeStep.winStart;
                  const isRight = idx === activeStep.winEnd;
                  return (
                    <div key={idx} className="flex flex-col items-center relative">
                      <span className="text-[10px] text-slate-500 mb-1">
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
                            ? "bg-emerald-100 border-2 border-emerald-600 text-emerald-950 ring-2 ring-amber-500/60 shadow-md scale-105"
                            : inWin
                            ? "bg-amber-100 border-2 border-amber-600 text-amber-950 ring-2 ring-amber-400/50 shadow-sm scale-105"
                            : "bg-white border border-slate-300 text-slate-700"
                        }`}
                      >
                        {val}
                      </button>
                      <div className="h-6 mt-1 flex items-center justify-center">
                        {isLeft && (
                          <span className="inline-flex items-center rounded bg-sky-100 border border-sky-500 px-1.5 py-0.5 text-[9px] font-bold text-sky-800">
                            ↑ L={idx}
                          </span>
                        )}
                        {isRight && (
                          <span className="inline-flex items-center rounded bg-emerald-100 border border-emerald-600 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
                            ↑ R={idx}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Live State Tracker Cards */}
              <div className="grid grid-cols-3 gap-2 mt-1 pt-2.5 border-t border-slate-200">
                <div className="rounded-lg border border-sky-400 bg-sky-50 px-2.5 py-1.5">
                  <div className="text-[9px] font-bold text-sky-700 uppercase">
                    window [L..R]
                  </div>
                  <div className="text-xs font-black text-slate-900">
                    [{activeStep.winStart} .. {activeStep.winEnd}]
                  </div>
                </div>
                <div className="rounded-lg border border-amber-500 bg-amber-50 px-2.5 py-1.5">
                  <div className="text-[9px] font-bold text-amber-800 uppercase">
                    windowSum
                  </div>
                  <div className="text-xs font-black text-slate-900">
                    {activeStep.windowSum}
                  </div>
                </div>
                <div className="rounded-lg border border-emerald-500 bg-emerald-50 px-2.5 py-1.5">
                  <div className="text-[9px] font-bold text-emerald-800 uppercase">
                    maxSum (Best)
                  </div>
                  <div className="text-xs font-black text-emerald-900">
                    {activeStep.maxSum} {activeStep.step >= 3 ? "🎯" : ""}
                  </div>
                </div>
              </div>

              {/* Step Scrubber Bar */}
              <div className="mt-3 flex items-center justify-between gap-2 bg-slate-100 rounded-lg px-3 py-1.5 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-700 truncate">
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
                          ? "bg-rose-600 text-white"
                          : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-200"
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
              to="/interview"
              className="flex items-center gap-1 hover:underline"
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
              <span className="rounded-full border border-rose-500/40 bg-rose-500/15 px-3 py-1 font-mono text-[11px] font-bold text-rose-300">
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

            <div className="my-5 rounded-2xl border border-rose-500/30 bg-background/85 p-4 font-mono text-xs space-y-3 shadow-inner">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/50">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-400">
                  <Crosshair className="size-3.5" />
                  <span>Linked Zone #1: Sliding Window (Step 3/4)</span>
                </span>
                <span className="rounded bg-rose-500/20 border border-rose-500/40 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
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
                      ? "border-rose-500 bg-rose-500/20 text-rose-200 font-bold"
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
                      ? "border-amber-500 bg-amber-500/20 text-amber-200 font-bold"
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
                    <strong className="text-rose-400 font-mono">
                      Branch Mode:
                    </strong>{" "}
                    Spawns non-overlapping <strong>Zone #2</strong> to the right
                    of Zone #1 with a dashed rose arrow and full context banner.
                  </span>
                ) : (
                  <span>
                    <strong className="text-amber-400 font-mono">
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
              to="/interview"
              className="inline-flex items-center gap-1 text-[11px] hover:underline"
            >
              <span>Try Zone Linking</span>
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>

        {/* Card 3: Multi-Zone Spatial Canvas & Model Attribution (Span 5) */}
        <div className="md:col-span-5 group rounded-3xl border border-border/80 bg-card/85 p-6 sm:p-8 backdrop-blur-xl flex flex-col justify-between hover:border-accent/50 hover:shadow-2xl transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="size-12 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shadow-xs">
                <Layers className="size-6" />
              </div>
              <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-[11px] font-bold text-accent">
                Spatial Board Zones
              </span>
            </div>

            <h3 className="font-display text-2xl font-black text-foreground group-hover:text-accent transition-colors">
              Verified Live Model Badges &amp; Multi-Zone History
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed font-sans">
              Every simulation renders inside a non-overlapping architectural
              frame with a live badge showing the exact model that
              answered—never overwriting your previous drawings.
            </p>

            <div className="my-5 rounded-2xl border border-border/70 bg-background/80 p-3.5 font-mono text-xs space-y-2.5 shadow-inner">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                Active Board Zones Navigation Bar
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500 bg-rose-500/20 px-2.5 py-1 text-[11px] font-bold text-rose-300">
                  🎯 #1 Sliding Window
                  <span className="rounded bg-emerald-500/30 px-1 text-[9px] text-emerald-200">
                    gemini-3.5-flash-lite
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-300">
                  🌿 #2 Prefix Sum Branch
                  <span className="rounded bg-emerald-500/30 px-1 text-[9px] text-emerald-200">
                    gemini-3.5-flash
                  </span>
                </span>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-300 flex items-center justify-between">
                <span>Model Which Answered Badge</span>
                <span className="font-bold">100% Live Verified</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/40 flex items-center justify-between font-mono text-xs text-accent">
            <span className="font-bold">Collision-Free Infinite Canvas</span>
            <Link
              to="/interview"
              className="flex items-center gap-1 hover:underline"
            >
              <span>Explore Zones</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 4: Rich Visual Primitives & Composite Widgets (Span 7) */}
        <div className="md:col-span-7 group rounded-3xl border border-border/80 bg-card/85 p-6 sm:p-8 backdrop-blur-xl flex flex-col justify-between hover:border-primary/50 hover:shadow-2xl transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="size-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-xs">
                <Wand2 className="size-6" />
              </div>
              <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[11px] font-bold text-primary">
                Composite Excalidraw Primitives
              </span>
            </div>

            <h3 className="font-display text-2xl font-black text-foreground group-hover:text-primary transition-colors">
              Arrays, 2D DP Grids, Hash Maps, Trees &amp; Graphs
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed font-sans">
              Instead of static images, the AI composes real editable Excalidraw
              primitives—so you can drag nodes, draw annotations, or select any
              subset of shapes for AI inspection.
            </p>

            <div className="my-5 space-y-3">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "array", label: "Sliding Window & Two Pointers" },
                  { id: "hashmap", label: "Hash Map & Complement Table" },
                  { id: "tree", label: "Trees, Heaps & Recursion" },
                  { id: "grid2d", label: "2D DP & Matrix BFS/DFS" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActivePrimitive(item.id as any)}
                    className={`rounded-xl border px-3 py-1.5 font-mono text-xs font-bold transition-all ${
                      activePrimitive === item.id
                        ? "border-primary bg-primary/20 text-primary shadow-xs"
                        : "border-border/70 bg-secondary/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="rounded-2xl border border-border/70 bg-background/80 p-4 font-mono text-xs">
                {activePrimitive === "array" && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-primary font-bold">
                        1D Array + Dashed Window + Vertical Pointers
                      </div>
                      <div className="text-muted-foreground text-[11px] font-sans mt-0.5">
                        Automatic <code className="font-mono">[0]..[n-1]</code>{" "}
                        index headers, dashed window frames around contiguous
                        highlighted cells, and{" "}
                        <code className="font-mono">L/R/mid</code> pointer
                        arrows.
                      </div>
                    </div>
                    <span className="shrink-0 rounded-lg bg-amber-500/15 border border-amber-500/40 px-3 py-1.5 text-amber-300 font-bold">
                      Window [L..R] + Pointers
                    </span>
                  </div>
                )}
                {activePrimitive === "hashmap" && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-primary font-bold">
                        Live Key-Value Hash Table Widget
                      </div>
                      <div className="text-muted-foreground text-[11px] font-sans mt-0.5">
                        Renders structured{" "}
                        <code className="font-mono">key → value/index</code>{" "}
                        lookup tables alongside the input array with curved
                        lookup arrows on O(1) hits.
                      </div>
                    </div>
                    <span className="shrink-0 rounded-lg bg-sky-500/15 border border-sky-500/40 px-3 py-1.5 text-sky-300 font-bold">
                      seen[complement] → idx
                    </span>
                  </div>
                )}
                {activePrimitive === "tree" && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-primary font-bold">
                        Hierarchical Tree, Trie &amp; Graph Layouts
                      </div>
                      <div className="text-muted-foreground text-[11px] font-sans mt-0.5">
                        Collision-free node placement with
                        directed/bidirectional edges, split-compartment linked
                        list nodes, and recursion stack buckets.
                      </div>
                    </div>
                    <span className="shrink-0 rounded-lg bg-emerald-500/15 border border-emerald-500/40 px-3 py-1.5 text-emerald-300 font-bold">
                      Nodes + Labeled Edges
                    </span>
                  </div>
                )}
                {activePrimitive === "grid2d" && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-primary font-bold">
                        2D Matrix &amp; Dynamic Programming Table
                      </div>
                      <div className="text-muted-foreground text-[11px] font-sans mt-0.5">
                        Row/column headers, per-cell transition highlights, and
                        live recurrence invariant cards (
                        <code className="font-mono">dp[r][c] = max(...)</code>).
                      </div>
                    </div>
                    <span className="shrink-0 rounded-lg bg-purple-500/15 border border-purple-500/40 px-3 py-1.5 text-purple-300 font-bold">
                      grid2d[r][c] + State Cards
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/40 font-mono text-xs text-primary font-bold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-4" />
              <span>100% Editable Excalidraw Vector Shapes</span>
            </span>
            <Link
              to="/interview"
              className="flex items-center gap-1 hover:underline"
            >
              <span>Launch Full Whiteboard</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* =====================================================================
          HIGH-MOTION GRAPHICS OVERVIEW VIDEO SHOWCASE (PLACED UNDER SECTION)
         ===================================================================== */}
      <div className="mt-12 rounded-3xl border border-primary/40 bg-gradient-to-b from-card/95 via-background/95 to-card/90 p-5 sm:p-8 shadow-[0_0_60px_-15px_rgba(225,29,72,0.3)] backdrop-blur-2xl">
        {/* Video Showcase Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-border/60">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/15 px-3 py-1 text-[11px] font-mono font-bold text-rose-300 mb-2">
              <Film className="size-3.5 text-rose-400" />
              <span>
                60FPS CAMERA-TRACKED MOTION GRAPHICS OVERVIEW • DIRECTIONAL MOTION BLUR
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-display font-black text-foreground">
              Watch the AI Co-Teacher Draw, Link Zones &amp; Branch Live
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground font-sans mt-1">
              Screen-Studio camera tracking follows the AI laser cursor with dynamic zoom (<code className="text-primary font-mono">{liveHudTelemetry.zoom}</code>) and directional motion blur as it draws arrays, links <code className="text-rose-400 font-mono">🎯 Zone #1</code>, and branches <code className="text-amber-400 font-mono">🌿 Zone #2</code>.
            </p>
          </div>

          {/* Mode Switcher + Camera Tracking Toggle + Download Video Button */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {playerMode === "motion" && (
              <button
                type="button"
                onClick={() => setCameraTrackEnabled((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 font-mono text-xs font-bold transition-all ${
                  cameraTrackEnabled
                    ? "border-rose-500/60 bg-rose-500/20 text-rose-200 shadow-xs"
                    : "border-border/80 bg-secondary/50 text-muted-foreground hover:text-foreground"
                }`}
                title="Toggle Dynamic Camera Center Tracking & Motion Blur Zoom"
              >
                <Camera className="size-3.5 text-rose-400" />
                <span>Cam Zoom &amp; Blur: {cameraTrackEnabled ? "ON" : "OFF"}</span>
              </button>
            )}

            <div className="inline-flex rounded-xl border border-border/80 bg-secondary/60 p-1 font-mono text-xs">
              <button
                type="button"
                onClick={() => setPlayerMode("motion")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  playerMode === "motion"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                ✨ 60fps Motion Canvas
              </button>
              <button
                type="button"
                onClick={() => setPlayerMode("video")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  playerMode === "video"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                🎬 WebM Video File
              </button>
            </div>

            <a
              href="/videos/ai-whiteboard-overview.webm"
              download="dsa-viz-ai-whiteboard-overview.webm"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-secondary/50 hover:bg-secondary px-3 py-2 font-mono text-xs font-bold text-foreground transition-colors"
            >
              <Download className="size-3.5 text-primary" />
              <span>Download .webm</span>
            </a>
          </div>
        </div>

        {/* Widescreen 16:9 Motion-Graphics Viewport */}
        <div className="mt-6 relative rounded-2xl border border-rose-500/35 bg-[#070305] overflow-hidden shadow-2xl">
          {playerMode === "video" ? (
            <div className="relative w-full aspect-video bg-black flex items-center justify-center">
              <video
                ref={videoRef}
                src="/videos/ai-whiteboard-overview.webm"
                className="w-full h-full object-contain"
                autoPlay
                loop
                muted
                playsInline
                controls
              />
            </div>
          ) : (
            <div className="relative w-full aspect-video bg-[#070305]">
              <canvas
                ref={canvasRef}
                width={1280}
                height={720}
                className="w-full h-full block object-contain"
              />
            </div>
          )}

          {/* Interactive Timeline Scrubber Bar Below Canvas */}
          <div className="border-t border-rose-500/30 bg-[#12070d]/95 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="shrink-0 rounded bg-primary/20 border border-primary/40 px-2 py-0.5 text-[10px] font-bold text-primary">
                {currentChapter.code}
              </span>
              <span className="font-bold text-foreground text-xs truncate">
                {currentChapter.title}
              </span>
              <span className="hidden md:inline text-rose-300/80 text-[11px] truncate">
                • Focus: {liveHudTelemetry.label} ({liveHudTelemetry.zoom})
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-muted-foreground">
                {elapsedSec.toFixed(1)}s / {TOTAL_DURATION.toFixed(1)}s
              </span>
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                className="inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground px-2.5 py-1 text-[11px] font-bold hover:opacity-90 transition-opacity"
              >
                {isPlaying ? (
                  <Pause className="size-3" />
                ) : (
                  <Play className="size-3" />
                )}
                <span>{isPlaying ? "Pause" : "Play"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  elapsedRef.current = 0;
                  setElapsedSec(0);
                  setIsPlaying(true);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-secondary/60 px-2 py-1 text-[11px] font-bold text-foreground hover:bg-secondary"
                title="Restart Overview Video"
              >
                <RotateCcw className="size-3" />
              </button>
            </div>
          </div>
        </div>

        {/* 4 Interactive Video Chapter Scrubber Pills */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {MOTION_CHAPTERS.map((ch, idx) => {
            const isActive = idx === currentChapterIdx;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => handleJumpToChapter(idx)}
                className={`rounded-2xl border p-3 text-left transition-all duration-200 ${
                  isActive
                    ? "border-primary bg-primary/15 shadow-md"
                    : "border-border/60 bg-background/60 hover:border-primary/40 hover:bg-card/80"
                }`}
              >
                <div className="flex items-center justify-between font-mono text-[10px] mb-1">
                  <span
                    className={
                      isActive ? "text-primary font-bold" : "text-muted-foreground"
                    }
                  >
                    {ch.code}
                  </span>
                  <span className="text-muted-foreground">
                    {ch.timeRange[0]}s–{ch.timeRange[1]}s
                  </span>
                </div>
                <div className="font-display text-sm font-black text-foreground">
                  {ch.title}
                </div>
                <div className="text-[11px] text-muted-foreground font-sans mt-0.5 line-clamp-2">
                  {ch.subtitle}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
