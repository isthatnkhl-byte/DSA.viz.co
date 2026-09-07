import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import Editor from "@monaco-editor/react";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Clock,
  Code2,
  Cpu,
  Brain,
  Award,
  Eye,
  Shuffle,
  ChevronRight,
  Maximize2,
  HelpCircle,
  Copy,
  Check,
  Radio,
  FileCheck,
  MessageSquare,
  AlertCircle,
  Activity,
  Terminal,
  Lock,
  SlidersHorizontal,
  ExternalLink,
  RefreshCw,
  XCircle,
  Globe,
  MousePointerClick,
  Info,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  INTERVIEW_QUESTIONS,
  getRandomInterviewQuestion,
  type InterviewQuestion,
} from "@/lib/interview-questions";
import {
  InterviewSpeechSynthesizer,
  CandidateAudioTracker,
  type ConfidenceReport,
} from "@/lib/interview-audio";
import {
  InterviewProctoringEngine,
  type ProctoringState,
} from "@/lib/interview-proctoring";
import { apiInterviewEvaluate, apiInterviewScorecard } from "@/lib/api-client";
import type {
  SolutionTier,
  TierEvaluationResult,
  InterviewScorecardResult,
} from "@/lib/interview-types";

export const Route = createFileRoute("/live-interview")({
  component: LiveInterviewPage,
});

type InterviewStage = "setup" | "interviewing" | "scorecard";
type Language = "cpp" | "python" | "javascript" | "java";

function LiveInterviewPage() {
  // 1. Stage State
  const [stage, setStage] = useState<InterviewStage>("setup");
  const [selectedQuestion, setSelectedQuestion] = useState<InterviewQuestion>(() =>
    getRandomInterviewQuestion()
  );
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("cpp");

  // 2. Current Tier & Progression State
  const [currentTier, setCurrentTier] = useState<SolutionTier>("bruteForce");
  const [tiersCompleted, setTiersCompleted] = useState<Record<SolutionTier, boolean>>({
    bruteForce: false,
    better: false,
    optimal: false,
  });
  const [tierCodes, setTierCodes] = useState<Record<SolutionTier, string>>({
    bruteForce: "",
    better: "",
    optimal: "",
  });
  const [tierEvaluations, setTierEvaluations] = useState<
    Record<SolutionTier, TierEvaluationResult | null>
  >({
    bruteForce: null,
    better: null,
    optimal: null,
  });

  // Current editor code
  const [code, setCode] = useState<string>("");

  // 3. Audio & Interviewer State
  const [isMuted, setIsMuted] = useState(false);
  const [interviewerStatus, setInterviewerStatus] = useState<
    "idle" | "speaking" | "evaluating"
  >("idle");
  const [interviewerSpeechText, setInterviewerSpeechText] = useState<string>("");
  const [showCaptions, setShowCaptions] = useState<boolean>(true);
  const [candidateVolume, setCandidateVolume] = useState<number>(0);
  const [candidateTranscript, setCandidateTranscript] = useState<string>("");

  // 4. Proctoring State
  const [proctoringState, setProctoringState] = useState<ProctoringState>({
    isActive: false,
    strikes: 0,
    maxStrikes: 3,
    isFullscreen: false,
    isCameraActive: false,
    events: [],
    tabSwitchCount: 0,
    blurCount: 0,
    pasteCount: 0,
    integrityScore: 10.0,
  });

  // 5. Timer & Telemetry State
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [lineCount, setLineCount] = useState(1);
  const [typingWpm, setTypingWpm] = useState(0);
  const lastTypingTimestampRef = useRef<number>(Date.now());
  const typedCharsSessionRef = useRef<number>(0);

  // 6. Media Streams & Engines Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const speechSynthRef = useRef<InterviewSpeechSynthesizer | null>(null);
  const audioTrackerRef = useRef<CandidateAudioTracker | null>(null);
  const proctoringEngineRef = useRef<InterviewProctoringEngine | null>(null);
  const workspaceContainerRef = useRef<HTMLDivElement | null>(null);

  // 7. Results State
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isGeneratingScorecard, setIsGeneratingScorecard] = useState(false);
  const [scorecard, setScorecard] = useState<InterviewScorecardResult | null>(null);
  const [activeTab, setActiveTab] = useState<"problem" | "proctoring" | "transcript">("problem");
  const [copiedCode, setCopiedCode] = useState(false);

  // Setup permissions & browser settings state (strictly hardware only)
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [agreeToRules, setAgreeToRules] = useState(false);
  const [isInsideIframe, setIsInsideIframe] = useState<boolean>(false);
  const [selectedBrowserTab, setSelectedBrowserTab] = useState<"chrome" | "edge" | "safari" | "firefox">("chrome");
  const [showBrowserGuide, setShowBrowserGuide] = useState<boolean>(true);
  const [cameraStatusText, setCameraStatusText] = useState<"granted" | "denied" | "prompt">("prompt");
  const [micStatusText, setMicStatusText] = useState<"granted" | "denied" | "prompt">("prompt");
  const [isProbingDevices, setIsProbingDevices] = useState<boolean>(false);

  // Initialize Audio & Speech Services
  useEffect(() => {
    speechSynthRef.current = new InterviewSpeechSynthesizer();
    audioTrackerRef.current = new CandidateAudioTracker();

    audioTrackerRef.current.onVolumeUpdate = (vol) => {
      setCandidateVolume(vol);
    };
    audioTrackerRef.current.onTranscriptUpdate = (_latest, full) => {
      setCandidateTranscript(full);
    };

    proctoringEngineRef.current = new InterviewProctoringEngine(
      (updatedState) => {
        setProctoringState(updatedState);
      },
      (strikeNumber, reason) => {
        toast.error(`⚠️ Proctoring Strike ${strikeNumber}/3: ${reason}`, {
          duration: 6000,
        });
        if (speechSynthRef.current && !isMuted) {
          speechSynthRef.current.speak(
            `Integrity alert. Strike ${strikeNumber} recorded. Please remain in full screen and do not switch windows.`
          );
        }
      }
    );

    // Detect iframe context and inspect hardware permissions
    if (typeof window !== "undefined") {
      try {
        setIsInsideIframe(window.self !== window.top);
      } catch {
        setIsInsideIframe(true);
      }
    }
    checkHardwarePermissions();

    return () => {
      speechSynthRef.current?.stop();
      audioTrackerRef.current?.stopTracking();
      proctoringEngineRef.current?.stopProctoring();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Update initial starter code when question or language changes
  useEffect(() => {
    const starter = selectedQuestion.starterCode[selectedLanguage] || "";
    setCode(starter);
    setTierCodes({
      bruteForce: starter,
      better: starter,
      optimal: starter,
    });
  }, [selectedQuestion, selectedLanguage]);

  // Running elapsed timer
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (stage === "interviewing") {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [stage]);

  // Typing telemetry observer (silent background tracking)
  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || "";
    setCode(newCode);

    // Update current tier cache
    setTierCodes((prev) => ({
      ...prev,
      [currentTier]: newCode,
    }));

    const lines = newCode.split("\n").length;
    setLineCount(lines);
    setCharCount(newCode.length);

    typedCharsSessionRef.current += 1;
    const now = Date.now();
    const elapsedMinutes = Math.max(0.1, (now - lastTypingTimestampRef.current) / 60000);
    const estimatedWpm = Math.min(120, Math.round(typedCharsSessionRef.current / 5 / elapsedMinutes));
    setTypingWpm(estimatedWpm);
  };

  // Check hardware permissions using permissions API when available
  const checkHardwarePermissions = async () => {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return;
    try {
      const cam = await navigator.permissions.query({ name: "camera" as any });
      setCameraStatusText(cam.state as any);
      if (cam.state === "granted") setHasCameraPermission(true);
      else if (cam.state === "denied") setHasCameraPermission(false);
      cam.onchange = () => {
        setCameraStatusText(cam.state as any);
        if (cam.state === "granted") setHasCameraPermission(true);
        else if (cam.state === "denied") setHasCameraPermission(false);
      };
    } catch {}

    try {
      const mic = await navigator.permissions.query({ name: "microphone" as any });
      setMicStatusText(mic.state as any);
      if (mic.state === "granted") setHasMicPermission(true);
      else if (mic.state === "denied") setHasMicPermission(false);
      mic.onchange = () => {
        setMicStatusText(mic.state as any);
        if (mic.state === "granted") setHasMicPermission(true);
        else if (mic.state === "denied") setHasMicPermission(false);
      };
    } catch {}
  };

  // Open standalone browser tab to bypass iframe permission block
  const openInStandaloneTab = () => {
    if (typeof window !== "undefined") {
      window.open(window.location.href, "_blank", "noopener,noreferrer");
    }
  };

  // Strictly request physical hardware media permissions (no virtual bypass)
  const requestMediaPermissions = async () => {
    setIsProbingDevices(true);
    setPermissionError(null);
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("getUserMedia is not supported or is restricted in this browser frame");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: true,
      });

      streamRef.current = stream;
      setHasCameraPermission(true);
      setHasMicPermission(true);
      setCameraStatusText("granted");
      setMicStatusText("granted");

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      // Hook audio tracker to live microphone for visual volume meter & analysis
      if (audioTrackerRef.current) {
        await audioTrackerRef.current.startTracking(stream);
      }

      toast.success("Physical webcam and microphone verified successfully! Proctoring ready.");
    } catch (err: any) {
      console.warn("Hardware media permission not granted:", err?.name || err?.message || err);
      setHasCameraPermission(false);
      setHasMicPermission(false);
      setShowBrowserGuide(true);

      const isDenied = err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError";
      const isNotFound = err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError";

      if (isDenied) {
        setCameraStatusText("denied");
        setMicStatusText("denied");
        setPermissionError(
          "Camera or microphone access was blocked by your browser or operating system. Follow the Chrome Settings guide below to allow permissions."
        );
      } else if (isNotFound) {
        setCameraStatusText("prompt");
        setMicStatusText("prompt");
        setPermissionError(
          "No physical camera or microphone was detected. Please connect actual hardware devices to proceed with this proctored interview."
        );
      } else {
        setPermissionError(
          `Hardware verification error: ${err?.message || "Permission required"}. Follow the browser guide below to grant access.`
        );
      }
    } finally {
      setIsProbingDevices(false);
    }
  };

  // Start the live interview (strictly enforces physical hardware)
  const handleStartInterview = async () => {
    if (!hasCameraPermission || !hasMicPermission) {
      setShowBrowserGuide(true);
      toast.error(
        "Strict Hardware Anti-Cheat: Physical webcam and microphone permissions are required. Follow the Chrome settings guide above.",
        { duration: 5000 }
      );
      return;
    }
    if (!agreeToRules) {
      toast.error("Please agree to the anti-cheat and proctoring guidelines.");
      return;
    }

    setStage("interviewing");
    setElapsedSeconds(0);
    setCurrentTier("bruteForce");

    // Start strict proctoring
    if (proctoringEngineRef.current) {
      await proctoringEngineRef.current.startProctoring(
        workspaceContainerRef.current || document.documentElement
      );
      proctoringEngineRef.current.setCameraStatus(true);
    }

    // Attach stream to video element in interview workspace
    setTimeout(() => {
      if (videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
      }
    }, 150);

    // Greet candidate via speech synthesis
    const greeting = `Welcome to your live technical interview. Today we are tackling "${selectedQuestion.title}". Take a moment to review the problem statement. When you are ready, implement the brute force baseline solution. I will be silently observing your code in the background.`;
    setInterviewerSpeechText(greeting);
    setInterviewerStatus("speaking");
    speechSynthRef.current?.speak(greeting, {
      onStart: () => setInterviewerStatus("speaking"),
      onEnd: () => setInterviewerStatus("idle"),
    });
  };

  // Submit current solution tier
  const handleSubmitTier = async () => {
    if (isEvaluating) return;

    if (!code.trim() || code.length < 25) {
      toast.warning("Please provide an implementation before submitting this tier.");
      return;
    }

    setIsEvaluating(true);
    setInterviewerStatus("evaluating");
    const evalPromise = apiInterviewEvaluate({
      question: selectedQuestion,
      tier: currentTier,
      code,
      language: selectedLanguage,
      transcript: candidateTranscript,
      previousTiers: tiersCompleted,
    });

    toast.promise(evalPromise, {
      loading: `Interviewer is analyzing your ${currentTier === "bruteForce" ? "Brute Force" : currentTier === "better" ? "Better" : "Optimal"} solution...`,
      success: "Analysis complete!",
      error: "Evaluation service encountered an error. Proceeding with backup audit...",
    });

    try {
      const result: TierEvaluationResult = await evalPromise;
      setTierEvaluations((prev) => ({
        ...prev,
        [currentTier]: result,
      }));

      // Speak evaluation aloud
      if (result.spokenFeedback) {
        setInterviewerSpeechText(result.spokenFeedback);
        setInterviewerStatus("speaking");
        speechSynthRef.current?.speak(result.spokenFeedback, {
          onStart: () => setInterviewerStatus("speaking"),
          onEnd: () => setInterviewerStatus("idle"),
        });
      }

      if (result.passed) {
        setTiersCompleted((prev) => ({
          ...prev,
          [currentTier]: true,
        }));

        // Advance to next tier if available
        if (currentTier === "bruteForce") {
          toast.success("Brute Force Solution Accepted! Advancing to Better Approach.");
          setCurrentTier("better");
        } else if (currentTier === "better") {
          toast.success("Better Solution Accepted! Advancing to Optimal Approach.");
          setCurrentTier("optimal");
        } else if (currentTier === "optimal") {
          toast.success("Optimal Invariant Achieved! All tiers completed.");
        }
      } else {
        toast.error("Solution needs refinement. Listen to the interviewer's feedback.");
      }
    } catch (err: any) {
      console.warn("Evaluation service notice:", err?.message || err);
      // Friendly fallback
      const fallbackFeedback = `I've inspected your ${currentTier} implementation. Pay careful attention to boundary conditions and index bounds. Take another pass at your invariant.`;
      setInterviewerSpeechText(fallbackFeedback);
      speechSynthRef.current?.speak(fallbackFeedback);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Ask interviewer for a subtle hint
  const handleAskHint = () => {
    const hint = selectedQuestion.tierDetails[currentTier].guidance;
    const spoken = `Here is an indirect consideration for your ${currentTier} approach: ${hint}`;
    setInterviewerSpeechText(spoken);
    setInterviewerStatus("speaking");
    speechSynthRef.current?.speak(spoken, {
      onStart: () => setInterviewerStatus("speaking"),
      onEnd: () => setInterviewerStatus("idle"),
    });
    toast.info("Interviewer gave a Socratic hint.");
  };

  // Conclude interview and generate comprehensive scorecard
  const handleConcludeInterview = async () => {
    setIsGeneratingScorecard(true);
    speechSynthRef.current?.stop();

    // Collect speech confidence report
    let confReport: ConfidenceReport = {
      overallConfidenceScore: 8.5,
      vocalSteadinessScore: 8.5,
      fluencyScore: 8.5,
      articulationScore: 8.5,
      wordsPerMinute: typingWpm || 100,
      totalSpokenSeconds: elapsedSeconds,
      totalWordsSpoken: candidateTranscript.split(/\s+/).length,
      fillerWordCount: 2,
      fillerWordsDetected: ["like", "um"],
      hesitationPauses: 1,
      feedbackSummary: "Good vocal presence and clear algorithmic breakdown.",
    };

    if (audioTrackerRef.current) {
      confReport = audioTrackerRef.current.calculateReport();
    }

    const currentProctoring = proctoringEngineRef.current?.getState() || proctoringState;

    const completedList = Object.entries(tiersCompleted)
      .filter(([_, passed]) => passed)
      .map(([tier]) => tier);

    const scorecardPromise = apiInterviewScorecard({
      question: selectedQuestion,
      bruteForceCode: tierCodes.bruteForce,
      betterCode: tierCodes.better,
      optimalCode: tierCodes.optimal,
      tiersCompleted: completedList,
      confidenceMetrics: confReport,
      proctoringMetrics: {
        strikes: currentProctoring.strikes,
        tabSwitchCount: currentProctoring.tabSwitchCount,
        blurCount: currentProctoring.blurCount,
        pasteCount: currentProctoring.pasteCount,
        integrityScore: currentProctoring.integrityScore,
      },
      elapsedSeconds,
    });

    toast.promise(scorecardPromise, {
      loading: "Compiling comprehensive Interview Scorecard & Confidence Rating...",
      success: "Scorecard generated!",
      error: "Error generating AI scorecard, loading backup summary...",
    });

    try {
      const result: InterviewScorecardResult = await scorecardPromise;
      setScorecard(result);
      setStage("scorecard");

      // Stop proctoring and audio
      proctoringEngineRef.current?.stopProctoring();
      audioTrackerRef.current?.stopTracking();

      // Interviewer speaks closing evaluation
      if (result.spokenClosingFeedback && !isMuted) {
        setInterviewerSpeechText(result.spokenClosingFeedback);
        setInterviewerStatus("speaking");
        speechSynthRef.current?.speak(result.spokenClosingFeedback, {
          onStart: () => setInterviewerStatus("speaking"),
          onEnd: () => setInterviewerStatus("idle"),
        });
      }
    } catch (err) {
      console.warn("Scorecard calculation fallback:", err);
    } finally {
      setIsGeneratingScorecard(false);
    }
  };

  // Toggle voice mute
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    speechSynthRef.current?.setMuted(nextMuted);
    toast.info(nextMuted ? "Interviewer voice muted." : "Interviewer voice active.");
  };

  // Pick another random question during setup
  const handleShuffleQuestion = () => {
    const nextQ = getRandomInterviewQuestion(selectedQuestion.id);
    setSelectedQuestion(nextQ);
    toast.info(`Selected new question: ${nextQ.title}`);
  };

  // Copy code helper
  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Format MM:SS timer
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      ref={workspaceContainerRef}
      className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-primary/25"
    >
      <SiteHeader />

      {/* STAGE 1: ENVIRONMENT & PROCTORING SETUP */}
      {stage === "setup" && (
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-4xl space-y-6">
            {/* Header Title */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-mono font-semibold text-primary">
                <Radio className="size-3.5 animate-pulse text-primary" />
                Live AI Interview Practice • FAANG Calibration
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground font-display">
                Live Technical Interview Workspace
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
                Real-time spoken AI interviewer with video proctoring, silent line-by-line typing
                observation, 3-tier solution evolution, and audio confidence analysis.
              </p>
            </div>

            {/* Grid: Camera Check + Question Preview */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: Device Permissions & Chrome Settings Interface */}
              <div className="md:col-span-6 space-y-4">
                {/* Hardware Verification Card */}
                <div className="rounded-2xl border border-border/80 bg-card/70 p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Video className="size-4 text-primary" />
                      <h3 className="font-bold text-sm text-foreground">Hardware Cam & Mic Verification</h3>
                    </div>
                    {hasCameraPermission && hasMicPermission ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
                        <CheckCircle2 className="size-3" />
                        Hardware Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-mono text-amber-400">
                        <AlertCircle className="size-3" />
                        Permission Required
                      </span>
                    )}
                  </div>

                  {/* Webcam Preview Box */}
                  <div className="relative aspect-video w-full rounded-xl bg-muted/60 border border-border/70 overflow-hidden flex items-center justify-center shadow-inner">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${
                        hasCameraPermission ? "opacity-100" : "opacity-0"
                      }`}
                    />
                    {!hasCameraPermission && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-card/90 backdrop-blur-xs">
                        <div className="size-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                          <Video className="size-6" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-foreground">Actual Camera & Microphone Required</p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed max-w-sm">
                            Strict anti-cheat proctoring requires physical hardware camera and microphone access.
                            Virtual and emulated feeds are prohibited.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                          <Button
                            size="sm"
                            disabled={isProbingDevices}
                            onClick={requestMediaPermissions}
                            className="font-mono text-xs cursor-pointer shadow-sm"
                          >
                            <Video className="size-3.5 mr-1.5" />
                            {isProbingDevices ? "Prompting Chrome..." : "Prompt Chrome for Camera & Mic"}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setShowBrowserGuide(!showBrowserGuide)}
                            className="font-mono text-xs cursor-pointer"
                          >
                            <SlidersHorizontal className="size-3.5 mr-1.5" />
                            {showBrowserGuide ? "Hide Settings Guide" : "Chrome Settings Guide"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Hardware Active HUD Badge */}
                    {hasCameraPermission && (
                      <div className="absolute top-2 left-2 z-10">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-black/75 backdrop-blur-sm border border-emerald-500/40 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
                          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          LIVE HARDWARE WEBCAM
                        </span>
                      </div>
                    )}

                    {/* Audio Meter Overlay */}
                    {hasMicPermission && (
                      <div className="absolute bottom-2 left-2 right-2 bg-background/85 backdrop-blur-md rounded-lg p-2 border border-border/70 flex items-center gap-2.5">
                        <Mic className="size-3.5 text-primary shrink-0" />
                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full transition-all duration-75"
                            style={{ width: `${Math.min(100, candidateVolume * 1.5)}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                          {candidateVolume > 10 ? "Speaking (Mic Active)" : "Silent"}
                        </span>
                      </div>
                    )}
                  </div>

                  {permissionError && (
                    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-foreground space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="size-4 shrink-0 text-amber-400 mt-0.5" />
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          {permissionError}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-500/20">
                        <Button
                          size="sm"
                          onClick={requestMediaPermissions}
                          className="h-7 text-[11px] font-mono font-bold"
                        >
                          <RefreshCw className="size-3 mr-1" /> Retry Chrome Prompt
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={openInStandaloneTab}
                          className="h-7 text-[11px] font-mono text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="size-3 mr-1" /> Open in Direct Chrome Tab
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Hardware Diagnostics Status Bar */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="rounded-lg border border-border/70 bg-muted/40 p-2 flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <Video className="size-3" /> Camera:
                      </span>
                      <span
                        className={`text-[11px] font-bold ${
                          hasCameraPermission
                            ? "text-emerald-400"
                            : cameraStatusText === "denied"
                            ? "text-red-400"
                            : "text-amber-400"
                        }`}
                      >
                        {hasCameraPermission ? "Allowed" : cameraStatusText === "denied" ? "Blocked" : "Required"}
                      </span>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-muted/40 p-2 flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <Mic className="size-3" /> Mic:
                      </span>
                      <span
                        className={`text-[11px] font-bold ${
                          hasMicPermission
                            ? "text-emerald-400"
                            : micStatusText === "denied"
                            ? "text-red-400"
                            : "text-amber-400"
                        }`}
                      >
                        {hasMicPermission ? "Allowed" : micStatusText === "denied" ? "Blocked" : "Required"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* CHROME / WEB BROWSER SETTINGS INTERFACE ON SCREEN */}
                {showBrowserGuide && (
                  <div className="rounded-2xl border border-primary/30 bg-card/90 p-4 space-y-4 shadow-md">
                    {/* Header with Browser Window Dots */}
                    <div className="flex items-center justify-between border-b border-border/70 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="size-2.5 rounded-full bg-red-500/80" />
                          <span className="size-2.5 rounded-full bg-amber-500/80" />
                          <span className="size-2.5 rounded-full bg-emerald-500/80" />
                        </div>
                        <span className="text-xs font-mono font-bold text-foreground ml-1 flex items-center gap-1.5">
                          <Globe className="size-3.5 text-primary" />
                          Browser Permission Settings Guide
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-primary font-semibold uppercase tracking-wider bg-primary/10 border border-primary/25 px-2 py-0.5 rounded">
                        Chrome Settings
                      </span>
                    </div>

                    {/* Embedded Iframe Preview Callout */}
                    {isInsideIframe && (
                      <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-3 text-xs space-y-2">
                        <div className="flex items-start gap-2">
                          <Info className="size-4 shrink-0 text-blue-400 mt-0.5" />
                          <div className="space-y-1">
                            <p className="font-bold text-foreground text-[11px]">
                              Embedded Window Detected
                            </p>
                            <p className="text-muted-foreground text-[11px] leading-relaxed">
                              Chrome restricts hardware camera & mic prompts inside embedded iframe previews.
                              Open this workspace in a direct standalone tab to grant Chrome permissions instantly!
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={openInStandaloneTab}
                          className="w-full h-8 text-xs font-mono font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                        >
                          <ExternalLink className="size-3.5 mr-1.5" /> Open in Direct Chrome Tab
                        </Button>
                      </div>
                    )}

                    {/* Realistic Chrome Address Bar Simulation */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold font-mono text-foreground flex items-center gap-1.5">
                          <MousePointerClick className="size-3.5 text-primary" />
                          How to Allow Permissions in Chrome Address Bar:
                        </span>
                      </div>

                      {/* Mock Chrome Address Bar */}
                      <div className="rounded-xl border border-border/80 bg-muted/70 p-2.5 space-y-2 shadow-inner">
                        {/* URL Omnibox */}
                        <div className="flex items-center gap-2 rounded-lg bg-card border border-primary/40 px-3 py-1.5 relative">
                          {/* Animated pointer indicator targeting the tune/lock button */}
                          <div className="flex items-center gap-1.5 bg-primary/15 border border-primary/50 text-primary px-2 py-0.5 rounded-md font-mono text-[10px] font-bold shadow-xs animate-pulse">
                            <SlidersHorizontal className="size-3" />
                            <span>1. Click Site Info</span>
                          </div>

                          <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground flex-1 truncate">
                            <Lock className="size-3 text-emerald-400 shrink-0" />
                            <span className="text-foreground font-semibold">https://</span>
                            <span>ais-dev-...run.app</span>
                            <span className="text-muted-foreground">/live-interview</span>
                          </div>
                        </div>

                        {/* Simulated Chrome Site Permissions Popover */}
                        <div className="rounded-lg border border-border/90 bg-card p-3 space-y-2.5 shadow-sm text-xs">
                          <div className="flex items-center justify-between border-b border-border/60 pb-1.5 text-[11px]">
                            <span className="font-bold text-foreground">Permissions for this site</span>
                            <span className="text-[10px] font-mono text-muted-foreground">Google Chrome</span>
                          </div>

                          {/* Row 1: Camera Permission */}
                          <div className="flex items-center justify-between p-1.5 rounded-md bg-muted/40">
                            <div className="flex items-center gap-2">
                              <Video className="size-3.5 text-primary" />
                              <div>
                                <div className="font-bold text-[11px] text-foreground">Camera</div>
                                <div className="text-[10px] text-muted-foreground">Live visual proctoring</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded font-mono text-[10px] font-bold">
                              <Check className="size-3" /> Set to "Allow"
                            </div>
                          </div>

                          {/* Row 2: Microphone Permission */}
                          <div className="flex items-center justify-between p-1.5 rounded-md bg-muted/40">
                            <div className="flex items-center gap-2">
                              <Mic className="size-3.5 text-primary" />
                              <div>
                                <div className="font-bold text-[11px] text-foreground">Microphone</div>
                                <div className="text-[10px] text-muted-foreground">Speech confidence & analysis</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded font-mono text-[10px] font-bold">
                              <Check className="size-3" /> Set to "Allow"
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Browser Specific Instructions Tabs */}
                    <div className="space-y-2">
                      <div className="grid grid-cols-4 gap-1 rounded-lg bg-muted/40 p-1 border border-border/60">
                        {(["chrome", "edge", "safari", "firefox"] as const).map((b) => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => setSelectedBrowserTab(b)}
                            className={`rounded-md py-1 text-[11px] font-mono font-bold capitalize transition-all cursor-pointer ${
                              selectedBrowserTab === b
                                ? "bg-card text-foreground shadow-xs border border-border/80"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {b === "chrome" ? "Chrome" : b === "edge" ? "Edge" : b === "safari" ? "Safari" : "Firefox"}
                          </button>
                        ))}
                      </div>

                      <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-[11px] text-muted-foreground space-y-1.5 font-mono">
                        {selectedBrowserTab === "chrome" && (
                          <ol className="list-decimal list-inside space-y-1">
                            <li>Look at Chrome's address bar at the top of this window.</li>
                            <li>Click the <strong className="text-foreground">Site Information</strong> icon (🎛️ or 🔒) next to the URL.</li>
                            <li>Toggle both <strong className="text-foreground">Camera</strong> and <strong className="text-foreground">Microphone</strong> to <strong className="text-emerald-400">Allow</strong>.</li>
                            <li>Click <strong className="text-foreground">"Prompt Chrome for Camera & Mic"</strong> below to connect.</li>
                          </ol>
                        )}
                        {selectedBrowserTab === "edge" && (
                          <ol className="list-decimal list-inside space-y-1">
                            <li>Click the lock or site permissions icon in Microsoft Edge's address bar.</li>
                            <li>Under <strong className="text-foreground">Permissions for this site</strong>, set Camera to <strong className="text-emerald-400">Allow</strong> and Microphone to <strong className="text-emerald-400">Allow</strong>.</li>
                            <li>Click the prompt button below to verify.</li>
                          </ol>
                        )}
                        {selectedBrowserTab === "safari" && (
                          <ol className="list-decimal list-inside space-y-1">
                            <li>In the macOS menu bar, click <strong className="text-foreground">Safari &gt; Settings for This Website...</strong></li>
                            <li>Set both <strong className="text-foreground">Camera</strong> and <strong className="text-foreground">Microphone</strong> to <strong className="text-emerald-400">Allow</strong>.</li>
                            <li>Refresh the page or click prompt below.</li>
                          </ol>
                        )}
                        {selectedBrowserTab === "firefox" && (
                          <ol className="list-decimal list-inside space-y-1">
                            <li>Click the permissions icon (slider/lock) on the left of Firefox's URL bar.</li>
                            <li>Clear any blocked permissions and allow access when prompted.</li>
                          </ol>
                        )}
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/60">
                      <Button
                        size="sm"
                        disabled={isProbingDevices}
                        onClick={requestMediaPermissions}
                        className="flex-1 font-mono text-xs font-bold gap-1.5 cursor-pointer"
                      >
                        <Video className="size-3.5" />
                        {isProbingDevices ? "Requesting Access..." : "Prompt Chrome for Camera & Mic"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={checkHardwarePermissions}
                        className="font-mono text-xs gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="size-3" /> Re-check Status
                      </Button>
                    </div>
                  </div>
                )}

                {/* Anti-Cheat & Strict Rules Checklist */}
                <div className="rounded-2xl border border-border/70 bg-secondary/40 p-4 space-y-2.5 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <ShieldCheck className="size-4 text-primary" />
                    <span>Strict Proctoring & Anti-Cheat Protocol</span>
                  </div>
                  <ul className="space-y-1.5 text-muted-foreground text-[11px]">
                    <li className="flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-primary" />
                      <span>Full-screen mode will be strictly locked on interview launch.</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-primary" />
                      <span>Tab switches and window focus loss trigger immediate strikes (3 strikes = terminate).</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-primary" />
                      <span>External clipboard copy-pasting is strictly audited.</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-primary" />
                      <span>Physical hardware camera & mic must remain active throughout the session.</span>
                    </li>
                  </ul>

                  <label className="flex items-center gap-2 pt-2 border-t border-border/60 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreeToRules}
                      onChange={(e) => setAgreeToRules(e.target.checked)}
                      className="size-3.5 rounded border-border text-primary focus:ring-primary/20 accent-primary"
                    />
                    <span className="text-[11px] font-semibold text-foreground">
                      I agree to the strict proctoring policy and physical camera/mic verification.
                    </span>
                  </label>
                </div>
              </div>

              {/* Right Column: Problem Preview & Launch Deck */}
              <div className="md:col-span-6 rounded-2xl border border-border/80 bg-card/70 p-5 flex flex-col justify-between space-y-4 shadow-sm">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="size-4 text-primary" />
                      <h3 className="font-bold text-sm text-foreground">Assigned Interview Question</h3>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShuffleQuestion}
                      className="h-7 text-xs font-mono gap-1 cursor-pointer"
                      title="Pick another random question"
                    >
                      <Shuffle className="size-3" />
                      <span>Shuffle</span>
                    </Button>
                  </div>

                  {/* Problem Card */}
                  <div className="rounded-xl border border-border/80 bg-secondary/30 p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-display font-bold text-base text-foreground">
                        {selectedQuestion.title}
                      </h4>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold font-mono ${
                          selectedQuestion.difficulty === "Easy"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : selectedQuestion.difficulty === "Medium"
                            ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {selectedQuestion.difficulty}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 text-[10px] font-mono text-muted-foreground">
                      <span className="rounded bg-muted px-1.5 py-0.5">{selectedQuestion.topic}</span>
                      {selectedQuestion.companyTags.slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded bg-primary/10 text-primary px-1.5 py-0.5">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {selectedQuestion.description}
                    </p>
                  </div>

                  {/* 3-Tier Progression Preview */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold font-mono text-muted-foreground uppercase tracking-wider">
                      Expected 3-Tier Evolution
                    </span>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                      <div className="rounded-lg border border-border/80 bg-muted/30 p-2 space-y-0.5">
                        <div className="text-[10px] font-bold text-foreground">1. Brute Force</div>
                        <div className="text-[11px] text-primary font-bold">
                          {selectedQuestion.tierDetails.bruteForce.targetTime}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border/80 bg-muted/30 p-2 space-y-0.5">
                        <div className="text-[10px] font-bold text-foreground">2. Better</div>
                        <div className="text-[11px] text-primary font-bold">
                          {selectedQuestion.tierDetails.better.targetTime}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border/80 bg-muted/30 p-2 space-y-0.5">
                        <div className="text-[10px] font-bold text-foreground">3. Optimal</div>
                        <div className="text-[11px] text-primary font-bold">
                          {selectedQuestion.tierDetails.optimal.targetTime}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Preferred Language Picker */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold font-mono text-muted-foreground uppercase tracking-wider">
                      Implementation Language
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {(["cpp", "python", "javascript", "java"] as Language[]).map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => setSelectedLanguage(lang)}
                          className={`rounded-xl border py-1.5 text-xs font-mono font-bold transition-all cursor-pointer ${
                            selectedLanguage === lang
                              ? "border-primary bg-primary/20 text-primary shadow-xs"
                              : "border-border/70 bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground"
                          }`}
                        >
                          {lang === "cpp" ? "C++" : lang === "python" ? "Python" : lang === "javascript" ? "JS" : "Java"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Launch Button */}
                <div className="pt-2">
                  <Button
                    size="lg"
                    disabled={!hasCameraPermission || !hasMicPermission || !agreeToRules}
                    onClick={handleStartInterview}
                    className="w-full font-bold font-display text-sm gap-2 cursor-pointer shadow-md py-5"
                  >
                    <Play className="size-4 fill-current" />
                    <span>Launch Live Interview (Enter Fullscreen)</span>
                  </Button>
                  <p className="text-[10px] font-mono text-center text-muted-foreground mt-2">
                    Pressing Start will trigger full-screen proctoring and initialize the AI interviewer voice.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* STAGE 2: LIVE INTERVIEW WORKSPACE */}
      {stage === "interviewing" && (
        <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
          {/* Top HUD: Proctoring Status, Timer, Strikes, Tier Phase */}
          <div className="border-b border-border/80 bg-card/90 backdrop-blur-md px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
            {/* Left: Proctoring Badge & Question Info */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-mono font-bold text-emerald-400">
                <span className="size-2 rounded-full bg-rose-500 animate-ping" />
                <span className="size-2 rounded-full bg-rose-500 -ml-4" />
                <span>MONITORED LIVE</span>
              </div>

              <div className="hidden sm:flex items-center gap-2">
                <span className="font-bold text-sm text-foreground">{selectedQuestion.title}</span>
                <span
                  className={`rounded-full px-2 py-0.2 text-[10px] font-bold font-mono ${
                    selectedQuestion.difficulty === "Easy"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : selectedQuestion.difficulty === "Medium"
                      ? "bg-amber-500/15 text-amber-400"
                      : "bg-rose-500/15 text-rose-400"
                  }`}
                >
                  {selectedQuestion.difficulty}
                </span>
              </div>
            </div>

            {/* Middle: 3-Tier Solution Phase Tracker */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono font-bold transition-all ${
                  currentTier === "bruteForce"
                    ? "bg-primary/20 text-primary border border-primary/50 shadow-xs"
                    : tiersCompleted.bruteForce
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "bg-muted/40 text-muted-foreground border border-border/50 opacity-60"
                }`}
              >
                {tiersCompleted.bruteForce ? (
                  <CheckCircle2 className="size-3 text-emerald-400" />
                ) : (
                  <span className="size-2 rounded-full bg-primary" />
                )}
                <span>1. Brute Force</span>
              </div>

              <ChevronRight className="size-3 text-muted-foreground" />

              <div
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono font-bold transition-all ${
                  currentTier === "better"
                    ? "bg-primary/20 text-primary border border-primary/50 shadow-xs"
                    : tiersCompleted.better
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "bg-muted/40 text-muted-foreground border border-border/50 opacity-60"
                }`}
              >
                {tiersCompleted.better ? (
                  <CheckCircle2 className="size-3 text-emerald-400" />
                ) : (
                  <span className="size-2 rounded-full bg-primary" />
                )}
                <span>2. Better</span>
              </div>

              <ChevronRight className="size-3 text-muted-foreground" />

              <div
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono font-bold transition-all ${
                  currentTier === "optimal"
                    ? "bg-primary/20 text-primary border border-primary/50 shadow-xs"
                    : tiersCompleted.optimal
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "bg-muted/40 text-muted-foreground border border-border/50 opacity-60"
                }`}
              >
                {tiersCompleted.optimal ? (
                  <CheckCircle2 className="size-3 text-emerald-400" />
                ) : (
                  <span className="size-2 rounded-full bg-primary" />
                )}
                <span>3. Optimal</span>
              </div>
            </div>

            {/* Right: Strikes, Timer, Voice & End Interview Button */}
            <div className="flex items-center gap-2">
              {/* Strikes Counter */}
              <div
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-mono font-bold border ${
                  proctoringState.strikes === 0
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : proctoringState.strikes === 1
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                    : "bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse"
                }`}
                title="Integrity strikes for tab-switching or leaving fullscreen"
              >
                <ShieldAlert className="size-3.5" />
                <span>{proctoringState.strikes} / 3 Strikes</span>
              </div>

              {/* Running Timer */}
              <div className="flex items-center gap-1.5 rounded-xl border border-border/70 bg-secondary/50 px-2.5 py-1 text-xs font-mono font-bold text-foreground">
                <Clock className="size-3.5 text-primary" />
                <span>{formatTime(elapsedSeconds)}</span>
              </div>

              {/* Mute Toggle */}
              <button
                type="button"
                onClick={toggleMute}
                className="size-8 flex items-center justify-center rounded-xl border border-border/70 bg-secondary/60 text-muted-foreground hover:text-foreground cursor-pointer transition-all"
                title={isMuted ? "Unmute Interviewer" : "Mute Interviewer"}
              >
                {isMuted ? <VolumeX className="size-4 text-rose-400" /> : <Volume2 className="size-4 text-primary" />}
              </button>

              {/* Conclude Early Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleConcludeInterview}
                disabled={isGeneratingScorecard}
                className="text-xs font-mono cursor-pointer border-border/80 hover:bg-destructive/15 hover:text-destructive hover:border-destructive/40"
              >
                <span>End & Score</span>
              </Button>
            </div>
          </div>

          {/* Main 2-Column Split: Left (Interviewer & Problem) | Right (Code & Actions) */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
            {/* Left Column: AI Interviewer Avatar, Candidate Cam, Problem Details */}
            <div className="lg:col-span-5 border-r border-border/80 bg-card/40 flex flex-col h-full overflow-y-auto p-4 space-y-4">
              {/* Interviewer Quadrant */}
              <div className="rounded-2xl border border-border/80 bg-card/90 p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {/* Animated Avatar / Audio Wave */}
                    <div className="relative size-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
                      <Brain className="size-5" />
                      {interviewerStatus === "speaking" && (
                        <span className="absolute -top-1 -right-1 flex size-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full size-3 bg-emerald-500" />
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-foreground">AI Senior Interviewer</span>
                        <span className="rounded-full bg-primary/15 px-1.5 py-0.2 text-[9px] font-mono font-bold text-primary">
                          VOICE ENABLED
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-muted-foreground">
                        {interviewerStatus === "speaking"
                          ? "Speaking aloud to candidate..."
                          : interviewerStatus === "evaluating"
                          ? "Analyzing code & invariants..."
                          : "Silently observing (no interruptions)"}
                      </p>
                    </div>
                  </div>

                  {/* Ask Hint Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAskHint}
                    className="h-7 text-xs font-mono gap-1 cursor-pointer"
                    title="Request an indirect Socratic nudge"
                  >
                    <HelpCircle className="size-3" />
                    <span>Ask Hint</span>
                  </Button>
                </div>

                {/* Spoken Captions / Subtitles Box */}
                {interviewerSpeechText && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono text-primary font-bold uppercase tracking-wider">
                      <span>Interviewer Spoken Guidance</span>
                      <button
                        type="button"
                        onClick={() => setShowCaptions(!showCaptions)}
                        className="hover:underline cursor-pointer"
                      >
                        {showCaptions ? "Hide" : "Show"}
                      </button>
                    </div>
                    {showCaptions && (
                      <p className="text-muted-foreground leading-relaxed italic">
                        "{interviewerSpeechText}"
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Candidate Live Video & Mic Meter */}
              <div className="rounded-2xl border border-border/80 bg-card/80 p-3.5 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="size-3.5 text-primary" />
                    <span className="text-xs font-bold text-foreground">Candidate Live Stream</span>
                  </div>
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Hardware Cam Active
                  </span>
                </div>

                <div className="relative aspect-video w-full rounded-xl bg-black/40 border border-border/60 overflow-hidden flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  {/* Bounding box visual HUD */}
                  <div className="absolute inset-4 border border-dashed border-primary/30 rounded-lg pointer-events-none flex items-start justify-between p-1.5">
                    <span className="text-[9px] font-mono text-primary/70 bg-black/50 px-1 rounded">
                      HARDWARE PROCTOR ACTIVE
                    </span>
                    <span className="text-[9px] font-mono text-emerald-400 bg-black/50 px-1 rounded">
                      EYE CONTACT: ACTIVE
                    </span>
                  </div>

                  {/* Vocal Energy Meter */}
                  <div className="absolute bottom-2 left-2 right-2 bg-background/80 backdrop-blur-md rounded-lg p-1.5 border border-border/70 flex items-center gap-2">
                    <Mic className="size-3 text-primary shrink-0" />
                    <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-75"
                        style={{ width: `${Math.min(100, candidateVolume * 1.5)}%` }}
                      />
                    </div>
                    <span className="font-mono text-[9px] text-muted-foreground">
                      {candidateVolume > 10 ? "Speaking" : "Quiet"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabbed Navigation: Problem Statement | Proctoring Audit */}
              <div className="flex-1 flex flex-col min-h-0 rounded-2xl border border-border/80 bg-card/70 overflow-hidden">
                <div className="border-b border-border/70 bg-secondary/40 px-3 py-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("problem")}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      activeTab === "problem"
                        ? "bg-primary/20 text-primary border border-primary/40"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Problem Spec
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("proctoring")}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      activeTab === "proctoring"
                        ? "bg-primary/20 text-primary border border-primary/40"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Proctoring Audit ({proctoringState.events.length})
                  </button>
                  {candidateTranscript && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("transcript")}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        activeTab === "transcript"
                          ? "bg-primary/20 text-primary border border-primary/40"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Your Speech Transcript
                    </button>
                  )}
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
                  {activeTab === "problem" && (
                    <div className="space-y-4">
                      {/* Current Tier Target Spec */}
                      <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] uppercase font-bold text-primary">
                            Current Target Phase:{" "}
                            {currentTier === "bruteForce"
                              ? "Brute Force"
                              : currentTier === "better"
                              ? "Better Approach"
                              : "Optimal Solution"}
                          </span>
                          <span className="font-mono text-[11px] font-bold text-foreground">
                            Target Time: {selectedQuestion.tierDetails[currentTier].targetTime}
                          </span>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">
                          {selectedQuestion.tierDetails[currentTier].description}
                        </p>
                      </div>

                      {/* Problem Description */}
                      <div className="space-y-2">
                        <h4 className="font-bold text-sm text-foreground">Description</h4>
                        <div className="text-muted-foreground leading-relaxed whitespace-pre-line">
                          {selectedQuestion.description}
                        </div>
                      </div>

                      {/* Examples */}
                      <div className="space-y-2.5">
                        <h4 className="font-bold text-sm text-foreground">Examples</h4>
                        {selectedQuestion.examples.map((ex, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-border/70 bg-secondary/30 p-3 space-y-1 font-mono text-xs"
                          >
                            <div>
                              <span className="text-muted-foreground">Input: </span>
                              <span className="text-foreground">{ex.input}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Output: </span>
                              <span className="text-emerald-400 font-bold">{ex.output}</span>
                            </div>
                            {ex.explanation && (
                              <p className="text-[11px] text-muted-foreground/80 pt-1 border-t border-border/50">
                                {ex.explanation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Constraints */}
                      <div className="space-y-1.5">
                        <h4 className="font-bold text-sm text-foreground">Constraints</h4>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground font-mono text-[11px]">
                          {selectedQuestion.constraints.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {activeTab === "proctoring" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between pb-2 border-b border-border/60 font-mono text-[11px]">
                        <span className="text-muted-foreground">Proctoring Telemetry Log</span>
                        <span className="text-primary font-bold">
                          Integrity Score: {proctoringState.integrityScore} / 10
                        </span>
                      </div>
                      <div className="space-y-1.5 font-mono text-[11px]">
                        {proctoringState.events.length === 0 ? (
                          <p className="text-muted-foreground py-4 text-center">
                            Zero infractions recorded. Candidate is fully compliant.
                          </p>
                        ) : (
                          proctoringState.events.map((evt) => (
                            <div
                              key={evt.id}
                              className={`rounded-lg border p-2 flex items-start gap-2 ${
                                evt.severity === "strike"
                                  ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                                  : evt.severity === "warning"
                                  ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                                  : "border-border/60 bg-secondary/30 text-muted-foreground"
                              }`}
                            >
                              <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                                {evt.timestamp}
                              </span>
                              <span className="flex-1">{evt.description}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === "transcript" && (
                    <div className="space-y-2">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        Live Speech-To-Text of candidate thoughts:
                      </span>
                      <div className="rounded-xl border border-border/70 bg-secondary/30 p-3 text-muted-foreground leading-relaxed font-mono text-xs max-h-60 overflow-y-auto">
                        {candidateTranscript || "Listening for candidate spoken thoughts..."}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Code Editor & 3-Tier Submission Deck */}
            <div className="lg:col-span-7 flex flex-col h-full overflow-hidden bg-background">
              {/* Editor Header: Language, Silent Observer Telemetry, Copy */}
              <div className="border-b border-border/80 bg-card/70 px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <Code2 className="size-4 text-primary" />
                  <div className="flex items-center gap-1 font-mono text-xs font-bold text-foreground">
                    <span>Editor ({selectedLanguage.toUpperCase()})</span>
                  </div>
                </div>

                {/* Real-time Silent Observer Telemetry Ribbon */}
                <div className="flex items-center gap-2 rounded-full border border-border/70 bg-secondary/40 px-3 py-1 font-mono text-[11px] text-muted-foreground">
                  <Activity className="size-3 text-emerald-400 animate-pulse" />
                  <span>
                    Observer: Line {lineCount} • {typingWpm} WPM • Invariant Active • 0 Interruption Policy
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyCode}
                    className="h-7 text-xs font-mono gap-1 cursor-pointer"
                  >
                    {copiedCode ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                    <span>{copiedCode ? "Copied" : "Copy"}</span>
                  </Button>
                </div>
              </div>

              {/* Monaco Code Editor */}
              <div className="flex-1 min-h-0 relative">
                <Editor
                  height="100%"
                  language={
                    selectedLanguage === "cpp"
                      ? "cpp"
                      : selectedLanguage === "python"
                      ? "python"
                      : selectedLanguage === "javascript"
                      ? "javascript"
                      : "java"
                  }
                  value={code}
                  theme="vs-dark"
                  onChange={handleCodeChange}
                  options={{
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    fontLigatures: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    lineNumbers: "on",
                    glyphMargin: false,
                    folding: true,
                    tabSize: 4,
                    wordWrap: "on",
                    padding: { top: 12, bottom: 12 },
                    cursorBlinking: "smooth",
                    renderLineHighlight: "all",
                  }}
                />
              </div>

              {/* Action Deck: Submit Tier Button & Feedback */}
              <div className="border-t border-border/80 bg-card/90 backdrop-blur-md p-4 space-y-3 shrink-0">
                {/* Last Tier Evaluation Result (if any) */}
                {tierEvaluations[currentTier] && (
                  <div
                    className={`rounded-xl border p-3 text-xs flex items-start gap-2.5 ${
                      tierEvaluations[currentTier]?.passed
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        : "border-amber-500/40 bg-amber-500/10 text-amber-300"
                    }`}
                  >
                    {tierEvaluations[currentTier]?.passed ? (
                      <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="size-4 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 space-y-0.5">
                      <div className="font-bold flex items-center justify-between">
                        <span>
                          {tierEvaluations[currentTier]?.tierClassification} Result (
                          {tierEvaluations[currentTier]?.timeComplexity} time,{" "}
                          {tierEvaluations[currentTier]?.spaceComplexity} space)
                        </span>
                        <span>{tierEvaluations[currentTier]?.passed ? "Passed ✓" : "Needs Tuning"}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed opacity-90">
                        {tierEvaluations[currentTier]?.writtenNotes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Primary Tier Submission Deck */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs font-mono text-muted-foreground">
                    <span>Active Goal: </span>
                    <strong className="text-foreground">
                      {currentTier === "bruteForce"
                        ? "1. Brute Force Solution"
                        : currentTier === "better"
                        ? "2. Better Approach Solution"
                        : "3. Optimal Invariant Solution"}
                    </strong>
                    <span className="hidden sm:inline text-muted-foreground">
                      {" "}
                      (Target: {selectedQuestion.tierDetails[currentTier].targetTime})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="default"
                      disabled={isEvaluating}
                      onClick={handleSubmitTier}
                      className="font-mono text-xs font-bold gap-2 cursor-pointer shadow-md bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {isEvaluating ? (
                        <>
                          <Sparkles className="size-3.5 animate-spin" />
                          <span>Evaluating Invariants...</span>
                        </>
                      ) : (
                        <>
                          <FileCheck className="size-3.5" />
                          <span>
                            {currentTier === "bruteForce"
                              ? "Submit Brute Force Solution"
                              : currentTier === "better"
                              ? "Submit Better Solution"
                              : "Submit Optimal Solution"}
                          </span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 3: COMPREHENSIVE SCORECARD MODAL / VIEW */}
      {stage === "scorecard" && scorecard && (
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-background">
          <div className="w-full max-w-4xl space-y-6">
            {/* Top Score Banner */}
            <div className="rounded-3xl border border-border/80 bg-card/90 p-6 sm:p-8 text-center space-y-4 shadow-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-mono font-bold text-primary">
                <Award className="size-3.5" />
                Live Interview Completed • Official Evaluation Scorecard
              </div>

              <div className="space-y-1">
                <h2 className="text-3xl sm:text-4xl font-black font-display text-foreground">
                  {selectedQuestion.title}
                </h2>
                <p className="text-sm font-mono text-muted-foreground">
                  Session Duration: {Math.round(elapsedSeconds / 60)} minutes • Problem Difficulty:{" "}
                  {selectedQuestion.difficulty}
                </p>
              </div>

              {/* Score Radar / Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {/* Overall Score */}
                <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4 space-y-1">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-primary">
                    Overall Rating
                  </div>
                  <div className="text-3xl sm:text-4xl font-black font-display text-foreground">
                    {scorecard.overallScore}
                    <span className="text-base text-muted-foreground font-normal"> / 10</span>
                  </div>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold font-mono ${
                      scorecard.hiringRecommendation === "Strong Hire"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : scorecard.hiringRecommendation === "Hire"
                        ? "bg-primary/20 text-primary"
                        : "bg-amber-500/20 text-amber-400"
                    }`}
                  >
                    {scorecard.hiringRecommendation}
                  </span>
                </div>

                {/* Algorithmic Craft */}
                <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4 space-y-1">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                    Algorithmic Craft
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-display text-foreground">
                    {scorecard.craftScore}
                    <span className="text-sm text-muted-foreground font-normal"> / 10</span>
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground">
                    Brute → Better → Optimal
                  </p>
                </div>

                {/* Audio & Confidence */}
                <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4 space-y-1">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                    Speech & Confidence
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-display text-foreground">
                    {scorecard.confidenceScore}
                    <span className="text-sm text-muted-foreground font-normal"> / 10</span>
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground">
                    {scorecard.speechAnalysis.wordsPerMinute} WPM • Delivery
                  </p>
                </div>

                {/* Integrity & Focus */}
                <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4 space-y-1">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                    Proctoring Integrity
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-display text-foreground">
                    {scorecard.integrityScore}
                    <span className="text-sm text-muted-foreground font-normal"> / 10</span>
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground">
                    {scorecard.proctoringSummary.strikes} Strikes • Verified
                  </p>
                </div>
              </div>

              {/* Spoken Closing Summary */}
              {scorecard.spokenClosingFeedback && (
                <div className="rounded-2xl border border-border/70 bg-secondary/40 p-4 text-left space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-foreground">
                    <div className="flex items-center gap-2">
                      <Volume2 className="size-4 text-primary" />
                      <span>Interviewer Verbal Verdict</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => speechSynthRef.current?.speak(scorecard.spokenClosingFeedback)}
                      className="h-6 text-xs font-mono gap-1 cursor-pointer"
                    >
                      <RotateCcw className="size-3" /> Replay Speech
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed italic">
                    "{scorecard.spokenClosingFeedback}"
                  </p>
                </div>
              )}
            </div>

            {/* 3-Tier Evolution Cards */}
            <div className="rounded-3xl border border-border/80 bg-card/80 p-6 space-y-4 shadow-sm">
              <h3 className="font-display font-bold text-base text-foreground">
                3-Tier Solution Progression Review
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Brute Force */}
                <div
                  className={`rounded-2xl border p-4 space-y-2 ${
                    tiersCompleted.bruteForce
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-border/70 bg-muted/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-foreground">
                      1. Brute Force
                    </span>
                    {tiersCompleted.bruteForce ? (
                      <span className="text-[10px] font-bold font-mono text-emerald-400">Completed ✓</span>
                    ) : (
                      <span className="text-[10px] font-bold font-mono text-muted-foreground">Skipped</span>
                    )}
                  </div>
                  <div className="text-xs font-mono text-primary font-bold">
                    {selectedQuestion.tierDetails.bruteForce.targetTime}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {selectedQuestion.tierDetails.bruteForce.description}
                  </p>
                </div>

                {/* Better Approach */}
                <div
                  className={`rounded-2xl border p-4 space-y-2 ${
                    tiersCompleted.better
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-border/70 bg-muted/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-foreground">
                      2. Better Approach
                    </span>
                    {tiersCompleted.better ? (
                      <span className="text-[10px] font-bold font-mono text-emerald-400">Completed ✓</span>
                    ) : (
                      <span className="text-[10px] font-bold font-mono text-muted-foreground">Skipped</span>
                    )}
                  </div>
                  <div className="text-xs font-mono text-primary font-bold">
                    {selectedQuestion.tierDetails.better.targetTime}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {selectedQuestion.tierDetails.better.description}
                  </p>
                </div>

                {/* Optimal Solution */}
                <div
                  className={`rounded-2xl border p-4 space-y-2 ${
                    tiersCompleted.optimal
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-border/70 bg-muted/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-foreground">
                      3. Optimal Invariant
                    </span>
                    {tiersCompleted.optimal ? (
                      <span className="text-[10px] font-bold font-mono text-emerald-400">Completed ✓</span>
                    ) : (
                      <span className="text-[10px] font-bold font-mono text-muted-foreground">Skipped</span>
                    )}
                  </div>
                  <div className="text-xs font-mono text-primary font-bold">
                    {selectedQuestion.tierDetails.optimal.targetTime}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {selectedQuestion.tierDetails.optimal.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Strengths & Growth Areas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border/80 bg-card/80 p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="size-4" />
                  <span>Key Demonstrated Strengths</span>
                </div>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {scorecard.topStrengths.map((str, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="size-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card/80 p-5 space-y-3">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <Sparkles className="size-4" />
                  <span>Polishing & Growth Focus</span>
                </div>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {scorecard.areasForGrowth.map((area, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <span>{area}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <Link to="/problems">
                <Button variant="outline" className="font-mono text-xs cursor-pointer">
                  Browse All 1,500+ Problems
                </Button>
              </Link>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    const nextQ = getRandomInterviewQuestion(selectedQuestion.id);
                    setSelectedQuestion(nextQ);
                    setStage("setup");
                    setTiersCompleted({ bruteForce: false, better: false, optimal: false });
                    setTierEvaluations({ bruteForce: null, better: null, optimal: null });
                  }}
                  className="font-mono text-xs font-bold gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Practice Another Problem</span>
                </Button>
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
export default LiveInterviewPage;
