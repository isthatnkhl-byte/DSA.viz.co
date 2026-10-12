// Ported from Agentic-Hub-office (src/client/ui/whiteboard-app.ts & src/client/ui/whiteboard.ts)
// Integrates @excalidraw/excalidraw with full AI Co-Teacher access to draw, simulate,
// demonstrate, and teach any user query with live collaborator laser pointer & multi-step playback.

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
  generateAiExcalidrawLessonForQuery,
  type WbElement,
  type WbPointer,
  type AiWhiteboardLesson,
} from "@/shared/whiteboard";

export type WhiteboardPresetId =
  | "two_pointers"
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

export function AiWhiteboard({
  roomId = "default-room",
  isAiTeaching = false,
  aiTeachingMessage = null,
  externalElements = [],
  onElementCreated,
  onClearBoard: _onClearBoard,
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

  // AI Query & Multi-Step Simulation State
  const [aiQueryInput, setAiQueryInput] = useState("");
  const [isGeneratingAiLesson, setIsGeneratingAiLesson] = useState(false);
  const [activeLesson, setActiveLesson] = useState<AiWhiteboardLesson>(() =>
    buildExcalidrawTwoPointersLesson([1, 3, 5, 8, 12, 17, 21], 17)
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlayingSteps, setIsPlayingSteps] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [autoVoiceNarrate, setAutoVoiceNarrate] = useState<boolean>(false);
  const [isListeningVoiceQuery, setIsListeningVoiceQuery] = useState<boolean>(false);
  const [showCustomBuilder, setShowCustomBuilder] = useState<boolean>(false);
  const [customArrayInput, setCustomArrayInput] = useState<string>("2, 4, 7, 11, 15, 19");
  const [customTargetInput, setCustomTargetInput] = useState<string>("18");
  const [aiStatusText, setAiStatusText] = useState<string>(
    "AI Co-Teacher ready — ask any query, speak into the mic, or pick a preset to draw & simulate live"
  );

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

  // Sync external lesson override when provided by parent (/ai-learning curriculum or custom dataset)
  useEffect(() => {
    if (activeLessonOverride) {
      setActiveLesson(activeLessonOverride);
      setStepIndex(0);
      setIsPlayingSteps(true);
    }
  }, [activeLessonOverride]);

  // Notify parent when lesson or step changes
  useEffect(() => {
    onLessonStateChange?.(activeLesson, stepIndex);
  }, [activeLesson, stepIndex, onLessonStateChange]);

  // Dynamically load @excalidraw/excalidraw on the client (mirrors Agentic-Hub-office excalidraw() loader)
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

  // Inject & Reconcile Elements into Excalidraw Scene + Update AI Collaborator Laser Cursor
  const injectElementsIntoExcalidraw = useCallback(
    (
      rawElements: readonly WbElement[],
      aiLaser?: { x: number; y: number },
      autoFit = false
    ) => {
      if (!excalidrawAPI || !excalidrawModule) return;

      const { restoreElements, reconcileElements, CaptureUpdateAction } =
        excalidrawModule;

      for (const el of rawElements) {
        knownElementsRef.current.set(el.id, el);
      }

      const restored = restoreElements(rawElements as any[], null);
      const currentScene = excalidrawAPI.getSceneElementsIncludingDeleted();

      // Reconcile using Excalidraw's own version + versionNonce algorithm
      const merged = reconcileElements(
        currentScene,
        restored as any,
        excalidrawAPI.getAppState()
      );

      excalidrawAPI.updateScene({
        elements: merged,
        captureUpdate: CaptureUpdateAction.NEVER,
      });

      // Show AI Co-Teacher as a live collaborator with a glowing laser pointer on the board!
      const collaborators = new Map<string, any>();
      const aiColor = "#ef476f";
      const pointer: WbPointer | undefined = aiLaser
        ? {
            x: aiLaser.x,
            y: aiLaser.y,
            tool: "laser",
            button: "down",
          }
        : undefined;

      collaborators.set("ai-co-teacher", {
        id: tintedId("ai-co-teacher", aiColor),
        socketId: "ai-co-teacher",
        username: "🤖 AI Co-Teacher",
        color: { background: aiColor, stroke: aiColor },
        pointer,
        button: pointer?.button || "up",
      });

      excalidrawAPI.updateScene({ collaborators });

      if (autoFit && typeof excalidrawAPI.scrollToContent === "function") {
        setTimeout(() => {
          try {
            excalidrawAPI.scrollToContent(restored, {
              fitToViewport: false,
              animate: true,
            });
          } catch {
            // ignore scroll error if scene empty
          }
        }, 60);
      }
    },
    [excalidrawAPI, excalidrawModule]
  );

  // Load initial scene & inject first lesson frame once Excalidraw mounts
  useEffect(() => {
    if (!excalidrawAPI || !excalidrawModule) return;

    fetch(`/api/whiteboard/scene?roomId=${encodeURIComponent(roomId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (
          data?.elements &&
          Array.isArray(data.elements) &&
          data.elements.length > 0
        ) {
          injectElementsIntoExcalidraw(data.elements, undefined, true);
        } else if (currentFrame) {
          injectElementsIntoExcalidraw(
            currentFrame.elements,
            currentFrame.aiLaserTarget,
            true
          );
        }
      })
      .catch(() => {
        if (currentFrame) {
          injectElementsIntoExcalidraw(
            currentFrame.elements,
            currentFrame.aiLaserTarget,
            true
          );
        }
      });
  }, [excalidrawAPI, excalidrawModule, roomId]);

  // Whenever stepIndex or activeLesson changes, update the Excalidraw board & AI laser pointer!
  useEffect(() => {
    if (!excalidrawAPI || !excalidrawModule || !currentFrame) return;
    injectElementsIntoExcalidraw(
      currentFrame.elements,
      currentFrame.aiLaserTarget,
      stepIndex === 0
    );
    setAiStatusText(
      `Step ${stepIndex + 1}/${activeLesson.frames.length}: ${currentFrame.title} — ${currentFrame.narration}`
    );
    if (autoVoiceNarrate && currentFrame.narration) {
      speakText(currentFrame.narration);
    }
  }, [
    stepIndex,
    activeLesson,
    currentFrame,
    excalidrawAPI,
    excalidrawModule,
    injectElementsIntoExcalidraw,
    autoVoiceNarrate,
    speakText,
  ]);

  // Auto-play VCR timer for multi-step AI simulation
  useEffect(() => {
    if (!isPlayingSteps) return;
    const intervalMs = Math.max(900, Math.round(2600 / playbackSpeed));
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

  // Track changes from Excalidraw onChange (ported from Agentic-Hub-office noteChanges())
  const handleExcalidrawChange = useCallback(
    (els: readonly any[]) => {
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

  // Ask AI to Draw, Simulate, and Teach ANY User Query on the Excalidraw Whiteboard!
  const handleRunAiWhiteboardQuery = useCallback(
    async (customQuery?: string) => {
      const q = (customQuery ?? aiQueryInput).trim();
      if (!q) {
        toast.info(
          "Type a topic or question for the AI to draw and simulate on the board!"
        );
        return;
      }
      setIsGeneratingAiLesson(true);
      setIsPlayingSteps(false);
      setAiStatusText(
        `🤖 AI Co-Teacher is designing Excalidraw simulation for "${q}"...`
      );

      try {
        const res = await fetch("/api/whiteboard/ai-teach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: q,
            roomId,
            problemTitle,
            code: currentCode,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (
            data?.lesson &&
            Array.isArray(data.lesson.frames) &&
            data.lesson.frames.length > 0
          ) {
            setActiveLesson(data.lesson);
            setStepIndex(0);
            setIsPlayingSteps(true);
            if (!customQuery) setAiQueryInput("");
            const firstNarration = data.lesson.frames[0]?.narration;
            if (firstNarration && (onAiSpeak || autoVoiceNarrate)) {
              speakText(`${data.lesson.topic}. ${firstNarration}`);
            }
            toast.success(`AI drew & started simulating: ${data.lesson.topic}`);
            return;
          }
        }
      } catch {
        // Fallback to local generator below
      } finally {
        setIsGeneratingAiLesson(false);
      }

      // Deterministic instant fallback
      const fallback = generateAiExcalidrawLessonForQuery(q);
      setActiveLesson(fallback);
      setStepIndex(0);
      setIsPlayingSteps(true);
      if (!customQuery) setAiQueryInput("");
      if (fallback.frames[0]?.narration && (onAiSpeak || autoVoiceNarrate)) {
        speakText(`${fallback.topic}. ${fallback.frames[0].narration}`);
      }
      toast.success(`AI drew & started simulating: ${fallback.topic}`);
    },
    [
      aiQueryInput,
      roomId,
      problemTitle,
      currentCode,
      onAiSpeak,
      autoVoiceNarrate,
      speakText,
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
        toast.info("🎙️ Listening... Ask the AI Co-Teacher what to draw & simulate!");
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
        const lesson = buildExcalidrawBinarySearchLesson();
        setActiveLesson(lesson);
        setStepIndex(0);
        setIsPlayingSteps(true);
      } else if (diagType === "linked_list") {
        const lesson = buildExcalidrawLinkedListLesson();
        setActiveLesson(lesson);
        setStepIndex(0);
        setIsPlayingSteps(true);
      } else if (diagType === "tree") {
        const lesson = buildExcalidrawTreeLesson();
        setActiveLesson(lesson);
        setStepIndex(0);
        setIsPlayingSteps(true);
      } else if (
        diagType === "array_pointers" ||
        diagType === "two_pointers"
      ) {
        const lesson = buildExcalidrawTwoPointersLesson();
        setActiveLesson(lesson);
        setStepIndex(0);
        setIsPlayingSteps(true);
      } else if (customPrompt) {
        void handleRunAiWhiteboardQuery(customPrompt);
      }
    }
  }, [externalElements, handleRunAiWhiteboardQuery]);

  // Preset Switcher supporting all 7 interactive lessons
  const handleSelectPreset = (preset: WhiteboardPresetId) => {
    const lesson =
      preset === "two_pointers"
        ? buildExcalidrawTwoPointersLesson()
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

    setActiveLesson(lesson);
    setStepIndex(0);
    setIsPlayingSteps(true);
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
    toast.info(`Loaded ${lesson.topic} on Excalidraw whiteboard`);
  };

  // Run custom array + target simulation directly on the Excalidraw canvas
  const handleRunCustomDataset = (mode: "two_pointers" | "binary_search" | "sliding_window") => {
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
        : mode === "binary_search"
        ? buildExcalidrawBinarySearchLesson(sorted, target)
        : buildExcalidrawSlidingWindowLesson(nums, Math.min(3, nums.length));

    setActiveLesson(lesson);
    setStepIndex(0);
    setIsPlayingSteps(true);
    setShowCustomBuilder(false);
    toast.success(`Simulating ${lesson.topic} with your custom array!`);
  };

  // Export current lesson notes + Excalidraw JSON
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

  return (
    <div
      className={`wb-window flex flex-col overflow-hidden transition-all ${
        isFullScreen
          ? "fixed inset-2 z-50 h-[calc(100vh-16px)]"
          : fullScreenStage
          ? "h-full w-full flex-1 min-h-[620px]"
          : "h-[600px] w-full"
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

          {/* .wb-people Collaborator Strip (exact Agentic-Hub-office style) */}
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
              LIVE
            </span>

            <span
              className="wb-person inline-flex items-center gap-1.5"
              title="AI Co-Teacher is connected and can draw & simulate on the board"
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
                className="dot inline-block rounded-full"
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

            <span className="hidden 2xl:inline text-[11px] font-bold text-slate-700 truncate">
              • {activeLesson.topic} ({activeLesson.badge})
            </span>
          </div>
        </div>

        {/* Right: Quick Presets + Custom Data + Export + Fullscreen Button */}
        <div className="flex flex-wrap items-center gap-1">
          {(
            [
              { id: "two_pointers", label: "Two Pointers" },
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
              className="px-2 py-0.5 text-[11px] font-extrabold rounded-full transition cursor-pointer"
              style={{
                background: activeLesson.id === p.id ? "#2b2d42" : "#ffffff",
                color: activeLesson.id === p.id ? "#fffaf3" : "#2b2d42",
                border: "2px solid #2b2d42",
              }}
            >
              {p.label}
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
            onClick={() => handleRunCustomDataset("two_pointers")}
            className="px-2.5 py-1 rounded-lg font-extrabold cursor-pointer"
            style={{
              background: "#06d6a0",
              border: "2px solid #2b2d42",
              color: "#2b2d42",
            }}
          >
            Simulate Two Pointers
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
            Simulate Binary Search
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
            Simulate Sliding Window
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
          <span>Ask AI to Draw &amp; Simulate:</span>
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
          placeholder='Ask anything: e.g. "Simulate Two Pointers on [2, 4, 7, 11, 15] target 18", "Draw Monotonic Stack", "Explain Knapsack DP"...'
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
          title="Speak your algorithm question aloud — AI will draw & simulate it"
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
              <span>AI Drawing...</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>AI Draw &amp; Teach</span>
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
                    Draw together: everyone on this floor sees it live, and AI
                    can simulate any query on the board
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
            title="Restart Simulation"
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
                injectElementsIntoExcalidraw(
                  currentFrame.elements,
                  currentFrame.aiLaserTarget,
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
            title="Center & Fit Drawing on Screen"
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
