// Ported from Agentic-Hub-office (src/client/ui/whiteboard-app.ts & src/client/ui/whiteboard.ts)
// Enhanced with:
// 1. Bounded, Non-Overlapping Simulation Zones (each simulation lives inside its own fixed card on the canvas)
// 2. Smooth 60fps Live-Moving AI Co-Teacher Cursor & Laser Trail across frame waypoints
// 3. Drag-Selection Awareness (AI detects user-selected whiteboard elements/areas to answer or take over)

import React, { useEffect, useRef, useState, useCallback } from "react";
import "@excalidraw/excalidraw/index.css";
import {
  Sparkles,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Maximize2,
  Minimize2,
  Send,
  Crosshair,
  Loader2,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  SlidersHorizontal,
  Download,
  MousePointerClick,
  GitBranch,
  Zap,
  Trash2,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import type { WhiteboardElement } from "@/lib/crdt-collab.server";
import {
  WB_MAX_ELEMENT_BYTES,
  byIndex,
  newer,
  tintedId,
  buildExcalidrawTwoPointersLesson,
  buildExcalidrawBinarySearchLesson,
  buildExcalidrawSlidingWindowLesson,
  buildExcalidrawMonotonicStackLesson,
  buildExcalidrawDpTableLesson,
  buildExcalidrawLinkedListLesson,
  buildExcalidrawTreeLesson,
  buildExcalidrawBruteForceDryRunLesson,
  generateAiExcalidrawLessonForQuery,
  extractWhiteboardSelectionContext,
  wrapLessonInBoundedZone,
  measureLessonZoneDimensions,
  type WbElement,
  type WbPointer,
  type AiWhiteboardLesson,
  type WhiteboardSelectionContext,
} from "@/shared/whiteboard";

export type WhiteboardPresetId =
  | "two_pointers"
  | "brute_force"
  | "sliding_window"
  | "binary_search"
  | "monotonic_stack"
  | "dp_table"
  | "linked_list"
  | "tree";

export interface AiWhiteboardProps {
  roomId?: string;
  isAiTeaching?: boolean;
  aiTeachingMessage?: string | null;
  externalElements?: WhiteboardElement[];
  onElementCreated?: (element: WhiteboardElement) => void;
  onClearBoard?: () => void;
  readOnly?: boolean;
  problemTitle?: string;
  currentCode?: string;
  onAiSpeak?: (text: string) => void;
  /** When true, stretches to fill the parent full-screen stage (used on /ai-learning) */
  fullScreenStage?: boolean;
  /** Optional external lesson injected from parent curriculum or dataset builder */
  activeLessonOverride?: AiWhiteboardLesson | null;
  /** Callback fired whenever active lesson or current frame index changes */
  onLessonStateChange?: (lesson: AiWhiteboardLesson, stepIndex: number) => void;
}

const SEND_MS = 80;
const BATCH_BYTES = 900_000;
const ZONE_COL_STRIDE = 960;
const ZONE_ROW_STRIDE = 660;
const ZONE_MIN_GAP = 72;

const LEGACY_UNZONED_PREFIXES = [
  "tp-",
  "bs-",
  "sw-",
  "ll-",
  "bst-",
  "ms-",
  "dp-",
  "bf-",
  "custom-",
  "ai-",
];

export function AiWhiteboard({
  roomId = "default-room",
  isAiTeaching = false,
  aiTeachingMessage = null,
  externalElements = [],
  onElementCreated,
  onClearBoard,
  readOnly = false,
  problemTitle = "",
  currentCode = "",
  onAiSpeak,
  fullScreenStage = false,
  activeLessonOverride = null,
  onLessonStateChange,
}: AiWhiteboardProps) {
  const [excalidrawModule, setExcalidrawModule] = useState<any>(null);
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Bounded Simulation Zones Registry (each simulation has its own fixed non-overlapping area!)
  const [zonesHistory, setZonesHistory] = useState<AiWhiteboardLesson[]>(() => {
    const initialRaw = buildExcalidrawTwoPointersLesson(
      [1, 3, 5, 8, 12, 17, 21],
      17
    );
    const initialZoned = wrapLessonInBoundedZone(initialRaw, {
      zoneId: "zone_1",
      zoneIndex: 0,
      originX: 40,
      originY: 40,
    });
    return [initialZoned];
  });
  const zonesHistoryRef = useRef<AiWhiteboardLesson[]>(zonesHistory);
  zonesHistoryRef.current = zonesHistory;

  const [activeZoneIdx, setActiveZoneIdx] = useState<number>(0);

  const activeLesson =
    zonesHistory[activeZoneIdx] ??
    zonesHistory[zonesHistory.length - 1] ??
    wrapLessonInBoundedZone(
      buildExcalidrawTwoPointersLesson([1, 3, 5, 8, 12, 17, 21], 17),
      { zoneId: "zone_1", zoneIndex: 0, originX: 40, originY: 40 }
    );

  // AI Query & Multi-Step Simulation State
  const [aiQueryInput, setAiQueryInput] = useState("");
  const [isGeneratingAiLesson, setIsGeneratingAiLesson] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlayingSteps, setIsPlayingSteps] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [autoVoiceNarrate, setAutoVoiceNarrate] = useState<boolean>(false);
  const [isListeningVoiceQuery, setIsListeningVoiceQuery] =
    useState<boolean>(false);
  const [showCustomBuilder, setShowCustomBuilder] = useState<boolean>(false);
  const [customArrayInput, setCustomArrayInput] =
    useState<string>("2, 4, 7, 11, 15, 19");
  const [customTargetInput, setCustomTargetInput] = useState<string>("18");
  const [aiStatusText, setAiStatusText] = useState<string>(
    "AI Co-Teacher ready — drag-select any area on the board or ask a query to spawn a new bounded simulation"
  );

  // User Drag-Selection Context on the Excalidraw Whiteboard
  const [selectionContext, setSelectionContext] =
    useState<WhiteboardSelectionContext>({
      selectedElements: [],
      bounds: null,
      extractedNumbers: [],
      extractedTexts: [],
    });
  const [selectionMode, setSelectionMode] = useState<"branch" | "takeover">(
    "branch"
  );
  const lastSelectionHashRef = useRef<string>("");

  // Store & Sync Refs (ported from Agentic-Hub-office/src/client/ui/whiteboard-app.ts)
  const knownElementsRef = useRef<Map<string, WbElement>>(new Map());
  const pendingRef = useRef<Map<string, any>>(new Map());
  const sendTimerRef = useRef<number>(0);
  const storedFilesRef = useRef<Set<string>>(new Set());
  const filesMapRef = useRef<Map<string, any>>(new Map());
  const uploadsRef = useRef<Map<string, Promise<boolean>>>(new Map());
  const missingFilesRef = useRef<Map<string, number>>(new Map());
  const tooBigRef = useRef<Set<string>>(new Set());
  const recognitionRef = useRef<any>(null);
  const zoneCounterRef = useRef<number>(1);

  // Smooth 60fps AI Cursor Interpolation Refs
  const cursorPosRef = useRef<{ x: number; y: number }>({ x: 320, y: 220 });
  const waypointIndexRef = useRef<number>(0);
  const lastWaypointSwitchRef = useRef<number>(Date.now());

  const currentFrame =
    activeLesson.frames[stepIndex] || activeLesson.frames[0];

  // Speak helper using either parent onAiSpeak or browser speechSynthesis
  const speakText = useCallback(
    (text: string) => {
      if (onAiSpeak) {
        onAiSpeak(text);
        return;
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(text);
          utter.rate = 1.03;
          utter.pitch = 1.0;
          window.speechSynthesis.speak(utter);
        } catch {
          // ignore speech synthesis error
        }
      }
    },
    [onAiSpeak]
  );

  /**
   * Injects ONLY the active zone's frame elements into Excalidraw while preserving
   * all other bounded simulation zones and user freehand drawings!
   * Also strips any legacy un-namespaced preset elements so old cached elements never collide.
   */
  const injectZoneFrameIntoExcalidraw = useCallback(
    (
      zoneId: string | undefined,
      frameElements: readonly WbElement[],
      autoScrollToZone = false
    ) => {
      if (!excalidrawAPI || !excalidrawModule) return;

      const { restoreElements, CaptureUpdateAction } = excalidrawModule;
      const prefix = zoneId ? `${zoneId}__` : "";

      // Keep all elements on the canvas that do NOT belong to this specific simulation zone
      // and purge any legacy un-namespaced preset elements
      const currentActiveElements = (
        excalidrawAPI.getSceneElements() as any[]
      ).filter((el) => {
        if (!el || el.isDeleted) return false;
        const idStr = typeof el.id === "string" ? el.id : "";
        if (prefix && idStr.startsWith(prefix)) {
          return false;
        }
        if (
          !idStr.includes("__") &&
          LEGACY_UNZONED_PREFIXES.some((p) => idStr.startsWith(p))
        ) {
          return false;
        }
        return true;
      });

      const restoredZoneElements = restoreElements(frameElements as any[], null);
      for (const el of restoredZoneElements) {
        knownElementsRef.current.set(el.id, el);
      }

      const combinedScene = [...currentActiveElements, ...restoredZoneElements];

      excalidrawAPI.updateScene({
        elements: combinedScene,
        captureUpdate: CaptureUpdateAction.NEVER,
      });

      if (
        autoScrollToZone &&
        typeof excalidrawAPI.scrollToContent === "function"
      ) {
        setTimeout(() => {
          try {
            excalidrawAPI.scrollToContent(restoredZoneElements, {
              fitToViewport: false,
              animate: true,
            });
          } catch {
            // ignore scroll error
          }
        }, 60);
      }
    },
    [excalidrawAPI, excalidrawModule]
  );

  /**
   * Computes a guaranteed non-overlapping canvas coordinate (originX, originY)
   * by checking BOTH the zones history registry AND the real bounding boxes of all
   * live elements currently rendered in Excalidraw (`excalidrawAPI.getSceneElements()`).
   */
  const computeNextFreeZoneOrigin = useCallback(
    (
      newZoneWidth: number,
      newZoneHeight: number,
      existingZones: AiWhiteboardLesson[],
      selCtx?: WhiteboardSelectionContext | null,
      mode?: "branch" | "takeover"
    ): {
      originX: number;
      originY: number;
      connectedFromBounds?: WhiteboardSelectionContext["bounds"];
    } => {
      // Collect all occupied rectangles from existing zones + live canvas elements
      const occupiedRects: Array<{
        x: number;
        y: number;
        width: number;
        height: number;
      }> = [];

      for (const z of existingZones) {
        if (z.zoneBounds) {
          occupiedRects.push(z.zoneBounds);
        }
      }

      if (excalidrawAPI && typeof excalidrawAPI.getSceneElements === "function") {
        const sceneEls = excalidrawAPI.getSceneElements() as any[];
        const takeoverIds =
          mode === "takeover" && selCtx
            ? new Set(selCtx.selectedElements.map((s) => s.id))
            : null;

        for (const el of sceneEls) {
          if (!el || el.isDeleted) continue;
          const idStr = typeof el.id === "string" ? el.id : "";
          if (takeoverIds && takeoverIds.has(idStr)) continue;
          if (
            !idStr.includes("__") &&
            LEGACY_UNZONED_PREFIXES.some((p) => idStr.startsWith(p))
          ) {
            continue;
          }
          const ex = Number(el.x) || 0;
          const ey = Number(el.y) || 0;
          const ew = Math.max(20, Number(el.width) || 40);
          const eh = Math.max(20, Number(el.height) || 40);
          occupiedRects.push({ x: ex, y: ey, width: ew, height: eh });
        }
      }

      const collidesWithOccupied = (cx: number, cy: number): boolean => {
        for (const r of occupiedRects) {
          const hitX =
            cx < r.x + r.width + ZONE_MIN_GAP &&
            cx + newZoneWidth + ZONE_MIN_GAP > r.x;
          const hitY =
            cy < r.y + r.height + ZONE_MIN_GAP &&
            cy + newZoneHeight + ZONE_MIN_GAP > r.y;
          if (hitX && hitY) return true;
        }
        return false;
      };

      // Case 1: User drag-selected an area on the board
      if (selCtx?.bounds && selCtx.selectedElements.length > 0) {
        if (mode === "takeover") {
          return {
            originX: selCtx.bounds.minX,
            originY: selCtx.bounds.minY,
            connectedFromBounds: null,
          };
        }
        // Branch mode: place cleanly to the right of the selected region, shifting down if occupied
        const candidateX = selCtx.bounds.maxX + 96;
        let candidateY = selCtx.bounds.minY;
        let guard = 0;
        while (collidesWithOccupied(candidateX, candidateY) && guard < 60) {
          candidateY += 140;
          guard++;
        }
        return {
          originX: candidateX,
          originY: candidateY,
          connectedFromBounds: selCtx.bounds,
        };
      }

      // Case 2: Place in a 2-column architectural grid, advancing slots until 100% collision-free
      const colStride = Math.max(ZONE_COL_STRIDE, newZoneWidth + ZONE_MIN_GAP + 28);
      const rowStride = Math.max(ZONE_ROW_STRIDE, newZoneHeight + ZONE_MIN_GAP + 28);

      let slotIdx = existingZones.length;
      let candidateX = 40;
      let candidateY = 40;
      let guard = 0;

      while (guard < 100) {
        const col = slotIdx % 2;
        const row = Math.floor(slotIdx / 2);
        candidateX = 40 + col * colStride;
        candidateY = 40 + row * rowStride;
        if (!collidesWithOccupied(candidateX, candidateY)) {
          break;
        }
        slotIdx++;
        guard++;
      }

      return {
        originX: candidateX,
        originY: candidateY,
        connectedFromBounds: null,
      };
    },
    [excalidrawAPI]
  );

  /**
   * Registers and activates a new bounded simulation zone on the whiteboard
   * without overwriting any previous simulation zones!
   * Pure and synchronous — safe under React 19 StrictMode and rapid multi-clicks.
   */
  const spawnBoundedSimulationZone = useCallback(
    (
      rawLesson: AiWhiteboardLesson,
      opts?: {
        selCtx?: WhiteboardSelectionContext | null;
        mode?: "branch" | "takeover";
      }
    ) => {
      const selCtx = opts?.selCtx;
      const mode = opts?.mode ?? selectionMode;

      // If taking over a user selection, remove the raw selected elements so the new bounded zone replaces them cleanly
      if (
        mode === "takeover" &&
        selCtx &&
        selCtx.selectedElements.length > 0 &&
        excalidrawAPI
      ) {
        const selectedSet = new Set(selCtx.selectedElements.map((s) => s.id));
        const kept = excalidrawAPI
          .getSceneElements()
          .filter((el: any) => !selectedSet.has(el.id));
        excalidrawAPI.updateScene({ elements: kept });
      }

      const prevZones = zonesHistoryRef.current;
      const nextZoneNum = zoneCounterRef.current + 1;
      zoneCounterRef.current = nextZoneNum;
      const zoneId = `zone_${nextZoneNum}`;

      const selectionBannerText =
        selCtx && selCtx.selectedElements.length > 0
          ? selCtx.extractedNumbers && selCtx.extractedNumbers.length > 0
            ? `Values [${selCtx.extractedNumbers.join(", ")}] (${
                mode === "takeover" ? "Taken Over" : "Branched"
              })`
            : `${selCtx.selectedElements.length} selected shapes`
          : undefined;

      const { zoneWidth, zoneHeight } = measureLessonZoneDimensions(
        rawLesson,
        Boolean(selectionBannerText)
      );

      const { originX, originY, connectedFromBounds } =
        computeNextFreeZoneOrigin(
          zoneWidth,
          zoneHeight,
          prevZones,
          selCtx,
          mode
        );

      const wrapped = wrapLessonInBoundedZone(rawLesson, {
        zoneId,
        zoneIndex: prevZones.length,
        originX,
        originY,
        connectedFromBounds,
        selectionBannerText,
      });

      const updated = [...prevZones, wrapped];
      zonesHistoryRef.current = updated;
      setZonesHistory(updated);
      setActiveZoneIdx(updated.length - 1);
      setStepIndex(0);
      setIsPlayingSteps(true);

      // Immediately inject the newly spawned bounded zone and smoothly pan camera to it
      if (wrapped.frames[0]) {
        injectZoneFrameIntoExcalidraw(
          wrapped.zoneId,
          wrapped.frames[0].elements,
          true
        );
      }
    },
    [
      computeNextFreeZoneOrigin,
      excalidrawAPI,
      injectZoneFrameIntoExcalidraw,
      selectionMode,
    ]
  );

  // Sync external lesson override when provided by parent (/ai-learning curriculum or custom dataset)
  const lastOverrideRef = useRef<AiWhiteboardLesson | null>(null);
  useEffect(() => {
    if (activeLessonOverride && activeLessonOverride !== lastOverrideRef.current) {
      lastOverrideRef.current = activeLessonOverride;
      spawnBoundedSimulationZone(activeLessonOverride);
    }
  }, [activeLessonOverride, spawnBoundedSimulationZone]);

  // Notify parent when lesson or step changes
  useEffect(() => {
    onLessonStateChange?.(activeLesson, stepIndex);
  }, [activeLesson, stepIndex, onLessonStateChange]);

  // Dynamically load @excalidraw/excalidraw on the client
  useEffect(() => {
    let mounted = true;
    import("@excalidraw/excalidraw")
      .then((mod) => {
        if (mounted) {
          setExcalidrawModule(mod);
        }
      })
      .catch((err) => {
        console.error("Failed to load Excalidraw module:", err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // File URL helper (ported from Agentic-Hub-office)
  const fileUrl = useCallback(
    (id?: string) =>
      `/api/whiteboard/file?floor=${encodeURIComponent(roomId)}${
        id ? `&id=${encodeURIComponent(id)}` : ""
      }`,
    [roomId]
  );

  // Upload binary image file to server (ported from Agentic-Hub-office)
  const uploadFile = useCallback(
    (f: any): Promise<boolean> => {
      let p = uploadsRef.current.get(f.id);
      if (p) return p;
      p = fetch(fileUrl(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: f.id,
          mimeType: f.mimeType,
          dataURL: f.dataURL,
          created: f.created,
        }),
      })
        .then(async (res) => {
          if (res.ok) {
            storedFilesRef.current.add(f.id);
            filesMapRef.current.set(f.id, f);
            return true;
          }
          const { error } = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          toast.warning(error ?? "Couldn't put that picture on the whiteboard");
          return false;
        })
        .catch(() => {
          uploadsRef.current.delete(f.id);
          return false;
        });
      uploadsRef.current.set(f.id, p);
      return p;
    },
    [fileUrl]
  );

  // Load missing binary image files from server (ported from Agentic-Hub-office)
  const loadFiles = useCallback(
    async (els: readonly any[]): Promise<any[]> => {
      const now = Date.now();
      const want = new Set<string>();
      for (const el of els) {
        const id = el.type === "image" && !el.isDeleted ? el.fileId : null;
        if (
          id &&
          !filesMapRef.current.has(id) &&
          now - (missingFilesRef.current.get(id) ?? 0) > 10_000
        ) {
          want.add(id);
        }
      }
      const got: any[] = [];
      await Promise.all(
        [...want].map(async (id) => {
          try {
            const res = await fetch(fileUrl(id));
            if (!res.ok) throw new Error(String(res.status));
            const f = await res.json();
            filesMapRef.current.set(id, f);
            storedFilesRef.current.add(id);
            missingFilesRef.current.delete(id);
            got.push(f);
          } catch {
            missingFilesRef.current.set(id, Date.now());
          }
        })
      );
      return got;
    },
    [fileUrl]
  );

  // Whenever stepIndex or activeLesson changes, update ONLY that zone's elements in Excalidraw
  useEffect(() => {
    if (!excalidrawAPI || !excalidrawModule || !currentFrame) return;
    waypointIndexRef.current = 0;
    lastWaypointSwitchRef.current = Date.now();
    injectZoneFrameIntoExcalidraw(
      activeLesson.zoneId,
      currentFrame.elements,
      stepIndex === 0
    );
    setAiStatusText(
      `[Zone #${activeZoneIdx + 1}] Step ${stepIndex + 1}/${
        activeLesson.frames.length
      }: ${currentFrame.title} — ${currentFrame.narration}`
    );
    if (autoVoiceNarrate && currentFrame.narration) {
      speakText(currentFrame.narration);
    }
  }, [
    stepIndex,
    activeLesson,
    activeZoneIdx,
    currentFrame,
    excalidrawAPI,
    excalidrawModule,
    injectZoneFrameIntoExcalidraw,
    autoVoiceNarrate,
    speakText,
  ]);

  /**
   * CONTINUOUS 60FPS LIVE-MOVING AI CO-TEACHER CURSOR & LASER TRAIL ENGINE
   * Smoothly interpolates the AI cursor along the frame's waypoints and adds
   * organic teaching pointer motion so the cursor is never static!
   */
  useEffect(() => {
    if (!excalidrawAPI || !currentFrame) return;

    let animFrameId = 0;
    let lastCollaboratorUpdate = 0;
    const aiColor = "#ef476f";
    const collaboratorId = tintedId("ai-co-teacher", aiColor);

    const animateCursor = (now: number) => {
      animFrameId = window.requestAnimationFrame(animateCursor);

      // Throttle Excalidraw collaborator updates to ~30fps (every 33ms) for buttery-smooth motion
      if (now - lastCollaboratorUpdate < 33) return;
      lastCollaboratorUpdate = now;

      const waypoints =
        currentFrame.aiLaserWaypoints && currentFrame.aiLaserWaypoints.length > 0
          ? currentFrame.aiLaserWaypoints
          : [currentFrame.aiLaserTarget];

      // Cycle to the next waypoint inside the current step every 850ms
      if (waypoints.length > 1 && now - lastWaypointSwitchRef.current > 850) {
        waypointIndexRef.current =
          (waypointIndexRef.current + 1) % waypoints.length;
        lastWaypointSwitchRef.current = now;
      }

      const activeTarget =
        waypoints[waypointIndexRef.current] ??
        currentFrame.aiLaserTarget ?? { x: 320, y: 220 };

      // Add a smooth organic figure-8 gesturing motion around the active target
      const gestureRadiusX = isPlayingSteps || isAiTeaching ? 18 : 10;
      const gestureRadiusY = isPlayingSteps || isAiTeaching ? 10 : 6;
      const angle = now * 0.0042;
      const desiredX = activeTarget.x + Math.cos(angle) * gestureRadiusX;
      const desiredY =
        activeTarget.y + Math.sin(angle * 2) * gestureRadiusY;

      // Smooth exponential lerp so the cursor glides across the canvas instead of jumping
      const prev = cursorPosRef.current;
      const lerpFactor = 0.16;
      const nextX = prev.x + (desiredX - prev.x) * lerpFactor;
      const nextY = prev.y + (desiredY - prev.y) * lerpFactor;
      cursorPosRef.current = { x: nextX, y: nextY };

      const distToTarget = Math.hypot(desiredX - nextX, desiredY - nextY);
      const isDrawingLaserTrail =
        isPlayingSteps || isAiTeaching || distToTarget > 6;

      const pointer: WbPointer = {
        x: Math.round(nextX * 10) / 10,
        y: Math.round(nextY * 10) / 10,
        tool: "laser",
        button: isDrawingLaserTrail ? "down" : "up",
      };

      const collaborators = new Map<string, any>();
      collaborators.set("ai-co-teacher", {
        id: collaboratorId,
        socketId: "ai-co-teacher",
        username: `🤖 AI Co-Teacher (Zone #${activeZoneIdx + 1})`,
        color: { background: aiColor, stroke: aiColor },
        pointer,
        button: pointer.button,
      });

      try {
        excalidrawAPI.updateScene({ collaborators });
      } catch {
        // ignore if unmounting
      }
    };

    animFrameId = window.requestAnimationFrame(animateCursor);
    return () => {
      window.cancelAnimationFrame(animFrameId);
    };
  }, [
    excalidrawAPI,
    currentFrame,
    activeZoneIdx,
    isPlayingSteps,
    isAiTeaching,
  ]);

  // Auto-play VCR timer for multi-step AI simulation
  useEffect(() => {
    if (!isPlayingSteps) return;
    const intervalMs = Math.max(900, Math.round(2800 / playbackSpeed));
    const timer = window.setInterval(() => {
      setStepIndex((prev) => {
        if (prev < activeLesson.frames.length - 1) {
          return prev + 1;
        } else {
          setIsPlayingSteps(false);
          return prev;
        }
      });
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [isPlayingSteps, activeLesson.frames.length, playbackSpeed]);

  // Flush local user drawings to server (ported from Agentic-Hub-office flush())
  const flushChanges = useCallback(() => {
    window.clearTimeout(sendTimerRef.current);
    sendTimerRef.current = 0;
    const out: WbElement[] = [];

    for (const [id, el] of pendingRef.current) {
      if (
        el.type === "image" &&
        el.fileId &&
        !el.isDeleted &&
        !storedFilesRef.current.has(el.fileId)
      ) {
        const f = excalidrawAPI?.getFiles()?.[el.fileId];
        if (f) {
          void uploadFile(f).then((ok) => {
            if (ok && pendingRef.current.size && !sendTimerRef.current) {
              sendTimerRef.current = window.setTimeout(flushChanges, SEND_MS);
            }
          });
        }
        continue;
      }
      pendingRef.current.delete(id);
      const wbEl = { ...(el as WbElement) };
      knownElementsRef.current.set(id, wbEl);
      out.push(wbEl);
    }

    if (!out.length) return;

    let batch: WbElement[] = [];
    let size = 0;

    const sendBatch = (items: WbElement[]) => {
      fetch("/api/whiteboard/scene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, elements: items }),
      }).catch(() => {});
    };

    for (const el of out) {
      const n = JSON.stringify(el).length;
      if (n > WB_MAX_ELEMENT_BYTES) {
        if (!tooBigRef.current.has(el.id)) {
          toast.warning(
            "That drawing is too big for the whiteboard. Try it in smaller pieces."
          );
        }
        tooBigRef.current.add(el.id);
        continue;
      }
      if (batch.length && size + n > BATCH_BYTES) {
        sendBatch(batch);
        batch = [];
        size = 0;
      }
      batch.push(el);
      size += n;
    }
    if (batch.length) sendBatch(batch);
  }, [excalidrawAPI, roomId, uploadFile]);

  // Track changes & user drag-selection from Excalidraw onChange
  const handleExcalidrawChange = useCallback(
    (els: readonly any[], appState?: any) => {
      // 1. Inspect user's drag-selected area on the whiteboard!
      const selectedMap = appState?.selectedElementIds as
        | Record<string, boolean>
        | undefined;
      if (selectedMap) {
        const activeSelectedKeys = Object.keys(selectedMap)
          .filter((k) => selectedMap[k])
          .sort()
          .join(",");
        if (activeSelectedKeys !== lastSelectionHashRef.current) {
          lastSelectionHashRef.current = activeSelectedKeys;
          const ctx = extractWhiteboardSelectionContext(els, selectedMap);
          setSelectionContext(ctx);
        }
      }

      if (readOnly) return;
      let changedCount = 0;
      for (const el of els) {
        const had = knownElementsRef.current.get(el.id);
        if (newer(el, had)) {
          pendingRef.current.set(el.id, el);
          changedCount++;
        }
      }
      if (changedCount > 0 && !sendTimerRef.current) {
        sendTimerRef.current = window.setTimeout(flushChanges, SEND_MS);
      }
    },
    [flushChanges, readOnly]
  );

  // Ask AI to Draw, Simulate, and Teach ANY User Query (aware of drag-selected whiteboard area!)
  const handleRunAiWhiteboardQuery = useCallback(
    async (customQuery?: string, forcedMode?: "branch" | "takeover") => {
      const q = (customQuery ?? aiQueryInput).trim();
      const effectiveMode = forcedMode ?? selectionMode;
      const activeSel =
        selectionContext.selectedElements.length > 0
          ? { ...selectionContext, mode: effectiveMode }
          : null;

      if (!q && !activeSel) {
        toast.info(
          "Type a question or drag-select an area on the whiteboard for the AI to simulate!"
        );
        return;
      }

      const finalQuery =
        q ||
        (activeSel?.extractedNumbers && activeSel.extractedNumbers.length >= 2
          ? `Take over and simulate dry run on selected values [${activeSel.extractedNumbers.join(
              ", "
            )}]`
          : "Explain and simulate the selected diagram step by step");

      setIsGeneratingAiLesson(true);
      setIsPlayingSteps(false);
      setAiStatusText(
        activeSel
          ? `🤖 AI Co-Teacher is analyzing your ${activeSel.selectedElements.length} selected whiteboard elements for "${finalQuery}"...`
          : `🤖 AI Co-Teacher is designing a new bounded simulation zone for "${finalQuery}"...`
      );

      try {
        const res = await fetch("/api/whiteboard/ai-teach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: finalQuery,
            roomId,
            problemTitle,
            code: currentCode,
            selectionContext: activeSel,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (
            data?.lesson &&
            Array.isArray(data.lesson.frames) &&
            data.lesson.frames.length > 0
          ) {
            spawnBoundedSimulationZone(data.lesson, {
              selCtx: activeSel,
              mode: effectiveMode,
            });
            if (!customQuery) setAiQueryInput("");
            const firstNarration = data.lesson.frames[0]?.narration;
            if (firstNarration && (onAiSpeak || autoVoiceNarrate)) {
              speakText(`${data.lesson.topic}. ${firstNarration}`);
            }
            toast.success(
              activeSel
                ? `AI created Zone #${zonesHistory.length + 1} from your selected area: ${data.lesson.topic}`
                : `AI created Zone #${zonesHistory.length + 1}: ${data.lesson.topic}`
            );
            return;
          }
        }
      } catch {
        // Fallback to local generator below
      } finally {
        setIsGeneratingAiLesson(false);
      }

      // Deterministic instant fallback (selection-aware!)
      const fallback = generateAiExcalidrawLessonForQuery(
        finalQuery,
        activeSel
      );
      spawnBoundedSimulationZone(fallback, {
        selCtx: activeSel,
        mode: effectiveMode,
      });
      if (!customQuery) setAiQueryInput("");
      if (fallback.frames[0]?.narration && (onAiSpeak || autoVoiceNarrate)) {
        speakText(`${fallback.topic}. ${fallback.frames[0].narration}`);
      }
      toast.success(
        `AI created Zone #${zonesHistory.length + 1}: ${fallback.topic}`
      );
    },
    [
      aiQueryInput,
      selectionMode,
      selectionContext,
      roomId,
      problemTitle,
      currentCode,
      spawnBoundedSimulationZone,
      onAiSpeak,
      autoVoiceNarrate,
      speakText,
      zonesHistory.length,
    ]
  );

  // Voice query via Web Speech API SpeechRecognition
  const toggleVoiceQuery = useCallback(() => {
    if (typeof window === "undefined") return;
    const SpeechRec =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      toast.warning(
        "Voice recognition is not supported in this browser. Try Chrome or Edge."
      );
      return;
    }

    if (isListeningVoiceQuery && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListeningVoiceQuery(false);
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onstart = () => {
        setIsListeningVoiceQuery(true);
        toast.info(
          "🎙️ Listening... Ask the AI Co-Teacher what to draw & simulate!"
        );
      };
      rec.onresult = (event: any) => {
        const transcript = event?.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setAiQueryInput(transcript);
          void handleRunAiWhiteboardQuery(transcript);
        }
      };
      rec.onerror = () => {
        setIsListeningVoiceQuery(false);
      };
      rec.onend = () => {
        setIsListeningVoiceQuery(false);
      };
      recognitionRef.current = rec;
      rec.start();
    } catch {
      setIsListeningVoiceQuery(false);
    }
  }, [isListeningVoiceQuery, handleRunAiWhiteboardQuery]);

  // Listen to external AI diagram triggers from Live Interview voice / chat
  const lastExternalIdRef = useRef<string | null>(null);
  useEffect(() => {
    const latest = [...externalElements]
      .reverse()
      .find((el) => el.type === "ai_diagram");
    if (latest && latest.id !== lastExternalIdRef.current) {
      lastExternalIdRef.current = latest.id;
      const diagType = latest.aiDiagramType;
      const customPrompt =
        latest.aiDiagramPayload?.stepDescription ||
        latest.aiDiagramPayload?.title;

      if (diagType === "binary_search") {
        spawnBoundedSimulationZone(buildExcalidrawBinarySearchLesson());
      } else if (diagType === "linked_list") {
        spawnBoundedSimulationZone(buildExcalidrawLinkedListLesson());
      } else if (diagType === "tree") {
        spawnBoundedSimulationZone(buildExcalidrawTreeLesson());
      } else if (
        diagType === "array_pointers" ||
        diagType === "two_pointers"
      ) {
        spawnBoundedSimulationZone(buildExcalidrawTwoPointersLesson());
      } else if (customPrompt) {
        void handleRunAiWhiteboardQuery(customPrompt);
      }
    }
  }, [
    externalElements,
    handleRunAiWhiteboardQuery,
    spawnBoundedSimulationZone,
  ]);

  // Preset Switcher supporting all 8 interactive lessons (each spawned in its own bounded zone!)
  const handleSelectPreset = (preset: WhiteboardPresetId) => {
    const selNums =
      selectionContext.extractedNumbers &&
      selectionContext.extractedNumbers.length >= 3
        ? selectionContext.extractedNumbers
        : undefined;

    const lesson =
      preset === "two_pointers"
        ? buildExcalidrawTwoPointersLesson(selNums)
        : preset === "brute_force"
        ? buildExcalidrawBruteForceDryRunLesson(selNums)
        : preset === "sliding_window"
        ? buildExcalidrawSlidingWindowLesson(selNums)
        : preset === "binary_search"
        ? buildExcalidrawBinarySearchLesson(selNums)
        : preset === "monotonic_stack"
        ? buildExcalidrawMonotonicStackLesson(selNums)
        : preset === "dp_table"
        ? buildExcalidrawDpTableLesson()
        : preset === "linked_list"
        ? buildExcalidrawLinkedListLesson()
        : buildExcalidrawTreeLesson();

    spawnBoundedSimulationZone(lesson, {
      selCtx:
        selectionContext.selectedElements.length > 0 ? selectionContext : null,
    });
    onElementCreated?.({
      id: `wb-preset-${Date.now()}`,
      type: "ai_diagram",
      aiDiagramType:
        preset === "two_pointers" ||
        preset === "binary_search" ||
        preset === "linked_list" ||
        preset === "tree"
          ? preset
          : "array_pointers",
      timestamp: Date.now(),
      authorId: "ai_interviewer",
    });
    toast.info(
      `Spawned "${lesson.topic}" in non-overlapping Zone #${
        zonesHistory.length + 1
      }`
    );
  };

  // Run custom array + target simulation in a new bounded zone
  const handleRunCustomDataset = (
    mode: "two_pointers" | "brute_force" | "binary_search" | "sliding_window"
  ) => {
    const nums = customArrayInput
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n))
      .slice(0, 10);
    const target = Number(customTargetInput.trim()) || 18;
    if (nums.length < 2) {
      toast.warning("Enter at least 2 comma-separated numbers.");
      return;
    }
    const sorted = [...nums].sort((a, b) => a - b);
    const lesson =
      mode === "two_pointers"
        ? buildExcalidrawTwoPointersLesson(sorted, target)
        : mode === "brute_force"
        ? buildExcalidrawBruteForceDryRunLesson(nums, target)
        : mode === "binary_search"
        ? buildExcalidrawBinarySearchLesson(sorted, target)
        : buildExcalidrawSlidingWindowLesson(nums, Math.min(3, nums.length));

    spawnBoundedSimulationZone(lesson);
    setShowCustomBuilder(false);
    toast.success(`Spawned ${lesson.topic} in Zone #${zonesHistory.length + 1}!`);
  };

  // Clear all simulation zones and reset to a fresh Zone #1
  const handleResetAllZones = () => {
    zoneCounterRef.current = 1;
    const fresh = wrapLessonInBoundedZone(
      buildExcalidrawTwoPointersLesson([1, 3, 5, 8, 12, 17, 21], 17),
      { zoneId: "zone_1", zoneIndex: 0, originX: 40, originY: 40 }
    );
    if (excalidrawAPI) {
      excalidrawAPI.updateScene({ elements: [] });
    }
    knownElementsRef.current.clear();
    zonesHistoryRef.current = [fresh];
    setZonesHistory([fresh]);
    setActiveZoneIdx(0);
    setStepIndex(0);
    setIsPlayingSteps(true);
    if (fresh.frames[0]) {
      injectZoneFrameIntoExcalidraw(fresh.zoneId, fresh.frames[0].elements, true);
    }
    onClearBoard?.();
    toast.info("Cleared whiteboard and reset to Zone #1");
  };

  // Export current scene JSON
  const handleExportSceneJson = () => {
    try {
      const elements = excalidrawAPI
        ? excalidrawAPI.getSceneElements()
        : currentFrame?.elements || [];
      const payload = {
        type: "excalidraw",
        version: 2,
        source: "https://dsa.viz.co/ai-learning",
        lessonTopic: activeLesson.topic,
        lessonBadge: activeLesson.badge,
        elements,
        appState: {
          viewBackgroundColor: "#ffffff",
        },
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeLesson.id || "ai-whiteboard"}-scene.excalidraw`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exported .excalidraw whiteboard file!");
    } catch {
      toast.error("Could not export whiteboard scene.");
    }
  };

  const ExcalidrawComp = excalidrawModule?.Excalidraw;
  const MainMenuComp = excalidrawModule?.MainMenu;
  const WelcomeScreenComp = excalidrawModule?.WelcomeScreen;
  const hasActiveSelection = selectionContext.selectedElements.length > 0;

  return (
    <div
      className={`wb-window flex flex-col overflow-hidden transition-all ${
        isFullScreen
          ? "fixed inset-2 z-50 h-[calc(100vh-16px)]"
          : fullScreenStage
          ? "h-full w-full flex-1 min-h-[620px]"
          : "h-[620px] w-full"
      }`}
      style={{
        background: "#fffaf3",
        border: "3px solid #2b2d42",
        borderRadius: isFullScreen ? "18px" : fullScreenStage ? "16px" : "20px",
        boxShadow: "0 6px 0 #2b2d42",
      }}
      role="region"
      aria-label="Interactive AI Excalidraw Whiteboard"
    >
      {/* 1. Agentic-Hub-office Signature Header (.wb-window > header) */}
      <header
        className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 shrink-0"
        style={{
          borderBottom: "3px solid #2b2d42",
          background: "#f4ede2",
          color: "#2b2d42",
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="m-0 text-sm sm:text-base font-black tracking-tight shrink-0 flex items-center gap-1.5">
            <span>📝 AI Whiteboard</span>
          </h2>

          {/* .wb-people Collaborator Strip */}
          <div className="wb-people flex items-center gap-1.5 overflow-hidden text-xs font-extrabold">
            <span
              className="wb-live shrink-0 uppercase"
              style={{
                background: "#ef476f",
                color: "#fff",
                borderRadius: "6px",
                padding: "1px 6px",
                fontSize: "10px",
                letterSpacing: "0.06em",
              }}
            >
              LIVE 60FPS
            </span>

            <span
              className="wb-person inline-flex items-center gap-1.5"
              title="AI Co-Teacher cursor glides smoothly across active elements in real time"
              style={{
                background: "#ffffff",
                border: "2px solid #2b2d42",
                borderRadius: "999px",
                padding: "1px 9px 1px 5px",
                whiteSpace: "nowrap",
                color: "#2b2d42",
              }}
            >
              <span
                className="dot inline-block rounded-full animate-pulse"
                style={{
                  width: "10px",
                  height: "10px",
                  background:
                    isPlayingSteps || isAiTeaching || isGeneratingAiLesson
                      ? "#ef476f"
                      : "#06d6a0",
                }}
              />
              <span>🤖 AI Co-Teacher</span>
            </span>

            {/* Bounded Simulation Zone Switcher Pills */}
            <div className="hidden lg:flex items-center gap-1 ml-1">
              {zonesHistory.map((z, zIdx) => (
                <button
                  key={z.zoneId || zIdx}
                  type="button"
                  onClick={() => {
                    setActiveZoneIdx(zIdx);
                    setStepIndex(0);
                    setIsPlayingSteps(false);
                    if (z.frames[0]) {
                      injectZoneFrameIntoExcalidraw(
                        z.zoneId,
                        z.frames[0].elements,
                        true
                      );
                    }
                  }}
                  className="px-2 py-0.5 rounded-md font-mono text-[10px] font-black flex items-center gap-1 cursor-pointer transition"
                  style={{
                    background: zIdx === activeZoneIdx ? "#2b2d42" : "#ffffff",
                    color: zIdx === activeZoneIdx ? "#ffd166" : "#2b2d42",
                    border: "1.5px solid #2b2d42",
                  }}
                  title={`Jump to Bounded Simulation Zone #${zIdx + 1}: ${z.topic}`}
                >
                  <Layers className="w-2.5 h-2.5" />
                  <span>Zone #{zIdx + 1}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Quick Presets (each spawns in its own bounded zone!) + Controls */}
        <div className="flex flex-wrap items-center gap-1">
          {(
            [
              { id: "two_pointers", label: "Two Pointers" },
              { id: "brute_force", label: "Brute Force O(N²)" },
              { id: "sliding_window", label: "Sliding Window" },
              { id: "binary_search", label: "Binary Search" },
              { id: "monotonic_stack", label: "Mono Stack" },
              { id: "dp_table", label: "DP Table" },
              { id: "linked_list", label: "Linked List" },
              { id: "tree", label: "BST / Tree" },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectPreset(p.id)}
              className="px-2 py-0.5 text-[11px] font-extrabold rounded-full transition cursor-pointer hover:bg-amber-100"
              style={{
                background: "#ffffff",
                color: "#2b2d42",
                border: "2px solid #2b2d42",
              }}
              title={`Spawn ${p.label} in a new non-overlapping board zone`}
            >
              + {p.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setShowCustomBuilder((v) => !v)}
            className="px-2 py-0.5 text-[11px] font-extrabold rounded-full flex items-center gap-1 transition cursor-pointer"
            style={{
              background: showCustomBuilder ? "#ffd166" : "#ffffff",
              color: "#2b2d42",
              border: "2px solid #2b2d42",
            }}
            title="Custom Array & Target Input Builder"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span className="hidden sm:inline">Custom Data</span>
          </button>

          <button
            type="button"
            onClick={handleResetAllZones}
            className="p-1.5 rounded-lg font-black transition cursor-pointer"
            style={{
              background: "#ffffff",
              border: "2px solid #2b2d42",
              color: "#e11d48",
            }}
            title="Clear Board & Reset Zones"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleExportSceneJson}
            className="p-1.5 rounded-lg font-black transition cursor-pointer"
            style={{
              background: "#ffffff",
              border: "2px solid #2b2d42",
              color: "#2b2d42",
            }}
            title="Export .excalidraw Scene"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-1.5 rounded-lg font-black transition cursor-pointer"
            style={{
              background: "#ffffff",
              border: "2px solid #2b2d42",
              color: "#2b2d42",
            }}
            title={
              isFullScreen ? "Exit Fullscreen (Esc)" : "Fullscreen Whiteboard"
            }
          >
            {isFullScreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </header>

      {/* DRAG-SELECTION AWARENESS BAR (Appears automatically when the user drag-selects elements on the whiteboard!) */}
      {hasActiveSelection && (
        <div
          className="px-3.5 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 animate-in fade-in duration-150"
          style={{
            background: "#ffe4e6",
            borderBottom: "2px solid #2b2d42",
            color: "#2b2d42",
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="px-2 py-0.5 rounded-md font-extrabold text-[11px] flex items-center gap-1"
              style={{
                background: "#e11d48",
                color: "#ffffff",
                border: "1.5px solid #2b2d42",
              }}
            >
              <MousePointerClick className="w-3.5 h-3.5" />
              <span>
                Selected Area ({selectionContext.selectedElements.length} items)
              </span>
            </span>

            {selectionContext.extractedNumbers &&
              selectionContext.extractedNumbers.length > 0 && (
                <span className="font-mono text-[11px] font-bold bg-white px-2 py-0.5 rounded border border-[#2b2d42]">
                  Values: [
                  {selectionContext.extractedNumbers.slice(0, 8).join(", ")}]
                </span>
              )}

            {/* Mode Switcher: Branch Next to Selection vs Take Over Selection */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSelectionMode("branch")}
                className="px-2 py-0.5 rounded-md text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
                style={{
                  background:
                    selectionMode === "branch" ? "#2b2d42" : "#ffffff",
                  color: selectionMode === "branch" ? "#ffffff" : "#2b2d42",
                  border: "1.5px solid #2b2d42",
                }}
                title="Keep selected drawing intact and spawn a connected simulation zone right next to it"
              >
                <GitBranch className="w-3 h-3" />
                <span>Branch Next to Selection</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectionMode("takeover")}
                className="px-2 py-0.5 rounded-md text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
                style={{
                  background:
                    selectionMode === "takeover" ? "#2b2d42" : "#ffffff",
                  color: selectionMode === "takeover" ? "#ffffff" : "#2b2d42",
                  border: "1.5px solid #2b2d42",
                }}
                title="AI takes over the selected area in-place and converts it into a live step-by-step simulation"
              >
                <Zap className="w-3 h-3" />
                <span>AI Take Over Selection</span>
              </button>
            </div>
          </div>

          {/* 1-Click Actions on the User's Selected Area */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                void handleRunAiWhiteboardQuery(
                  "Show how the brute force O(N^2) dry run works on this selected area",
                  selectionMode
                )
              }
              className="px-2.5 py-0.5 rounded-lg font-extrabold text-[11px] bg-amber-300 hover:bg-amber-400 border-2 border-[#2b2d42] cursor-pointer"
            >
              🔍 Dry-Run Brute Force Here
            </button>
            <button
              type="button"
              onClick={() =>
                void handleRunAiWhiteboardQuery(
                  "Take over from this selected diagram and simulate the optimal O(N) Two Pointers approach",
                  selectionMode
                )
              }
              className="px-2.5 py-0.5 rounded-lg font-extrabold text-[11px] bg-emerald-300 hover:bg-emerald-400 border-2 border-[#2b2d42] cursor-pointer"
            >
              🚀 Optimize Selected Area
            </button>
          </div>
        </div>
      )}

      {/* Optional Custom Array / Target Input Strip */}
      {showCustomBuilder && (
        <div
          className="px-3.5 py-2 flex flex-wrap items-center gap-2 text-xs shrink-0"
          style={{
            background: "#fef3c7",
            borderBottom: "2px solid #2b2d42",
            color: "#2b2d42",
          }}
        >
          <span className="font-extrabold">Custom Array:</span>
          <input
            type="text"
            value={customArrayInput}
            onChange={(e) => setCustomArrayInput(e.target.value)}
            className="px-2.5 py-1 rounded-lg font-mono text-xs font-bold w-48"
            style={{
              background: "#ffffff",
              border: "2px solid #2b2d42",
              color: "#2b2d42",
            }}
            placeholder="2, 4, 7, 11, 15, 19"
          />
          <span className="font-extrabold">Target / K:</span>
          <input
            type="text"
            value={customTargetInput}
            onChange={(e) => setCustomTargetInput(e.target.value)}
            className="px-2 py-1 rounded-lg font-mono text-xs font-bold w-16"
            style={{
              background: "#ffffff",
              border: "2px solid #2b2d42",
              color: "#2b2d42",
            }}
            placeholder="18"
          />
          <button
            type="button"
            onClick={() => handleRunCustomDataset("brute_force")}
            className="px-2.5 py-1 rounded-lg font-extrabold cursor-pointer"
            style={{
              background: "#ffd166",
              border: "2px solid #2b2d42",
              color: "#2b2d42",
            }}
          >
            + Brute Force Dry Run
          </button>
          <button
            type="button"
            onClick={() => handleRunCustomDataset("two_pointers")}
            className="px-2.5 py-1 rounded-lg font-extrabold cursor-pointer"
            style={{
              background: "#06d6a0",
              border: "2px solid #2b2d42",
              color: "#2b2d42",
            }}
          >
            + Optimal Two Pointers
          </button>
          <button
            type="button"
            onClick={() => handleRunCustomDataset("binary_search")}
            className="px-2.5 py-1 rounded-lg font-extrabold cursor-pointer"
            style={{
              background: "#60a5fa",
              border: "2px solid #2b2d42",
              color: "#ffffff",
            }}
          >
            + Binary Search
          </button>
          <button
            type="button"
            onClick={() => handleRunCustomDataset("sliding_window")}
            className="px-2.5 py-1 rounded-lg font-extrabold cursor-pointer"
            style={{
              background: "#a78bfa",
              border: "2px solid #2b2d42",
              color: "#ffffff",
            }}
          >
            + Sliding Window
          </button>
        </div>
      )}

      {/* 2. AI Prompt & Voice Teaching Command Bar */}
      <div
        className="px-3.5 py-2 flex flex-wrap items-center gap-2 shrink-0 text-xs"
        style={{
          background: "#fffaf3",
          borderBottom: "2px solid #2b2d42",
          color: "#2b2d42",
        }}
      >
        <div className="flex items-center gap-1.5 font-extrabold text-xs shrink-0">
          <Sparkles className="w-4 h-4 text-rose-500" />
          <span>
            {hasActiveSelection
              ? `Ask AI About Selected (${selectionContext.selectedElements.length}):`
              : "Ask AI to Draw in New Zone:"}
          </span>
        </div>

        <input
          type="text"
          value={aiQueryInput}
          onChange={(e) => setAiQueryInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleRunAiWhiteboardQuery();
            }
          }}
          placeholder={
            hasActiveSelection
              ? 'Ask about your drag-selected region: e.g. "How would the brute force dry run look on this selection?" or "Take over from here"...'
              : 'e.g. "How would the dry run of the brute force approach look?" or "Simulate Two Pointers on [2, 4, 7, 11, 15] target 18"...'
          }
          className="flex-1 min-w-[200px] px-3 py-1 rounded-lg text-xs font-bold outline-none"
          style={{
            background: "#ffffff",
            border: "2px solid #2b2d42",
            color: "#2b2d42",
          }}
        />

        {/* Live Voice Mic Query Button */}
        <button
          type="button"
          onClick={toggleVoiceQuery}
          className="px-2.5 py-1 rounded-lg font-extrabold text-xs flex items-center gap-1 cursor-pointer transition"
          style={{
            background: isListeningVoiceQuery ? "#ef476f" : "#ffffff",
            color: isListeningVoiceQuery ? "#ffffff" : "#2b2d42",
            border: "2px solid #2b2d42",
          }}
          title="Speak your algorithm question aloud — AI will draw & simulate it in a dedicated zone"
        >
          {isListeningVoiceQuery ? (
            <>
              <MicOff className="w-3.5 h-3.5 animate-pulse" />
              <span>Listening...</span>
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Voice Ask</span>
            </>
          )}
        </button>

        <button
          type="button"
          disabled={isGeneratingAiLesson}
          onClick={() => void handleRunAiWhiteboardQuery()}
          className="px-3 py-1 rounded-lg font-extrabold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition"
          style={{
            background: "#ef476f",
            color: "#ffffff",
            border: "2px solid #2b2d42",
            boxShadow: "0 2px 0 #2b2d42",
          }}
        >
          {isGeneratingAiLesson ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>AI Drawing Zone...</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>
                {hasActiveSelection
                  ? selectionMode === "takeover"
                    ? "Take Over Selection"
                    : "Branch From Selection"
                  : "Spawn AI Simulation"}
              </span>
            </>
          )}
        </button>
      </div>

      {/* 3. Excalidraw Host (.wb-host from Agentic-Hub-office) */}
      <div
        className="wb-host flex-1 min-h-0 relative"
        style={{ background: "#ffffff" }}
      >
        {!ExcalidrawComp ? (
          <div
            className="wb-loading grid place-items-center h-full p-4 text-center font-extrabold text-base"
            style={{ color: "#6c757d" }}
          >
            ✏️ Getting the markers out…
          </div>
        ) : (
          <ExcalidrawComp
            excalidrawAPI={(api: any) => {
              setExcalidrawAPI(api);
              const initial = excalidrawModule.restoreElements(
                [...knownElementsRef.current.values()].sort(byIndex),
                null
              );
              void loadFiles(initial).then(
                (got) => got.length && api?.addFiles(got)
              );
            }}
            initialData={{
              elements: currentFrame ? currentFrame.elements : [],
              appState: {
                viewBackgroundColor: "#ffffff",
              },
              scrollToContent: true,
            }}
            onChange={handleExcalidrawChange}
            isCollaborating={true}
            name={`${problemTitle || "DSA.viz"} Whiteboard`}
            theme="light"
            langCode="en"
            autoFocus={false}
            aiEnabled={false}
            viewModeEnabled={readOnly}
            UIOptions={{
              canvasActions: {
                loadScene: false,
                saveToActiveFile: false,
                changeViewBackgroundColor: true,
              },
            }}
          >
            {MainMenuComp && (
              <MainMenuComp>
                <MainMenuComp.DefaultItems.SaveAsImage />
                <MainMenuComp.DefaultItems.Export />
                <MainMenuComp.DefaultItems.SearchMenu />
                <MainMenuComp.DefaultItems.Help />
                <MainMenuComp.DefaultItems.ClearCanvas />
                <MainMenuComp.Separator />
                <MainMenuComp.DefaultItems.ToggleTheme />
              </MainMenuComp>
            )}
            {WelcomeScreenComp && (
              <WelcomeScreenComp>
                <WelcomeScreenComp.Hints.MenuHint />
                <WelcomeScreenComp.Hints.ToolbarHint />
                <WelcomeScreenComp.Hints.HelpHint />
                <WelcomeScreenComp.Center>
                  <WelcomeScreenComp.Center.Heading>
                    Each simulation gets its own bounded zone • Drag-select any
                    area for the AI Co-Teacher to inspect or take over
                  </WelcomeScreenComp.Center.Heading>
                </WelcomeScreenComp.Center>
              </WelcomeScreenComp>
            )}
          </ExcalidrawComp>
        )}
      </div>

      {/* 4. Interactive AI Step-by-Step Simulation & Narration Footer */}
      <div
        className="px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0"
        style={{
          background: "#f4ede2",
          borderTop: "3px solid #2b2d42",
          color: "#2b2d42",
        }}
      >
        {/* Left: Step Playback Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setStepIndex(0);
              setIsPlayingSteps(false);
            }}
            className="p-1.5 rounded-lg font-bold cursor-pointer"
            style={{
              background: "#ffffff",
              border: "2px solid #2b2d42",
              color: "#2b2d42",
            }}
            title="Restart Simulation in Current Zone"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setStepIndex((p) => Math.max(0, p - 1))}
            disabled={stepIndex === 0}
            className="px-2 py-1 rounded-lg font-extrabold flex items-center gap-1 cursor-pointer disabled:opacity-40"
            style={{
              background: "#ffffff",
              border: "2px solid #2b2d42",
              color: "#2b2d42",
            }}
          >
            <SkipBack className="w-3.5 h-3.5" />
            <span>Prev</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (stepIndex >= activeLesson.frames.length - 1) {
                setStepIndex(0);
              }
              setIsPlayingSteps(!isPlayingSteps);
            }}
            className="px-3 py-1 rounded-lg font-black flex items-center gap-1 cursor-pointer"
            style={{
              background: isPlayingSteps ? "#ffd166" : "#06d6a0",
              border: "2px solid #2b2d42",
              color: "#2b2d42",
              boxShadow: "0 2px 0 #2b2d42",
            }}
          >
            {isPlayingSteps ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Simulate</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() =>
              setStepIndex((p) =>
                Math.min(activeLesson.frames.length - 1, p + 1)
              )
            }
            disabled={stepIndex >= activeLesson.frames.length - 1}
            className="px-2 py-1 rounded-lg font-extrabold flex items-center gap-1 cursor-pointer disabled:opacity-40"
            style={{
              background: "#ffffff",
              border: "2px solid #2b2d42",
              color: "#2b2d42",
            }}
          >
            <span>Next</span>
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          {/* Direct Step Timeline Pills */}
          <div className="hidden md:flex items-center gap-1 px-1">
            {activeLesson.frames.map((frame, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setIsPlayingSteps(false);
                  setStepIndex(idx);
                }}
                className="w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center transition cursor-pointer"
                style={{
                  background: idx === stepIndex ? "#ef476f" : "#ffffff",
                  color: idx === stepIndex ? "#ffffff" : "#2b2d42",
                  border: "2px solid #2b2d42",
                }}
                title={`Step ${idx + 1}: ${frame.title}`}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          {/* Speed Selector */}
          <button
            type="button"
            onClick={() =>
              setPlaybackSpeed((s) =>
                s === 1 ? 1.5 : s === 1.5 ? 2 : s === 2 ? 0.75 : 1
              )
            }
            className="px-2 py-1 rounded-lg font-mono text-[11px] font-extrabold cursor-pointer"
            style={{
              background: "#ffffff",
              border: "2px solid #2b2d42",
              color: "#2b2d42",
            }}
            title="Simulation Playback Speed"
          >
            {playbackSpeed}x
          </button>

          <button
            type="button"
            onClick={() => {
              if (currentFrame) {
                injectZoneFrameIntoExcalidraw(
                  activeLesson.zoneId,
                  currentFrame.elements,
                  true
                );
              }
            }}
            className="p-1.5 rounded-lg font-bold cursor-pointer"
            style={{
              background: "#ffffff",
              border: "2px solid #2b2d42",
              color: "#2b2d42",
            }}
            title="Focus Camera on Current Bounded Simulation Zone"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              const nextState = !autoVoiceNarrate;
              setAutoVoiceNarrate(nextState);
              if (nextState && currentFrame?.narration) {
                speakText(currentFrame.narration);
              } else if (
                !nextState &&
                typeof window !== "undefined" &&
                "speechSynthesis" in window
              ) {
                window.speechSynthesis.cancel();
              }
            }}
            className="px-2 py-1 rounded-lg font-extrabold flex items-center gap-1 cursor-pointer"
            style={{
              background: autoVoiceNarrate ? "#06d6a0" : "#ffffff",
              border: "2px solid #2b2d42",
              color: "#2b2d42",
            }}
            title="Toggle AI Voice Narration for Every Step"
          >
            {autoVoiceNarrate ? (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Voice ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Voice OFF</span>
              </>
            )}
          </button>
        </div>

        {/* Center/Right: Live AI Narration & Step Counter */}
        <div className="flex-1 min-w-[200px] flex items-center justify-end gap-2">
          <span
            className="px-2.5 py-1 rounded-lg font-bold text-[11px] truncate max-w-2xl"
            style={{
              background: "#ffffff",
              border: "2px solid #2b2d42",
              color: "#2b2d42",
            }}
            title={aiTeachingMessage || aiStatusText}
          >
            {aiTeachingMessage || aiStatusText}
          </span>
        </div>
      </div>
    </div>
  );
}
