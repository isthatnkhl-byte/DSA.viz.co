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
  findDynamicCleanBoardPosition,
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
const ZONE_MIN_GAP = 88;

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
  const [activePresetId, setActivePresetId] =
    useState<WhiteboardPresetId | null>("two_pointers");

  // Bounded Simulation Zones Registry (each simulation has its own dynamically placed non-overlapping area!)
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

  // Tracks each zone's current step frame index so all zones remain deterministically rendered on the board
  const zoneStepMapRef = useRef<Map<string, number>>(
    new Map([["zone_1", 0]])
  );

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
    "AI Co-Teacher ready — click any preset or ask a query to dynamically place a new simulation in a clean board region"
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
  const speechTimerRef = useRef<number>(0);
  const audioWatchdogTimerRef = useRef<number>(0);
  const stepTokenRef = useRef<number>(0);
  const cursorPassDoneRef = useRef<boolean>(false);
  const audioDoneRef = useRef<boolean>(true);
  const [isCurrentlySpeaking, setIsCurrentlySpeaking] =
    useState<boolean>(false);

  // Smooth 60fps AI Cursor Path-Interpolation Refs (zero circular spinning!)
  const cursorPosRef = useRef<{ x: number; y: number }>({ x: 320, y: 220 });
  const stepStartCursorPosRef = useRef<{ x: number; y: number }>({
    x: 320,
    y: 220,
  });
  const stepStartTimeRef = useRef<number>(
    typeof performance !== "undefined" ? performance.now() : Date.now()
  );
  const waypointIndexRef = useRef<number>(0);
  const settledAtTargetRef = useRef<boolean>(false);

  const currentFrame =
    activeLesson.frames[stepIndex] || activeLesson.frames[0];

  // Immediately stops any active or pending browser voice narration so voices NEVER overlap
  const stopAllVoiceNarration = useCallback(() => {
    if (speechTimerRef.current) {
      window.clearTimeout(speechTimerRef.current);
      speechTimerRef.current = 0;
    }
    if (audioWatchdogTimerRef.current) {
      window.clearTimeout(audioWatchdogTimerRef.current);
      audioWatchdogTimerRef.current = 0;
    }
    setIsCurrentlySpeaking(false);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore speech synthesis cancellation errors
      }
    }
  }, []);

  /**
   * Speaks step narration on a single debounced channel and tracks exact completion
   * (`utter.onend` + 450ms natural pause) so the next step NEVER starts before the
   * current step's audio narration finishes!
   */
  const speakText = useCallback(
    (text: string, tokenForStep?: number) => {
      stopAllVoiceNarration();
      const activeToken = tokenForStep ?? stepTokenRef.current;
      audioDoneRef.current = false;

      speechTimerRef.current = window.setTimeout(() => {
        speechTimerRef.current = 0;
        if (activeToken !== stepTokenRef.current) return;

        const markSpeechCompleted = () => {
          if (activeToken !== stepTokenRef.current) return;
          if (audioWatchdogTimerRef.current) {
            window.clearTimeout(audioWatchdogTimerRef.current);
            audioWatchdogTimerRef.current = 0;
          }
          setIsCurrentlySpeaking(false);
          // Add a 450ms natural breathing pause after the sentence finishes before advancing
          audioWatchdogTimerRef.current = window.setTimeout(() => {
            audioWatchdogTimerRef.current = 0;
            if (activeToken === stepTokenRef.current) {
              audioDoneRef.current = true;
            }
          }, 450);
        };

        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          try {
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(text);
            utter.rate = Math.min(1.35, Math.max(0.85, 1.02 * playbackSpeed));
            utter.pitch = 1.0;
            utter.onstart = () => {
              if (activeToken === stepTokenRef.current) {
                setIsCurrentlySpeaking(true);
              }
            };
            utter.onend = markSpeechCompleted;
            utter.onerror = markSpeechCompleted;

            // Safety watchdog based on word count in case the browser speech engine stalls
            const wordCount = Math.max(1, text.trim().split(/\s+/).length);
            const safetyTimeoutMs =
              Math.max(6000, Math.round((wordCount * 460) / playbackSpeed)) +
              2500;
            audioWatchdogTimerRef.current = window.setTimeout(() => {
              if (
                typeof window !== "undefined" &&
                "speechSynthesis" in window &&
                window.speechSynthesis.speaking
              ) {
                // Still actively speaking — check again in 600ms instead of cutting off
                audioWatchdogTimerRef.current = window.setTimeout(
                  markSpeechCompleted,
                  2000
                );
                return;
              }
              markSpeechCompleted();
            }, safetyTimeoutMs);

            window.speechSynthesis.speak(utter);
            return;
          } catch {
            markSpeechCompleted();
          }
        } else {
          onAiSpeak?.(text);
          markSpeechCompleted();
        }
      }, 75);
    },
    [onAiSpeak, playbackSpeed, stopAllVoiceNarration]
  );

  // Clean up any active speech when unmounting
  useEffect(() => {
    return () => {
      stopAllVoiceNarration();
    };
  }, [stopAllVoiceNarration]);

  /**
   * Deterministically synchronizes ALL bounded simulation zones in `zonesHistoryRef.current`
   * plus any user-drawn freehand shapes into the Excalidraw scene.
   * Because every zone is reconstructed from `zonesHistoryRef.current` + `zoneStepMapRef.current`,
   * rapid multi-clicks on presets or AI prompts can NEVER drop or overwrite a zone!
   */
  const injectZoneFrameIntoExcalidraw = useCallback(
    (
      zoneId: string | undefined,
      frameElements: readonly WbElement[],
      autoScrollToZone = false
    ) => {
      if (!excalidrawAPI || !excalidrawModule) return;

      const { restoreElements, CaptureUpdateAction } = excalidrawModule;

      // 1. Preserve ONLY user-drawn freehand elements (elements that do NOT belong to any zoneId__ and are not legacy unzoned presets)
      const userFreehandElements = (
        excalidrawAPI.getSceneElements() as any[]
      ).filter((el) => {
        if (!el || el.isDeleted) return false;
        const idStr = typeof el.id === "string" ? el.id : "";
        if (idStr.includes("__")) {
          return false;
        }
        if (LEGACY_UNZONED_PREFIXES.some((p) => idStr.startsWith(p))) {
          return false;
        }
        return true;
      });

      // 2. Collect the active frame elements for EVERY zone in zonesHistoryRef.current
      const allZonesElementsRaw: WbElement[] = [];
      let targetZoneRawElements: readonly WbElement[] = frameElements;

      for (const z of zonesHistoryRef.current) {
        const zId = z.zoneId;
        if (zId && zId === zoneId) {
          allZonesElementsRaw.push(...frameElements);
          targetZoneRawElements = frameElements;
        } else {
          const zStep = (zId ? zoneStepMapRef.current.get(zId) : 0) ?? 0;
          const zFrame = z.frames[zStep] ?? z.frames[0];
          if (zFrame?.elements) {
            allZonesElementsRaw.push(...zFrame.elements);
          }
        }
      }

      const restoredZonesElements = restoreElements(
        allZonesElementsRaw as any[],
        null
      );
      for (const el of restoredZonesElements) {
        knownElementsRef.current.set(el.id, el);
      }

      const combinedScene = [
        ...userFreehandElements,
        ...restoredZonesElements,
      ];

      excalidrawAPI.updateScene({
        elements: combinedScene,
        captureUpdate: CaptureUpdateAction.NEVER,
      });

      if (
        autoScrollToZone &&
        typeof excalidrawAPI.scrollToContent === "function"
      ) {
        const prefix = zoneId ? `${zoneId}__` : "";
        const targetRestored = prefix
          ? restoredZonesElements.filter(
              (el: any) => typeof el.id === "string" && el.id.startsWith(prefix)
            )
          : restoreElements(targetZoneRawElements as any[], null);

        setTimeout(() => {
          try {
            excalidrawAPI.scrollToContent(
              targetRestored.length > 0 ? targetRestored : restoredZonesElements,
              {
                fitToViewport: false,
                animate: true,
              }
            );
          } catch {
            // ignore scroll error
          }
        }, 60);
      }
    },
    [excalidrawAPI, excalidrawModule]
  );

  /**
   * Zooms the Excalidraw viewport to fit ALL non-overlapping simulation zones at once.
   */
  const handleFitAllZones = useCallback(() => {
    if (!excalidrawAPI || typeof excalidrawAPI.scrollToContent !== "function")
      return;
    try {
      const allEls = (excalidrawAPI.getSceneElements() as any[]).filter(
        (el) => el && !el.isDeleted
      );
      if (allEls.length > 0) {
        excalidrawAPI.scrollToContent(allEls, {
          fitToViewport: true,
          viewportZoomFactor: 0.88,
          animate: true,
        });
      }
    } catch {
      // ignore scroll error
    }
  }, [excalidrawAPI]);

  /**
   * Computes a guaranteed non-overlapping canvas coordinate (originX, originY)
   * dynamically from the real bounding boxes of all existing zones AND any user-drawn
   * shapes on the Excalidraw canvas. Zero hardcoded positions!
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
          // Zone elements are already covered by z.zoneBounds above
          if (idStr.includes("__")) continue;
          if (takeoverIds && takeoverIds.has(idStr)) continue;
          if (LEGACY_UNZONED_PREFIXES.some((p) => idStr.startsWith(p))) {
            continue;
          }
          const ex = Number(el.x) || 0;
          const ey = Number(el.y) || 0;
          const ew = Math.max(20, Number(el.width) || 40);
          const eh = Math.max(20, Number(el.height) || 40);
          occupiedRects.push({ x: ex, y: ey, width: ew, height: eh });
        }
      }

      const lastZoneBounds =
        existingZones.length > 0
          ? existingZones[existingZones.length - 1]?.zoneBounds ?? null
          : null;

      return findDynamicCleanBoardPosition({
        newZoneWidth,
        newZoneHeight,
        occupiedRects,
        lastZoneBounds,
        selCtx,
        mode,
        gap: ZONE_MIN_GAP,
      });
    },
    [excalidrawAPI]
  );

  /**
   * Registers and activates a new bounded simulation zone in a dynamically chosen
   * clean region of the whiteboard without overwriting any previous simulation zones!
   */
  const spawnBoundedSimulationZone = useCallback(
    (
      rawLesson: AiWhiteboardLesson,
      opts?: {
        selCtx?: WhiteboardSelectionContext | null;
        mode?: "branch" | "takeover";
      }
    ) => {
      // Cancel any ongoing voice narration immediately so voices never overlap
      stopAllVoiceNarration();

      const selCtx = opts?.selCtx ?? null;
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

      zoneStepMapRef.current.set(zoneId, 0);
      const updated = [...prevZones, wrapped];
      zonesHistoryRef.current = updated;
      setZonesHistory(updated);
      setActiveZoneIdx(updated.length - 1);
      setStepIndex(0);
      setIsPlayingSteps(true);

      // Immediately synchronize all zones onto the Excalidraw canvas and smoothly pan camera to the new zone
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
      stopAllVoiceNarration,
    ]
  );

  // Sync external lesson override when provided by parent (/ai-learning curriculum or custom dataset)
  const lastOverrideRef = useRef<AiWhiteboardLesson | null>(null);
  useEffect(() => {
    if (activeLessonOverride && activeLessonOverride !== lastOverrideRef.current) {
      lastOverrideRef.current = activeLessonOverride;
      spawnBoundedSimulationZone(activeLessonOverride, { selCtx: null });
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

  // Whenever stepIndex or activeLesson changes, initialize the step's cursor path, voice token, and scene
  useEffect(() => {
    if (!excalidrawAPI || !excalidrawModule || !currentFrame) return;

    const nextToken = stepTokenRef.current + 1;
    stepTokenRef.current = nextToken;
    stepStartTimeRef.current =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    stepStartCursorPosRef.current = { ...cursorPosRef.current };
    cursorPassDoneRef.current = false;
    waypointIndexRef.current = 0;
    settledAtTargetRef.current = false;

    if (activeLesson.zoneId) {
      zoneStepMapRef.current.set(activeLesson.zoneId, stepIndex);
    }
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
      speakText(currentFrame.narration, nextToken);
    } else {
      audioDoneRef.current = true;
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
   * ON-DEMAND AI CO-TEACHER CURSOR ENGINE
   * Moves ONLY when it needs to travel to the current step's target element(s),
   * and then STOPS COMPLETELY (terminating requestAnimationFrame) until the next step requires movement.
   */
  useEffect(() => {
    if (!excalidrawAPI || !currentFrame) return;

    const aiColor = "#ef476f";
    const collaboratorId = tintedId("ai-co-teacher", aiColor);
    const finalTarget = currentFrame.aiLaserTarget ?? { x: 320, y: 220 };

    const updateCollaboratorCursor = (x: number, y: number) => {
      cursorPosRef.current = { x, y };
      const pointer: WbPointer = {
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        tool: "pointer",
        button: "up",
      };
      const collaborators = new Map<string, any>();
      collaborators.set("ai-co-teacher", {
        id: collaboratorId,
        socketId: "ai-co-teacher",
        color: { background: aiColor, stroke: aiColor },
        pointer,
        button: "up",
      });
      try {
        excalidrawAPI.updateScene({ collaborators });
      } catch {
        // ignore if unmounting
      }
    };

    // If the cursor has already settled at this step's target, keep it 100% stationary!
    if (settledAtTargetRef.current) {
      updateCollaboratorCursor(finalTarget.x, finalTarget.y);
      return;
    }

    // Build concise one-way path from the cursor's current position to the step's target
    const rawWaypoints =
      (isPlayingSteps || isAiTeaching) &&
      currentFrame.aiLaserWaypoints &&
      currentFrame.aiLaserWaypoints.length > 0
        ? currentFrame.aiLaserWaypoints.slice(-2)
        : [finalTarget];

    const fullCandidates = [
      { ...cursorPosRef.current },
      ...rawWaypoints,
      finalTarget,
    ];
    const cleanPath: Array<{ x: number; y: number }> = [];
    for (const pt of fullCandidates) {
      if (!pt) continue;
      const last = cleanPath[cleanPath.length - 1];
      if (!last || Math.hypot(pt.x - last.x, pt.y - last.y) > 4) {
        cleanPath.push({ x: pt.x, y: pt.y });
      }
    }

    let animFrameId = 0;
    let dwellTimerId = 0;
    let lastCollaboratorUpdate = 0;

    // If the cursor is already at the target (cleanPath.length < 2), do NOT move at all!
    if (cleanPath.length < 2) {
      settledAtTargetRef.current = true;
      updateCollaboratorCursor(finalTarget.x, finalTarget.y);
      const holdMs = autoVoiceNarrate
        ? 150
        : Math.max(700, Math.round(1300 / playbackSpeed));
      dwellTimerId = window.setTimeout(() => {
        cursorPassDoneRef.current = true;
      }, holdMs);
      return () => {
        window.clearTimeout(dwellTimerId);
      };
    }

    const moveStartTime =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const numSegments = cleanPath.length - 1;
    const segDurationMs = Math.max(420, Math.round(620 / playbackSpeed));
    const totalMoveMs = numSegments * segDurationMs;

    const animateCursor = (now: number) => {
      const elapsed = Math.max(0, now - moveStartTime);

      // Once the cursor reaches the destination, STOP COMPLETELY (no more requestAnimationFrame!)
      if (elapsed >= totalMoveMs) {
        settledAtTargetRef.current = true;
        updateCollaboratorCursor(finalTarget.x, finalTarget.y);

        // Hold stationary at the target before allowing step progression (if Voice is OFF)
        const holdMs = autoVoiceNarrate
          ? 150
          : Math.max(700, Math.round(1300 / playbackSpeed));
        dwellTimerId = window.setTimeout(() => {
          cursorPassDoneRef.current = true;
        }, holdMs);
        return;
      }

      animFrameId = window.requestAnimationFrame(animateCursor);

      // Throttle Excalidraw collaborator updates to ~30fps (every 33ms) while moving
      if (now - lastCollaboratorUpdate < 33) return;
      lastCollaboratorUpdate = now;

      const segIdx = Math.min(
        numSegments - 1,
        Math.floor(elapsed / segDurationMs)
      );
      const fromPt = cleanPath[segIdx]!;
      const toPt = cleanPath[segIdx + 1]!;
      const t = (elapsed % segDurationMs) / segDurationMs;
      const eased =
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const nextX = fromPt.x + (toPt.x - fromPt.x) * eased;
      const nextY = fromPt.y + (toPt.y - fromPt.y) * eased;

      updateCollaboratorCursor(nextX, nextY);
    };

    animFrameId = window.requestAnimationFrame(animateCursor);
    return () => {
      window.cancelAnimationFrame(animFrameId);
      window.clearTimeout(dwellTimerId);
    };
  }, [
    excalidrawAPI,
    currentFrame,
    activeZoneIdx,
    stepIndex,
    activeLesson.frames.length,
    isPlayingSteps,
    isAiTeaching,
    playbackSpeed,
    autoVoiceNarrate,
  ]);

  /**
   * AUDIO- & CURSOR-SYNCHRONIZED STEP PROGRESSION COORDINATOR
   * Advances to the next step ONLY after:
   * 1. The AI cursor has completed its full live traversal of all waypoints in the current step, AND
   * 2. The current step's voice narration (if active) has completely finished speaking!
   */
  useEffect(() => {
    if (!isPlayingSteps) return;
    const syncTimer = window.setInterval(() => {
      // 1. Wait until the AI cursor has finished traversing all waypoints for this step
      if (!cursorPassDoneRef.current) return;

      // 2. If Voice ON is enabled, wait until the step's SpeechSynthesisUtterance + pause has finished
      if (autoVoiceNarrate && !audioDoneRef.current) return;

      // 3. Never advance if a speech timer is pending or browser speechSynthesis is still speaking
      if (speechTimerRef.current !== 0) return;
      if (
        typeof window !== "undefined" &&
        "speechSynthesis" in window &&
        (window.speechSynthesis.speaking || window.speechSynthesis.pending)
      ) {
        return;
      }

      setStepIndex((prev) => {
        if (prev < activeLesson.frames.length - 1) {
          return prev + 1;
        } else {
          setIsPlayingSteps(false);
          return prev;
        }
      });
    }, 120);
    return () => window.clearInterval(syncTimer);
  }, [isPlayingSteps, autoVoiceNarrate, activeLesson.frames.length]);

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
      stopAllVoiceNarration();

      const q = (customQuery ?? aiQueryInput).trim();
      const effectiveMode = forcedMode ?? selectionMode;
      // Only attach selection context when the user explicitly clicked a selection action or has an active selection
      const activeSel =
        forcedMode && selectionContext.selectedElements.length > 0
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

      setActivePresetId(null);
      setIsGeneratingAiLesson(true);
      setIsPlayingSteps(false);
      setAiStatusText(
        activeSel
          ? `🤖 AI Co-Teacher is analyzing your ${activeSel.selectedElements.length} selected whiteboard elements for "${finalQuery}"...`
          : `🤖 AI Co-Teacher is finding a clean area on the board to draw "${finalQuery}"...`
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
            const nextNum = zonesHistoryRef.current.length + 1;
            spawnBoundedSimulationZone(data.lesson, {
              selCtx: activeSel,
              mode: effectiveMode,
            });
            if (!customQuery) setAiQueryInput("");
            toast.success(
              activeSel
                ? `AI created Zone #${nextNum} from your selected area: ${data.lesson.topic}`
                : `AI created non-overlapping Zone #${nextNum}: ${data.lesson.topic}`
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
      const nextNum = zonesHistoryRef.current.length + 1;
      const fallback = generateAiExcalidrawLessonForQuery(
        finalQuery,
        activeSel
      );
      spawnBoundedSimulationZone(fallback, {
        selCtx: activeSel,
        mode: effectiveMode,
      });
      if (!customQuery) setAiQueryInput("");
      toast.success(
        `AI created non-overlapping Zone #${nextNum}: ${fallback.topic}`
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
      stopAllVoiceNarration,
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
      stopAllVoiceNarration();
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
  }, [isListeningVoiceQuery, handleRunAiWhiteboardQuery, stopAllVoiceNarration]);

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
        spawnBoundedSimulationZone(buildExcalidrawBinarySearchLesson(), {
          selCtx: null,
        });
      } else if (diagType === "linked_list") {
        spawnBoundedSimulationZone(buildExcalidrawLinkedListLesson(), {
          selCtx: null,
        });
      } else if (diagType === "tree") {
        spawnBoundedSimulationZone(buildExcalidrawTreeLesson(), {
          selCtx: null,
        });
      } else if (
        diagType === "array_pointers" ||
        diagType === "two_pointers"
      ) {
        spawnBoundedSimulationZone(buildExcalidrawTwoPointersLesson(), {
          selCtx: null,
        });
      } else if (customPrompt) {
        void handleRunAiWhiteboardQuery(customPrompt);
      }
    }
  }, [
    externalElements,
    handleRunAiWhiteboardQuery,
    spawnBoundedSimulationZone,
  ]);

  // Preset Switcher supporting all 8 interactive lessons (each dynamically placed in its own clean non-overlapping zone!)
  const handleSelectPreset = (preset: WhiteboardPresetId) => {
    stopAllVoiceNarration();
    setActivePresetId(preset);

    // Clear any stale Excalidraw selection so preset clicks always use a fresh, clean area of the board
    lastSelectionHashRef.current = "";
    setSelectionContext({
      selectedElements: [],
      bounds: null,
      extractedNumbers: [],
      extractedTexts: [],
    });

    const lesson =
      preset === "two_pointers"
        ? buildExcalidrawTwoPointersLesson()
        : preset === "brute_force"
        ? buildExcalidrawBruteForceDryRunLesson()
        : preset === "sliding_window"
        ? buildExcalidrawSlidingWindowLesson()
        : preset === "binary_search"
        ? buildExcalidrawBinarySearchLesson()
        : preset === "monotonic_stack"
        ? buildExcalidrawMonotonicStackLesson()
        : preset === "dp_table"
        ? buildExcalidrawDpTableLesson()
        : preset === "linked_list"
        ? buildExcalidrawLinkedListLesson()
        : buildExcalidrawTreeLesson();

    const nextZoneNumber = zonesHistoryRef.current.length + 1;
    spawnBoundedSimulationZone(lesson, {
      selCtx: null,
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
      `Spawned "${lesson.topic}" in clean board Zone #${nextZoneNumber}`
    );
  };

  // Run custom array + target simulation in a new bounded zone
  const handleRunCustomDataset = (
    mode: "two_pointers" | "brute_force" | "binary_search" | "sliding_window"
  ) => {
    stopAllVoiceNarration();
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

    const nextZoneNumber = zonesHistoryRef.current.length + 1;
    spawnBoundedSimulationZone(lesson, { selCtx: null });
    setShowCustomBuilder(false);
    toast.success(`Spawned ${lesson.topic} in Zone #${nextZoneNumber}!`);
  };

  // Clear all simulation zones and reset to a fresh Zone #1
  const handleResetAllZones = () => {
    stopAllVoiceNarration();
    zoneCounterRef.current = 1;
    zoneStepMapRef.current = new Map([["zone_1", 0]]);
    setActivePresetId("two_pointers");
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
          borderBottom: "2px solid #2b2d42",
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
          </div>
        </div>

        {/* Right: Quick Presets (each dynamically placed in its own clean non-overlapping board zone!) + Controls */}
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
          ).map((p) => {
            const isActivePreset = activePresetId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPreset(p.id)}
                className="px-2.5 py-0.5 text-[11px] font-extrabold rounded-full transition cursor-pointer hover:bg-amber-100"
                style={{
                  background: isActivePreset ? "#2b2d42" : "#ffffff",
                  color: isActivePreset ? "#ffd166" : "#2b2d42",
                  border: "2px solid #2b2d42",
                  boxShadow: isActivePreset ? "0 2px 0 #ef476f" : "none",
                }}
                title={`Spawn ${p.label} in a clean non-overlapping area of the board`}
              >
                + {p.label}
              </button>
            );
          })}

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

      {/* ACTIVE BOARD ZONES BAR (Shows all dynamically placed non-overlapping zones + Fit All Zones button) */}
      <div
        className="px-3.5 py-1.5 flex items-center justify-between gap-2 text-xs shrink-0 overflow-x-auto"
        style={{
          background: "#ede4d3",
          borderBottom: "2px solid #2b2d42",
          color: "#2b2d42",
        }}
      >
        <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto">
          <span className="font-mono text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#2b2d42] text-[#fffaf3]">
            <Layers className="w-3 h-3 text-[#ffd166]" />
            <span>Board Zones ({zonesHistory.length})</span>
          </span>

          {zonesHistory.map((z, zIdx) => {
            const isCurrentZone = zIdx === activeZoneIdx;
            const savedStep =
              (z.zoneId ? zoneStepMapRef.current.get(z.zoneId) : 0) ?? 0;
            return (
              <button
                key={z.zoneId || zIdx}
                type="button"
                onClick={() => {
                  stopAllVoiceNarration();
                  setActiveZoneIdx(zIdx);
                  setStepIndex(savedStep);
                  setIsPlayingSteps(false);
                  const targetFrame = z.frames[savedStep] ?? z.frames[0];
                  if (targetFrame) {
                    injectZoneFrameIntoExcalidraw(
                      z.zoneId,
                      targetFrame.elements,
                      true
                    );
                  }
                }}
                className="px-2.5 py-0.5 rounded-lg font-mono text-[10px] font-black flex items-center gap-1.5 cursor-pointer transition shrink-0"
                style={{
                  background: isCurrentZone ? "#2b2d42" : "#ffffff",
                  color: isCurrentZone ? "#ffd166" : "#2b2d42",
                  border: "2px solid #2b2d42",
                  boxShadow: isCurrentZone ? "0 2px 0 #ef476f" : "none",
                }}
                title={`Focus camera on Zone #${zIdx + 1}: ${z.topic} (${
                  z.zoneBounds
                    ? `x:${z.zoneBounds.x}, y:${z.zoneBounds.y}`
                    : "dynamic"
                })`}
              >
                <span>#{zIdx + 1}</span>
                <span className="max-w-[140px] truncate font-sans font-extrabold">
                  {z.topic}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleFitAllZones}
          className="px-2.5 py-0.5 rounded-lg font-mono text-[10px] font-black flex items-center gap-1 cursor-pointer shrink-0 transition hover:bg-amber-200"
          style={{
            background: "#ffd166",
            color: "#2b2d42",
            border: "2px solid #2b2d42",
          }}
          title="Zoom out to view all non-overlapping teaching zones across the entire whiteboard"
        >
          <Maximize2 className="w-3 h-3" />
          <span>Fit All Zones ({zonesHistory.length})</span>
        </button>
      </div>

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
              stopAllVoiceNarration();
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
            onClick={() => {
              stopAllVoiceNarration();
              setStepIndex((p) => Math.max(0, p - 1));
            }}
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
              if (isPlayingSteps) {
                stopAllVoiceNarration();
              }
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
            onClick={() => {
              stopAllVoiceNarration();
              setStepIndex((p) =>
                Math.min(activeLesson.frames.length - 1, p + 1)
              );
            }}
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
                  stopAllVoiceNarration();
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
              } else {
                stopAllVoiceNarration();
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
          {isCurrentlySpeaking && (
            <span
              className="px-2 py-0.5 rounded-lg font-mono text-[10px] font-black flex items-center gap-1 shrink-0 animate-pulse"
              style={{
                background: "#ef476f",
                color: "#ffffff",
                border: "2px solid #2b2d42",
              }}
              title="Voice narration is speaking the current step — next step will wait until narration finishes"
            >
              <span>🎙️ Speaking Step {stepIndex + 1}</span>
            </span>
          )}
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
