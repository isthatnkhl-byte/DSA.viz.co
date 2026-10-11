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
  Send,
  Download,
  Flame,
  CheckSquare,
  Square,
  Layers,
  ChevronLeft,
  ChevronDown,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ApiKeyVaultButton } from "@/components/ApiKeyVaultModal";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  INTERVIEW_QUESTIONS,
  INTERVIEW_TEMPLATES,
  getQuestionQueueForTemplate,
  getTierStarterCode,
  getRandomInterviewQuestion,
  getAvailableInterviewTopics,
  getAvailableCompanyTags,
  getReferenceOptimalCode,
  getRecommendedFollowUpQuestions,
  type InterviewQuestion,
} from "@/lib/interview-questions";
import {
  InterviewSpeechSynthesizer,
  CandidateAudioTracker,
  listMediaDevices,
  type ConfidenceReport,
  type SpeechRecognitionStatus,
} from "@/lib/interview-audio";
import {
  InterviewProctoringEngine,
  type ProctoringState,
} from "@/lib/interview-proctoring";
import { InterviewCameraTracker } from "@/lib/interview-camera-tracker";
import {
  apiInterviewEvaluate,
  apiInterviewScorecard,
  apiInterviewRespond,
  apiInterviewRunTests,
  apiGetLiveKitToken,
  apiRunProblemTests,
  apiSubmitProblemCode,
} from "@/lib/api-client";
import {
  extractThreeSampleCasesForProblem,
  type LeetCodeRunResponse,
  type LeetCodeSubmitResponse,
  type LeetCodeSubmissionHistoryEntry,
} from "@/lib/leetcode-testcases";
import { LeetCodeTestDrawer, type DrawerTabType } from "@/components/editor/LeetCodeTestDrawer";
import { useAuth } from "@/hooks/useAuth";
import type {
  SolutionTier,
  TierEvaluationResult,
  InterviewScorecardResult,
  InterviewTemplate,
  QuestionSubmissionSnapshot,
  CameraTrackingState,
  ConversationalTranscriptItem,
  InterviewFlowStage,
  InterviewerCoachingAction,
  InterviewSampleRunResponse,
} from "@/lib/interview-types";

export const Route = createFileRoute("/live-interview")({
  component: LiveInterviewPage,
});

type InterviewStage = "setup" | "interviewing" | "scorecard";
type Language = "cpp" | "python" | "javascript" | "java";
type InterviewSessionMode = "proctored" | "practice";

interface SavedInterviewHistoryItem {
  id: string;
  date: string;
  templateTitle: string;
  mode: InterviewSessionMode;
  language: Language;
  overallScore: number;
  craftScore: number;
  confidenceScore: number;
  integrityScore: number;
  hiringRecommendation: InterviewScorecardResult["hiringRecommendation"];
  questionsAttempted: string[];
  scorecard: InterviewScorecardResult;
}

const INTERVIEW_HISTORY_STORAGE_KEY = "dsaviz_interview_history_v1";
const COMPLEXITY_OPTIONS = ["O(1)", "O(log N)", "O(N)", "O(N log N)", "O(N^2)", "O(2^N)"] as const;

function LiveInterviewPage() {
  // 1. Stage & Template State
  const [stage, setStage] = useState<InterviewStage>("setup");
  const stageRef = useRef<InterviewStage>("setup");
  stageRef.current = stage;

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("faang-round");
  const selectedTemplate = useMemo(() => {
    return (
      INTERVIEW_TEMPLATES.find((t) => t.id === selectedTemplateId) ||
      INTERVIEW_TEMPLATES[0]!
    );
  }, [selectedTemplateId]);

  // 2. Question Queue State
  const [questionQueue, setQuestionQueue] = useState<InterviewQuestion[]>(() =>
    getQuestionQueueForTemplate("faang-round")
  );
  const [activeQueueIndex, setActiveQueueIndex] = useState<number>(0);
  const currentQuestion = questionQueue[activeQueueIndex] || questionQueue[0] || INTERVIEW_QUESTIONS[0]!;

  const [selectedLanguage, setSelectedLanguage] = useState<Language>("cpp");

  // 3. Current Tier & Progression State Machine
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

  // Submissions archive per question
  const [questionSubmissions, setQuestionSubmissions] = useState<
    QuestionSubmissionSnapshot[]
  >([]);

  // 4. Celebration Modal (Tier Auto-Switch)
  const [celebrationModal, setCelebrationModal] = useState<{
    isOpen: boolean;
    completedTier: SolutionTier;
    nextTier: SolutionTier | null;
    prevComplexity: string;
    newComplexity: string;
    feedback: string;
  } | null>(null);

  // 5. Strike Warning & Lockdown Modal
  const [strikeModal, setStrikeModal] = useState<{
    isOpen: boolean;
    strikeNumber: number;
    reason: string;
    isTerminated: boolean;
  } | null>(null);

  // 6. Dual Timers
  const [perQuestionSecondsLeft, setPerQuestionSecondsLeft] = useState<number>(15 * 60);
  const [totalSessionSecondsLeft, setTotalSessionSecondsLeft] = useState<number>(45 * 60);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // 7. Audio, Live Mic & Voicepack State
  const [isMuted, setIsMuted] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [interviewerStatus, setInterviewerStatus] = useState<
    "idle" | "speaking" | "evaluating"
  >("idle");
  const [interviewerSpeechText, setInterviewerSpeechText] = useState<string>("");
  const [candidateVolume, setCandidateVolume] = useState<number>(0);
  const [candidateTranscript, setCandidateTranscript] = useState<string>("");
  const [liveInterimSpeech, setLiveInterimSpeech] = useState<string>("");
  const [speechRecStatus, setSpeechRecStatus] = useState<SpeechRecognitionStatus>("paused");
  const [speechRecMessage, setSpeechRecMessage] = useState<string>("");
  const [availableVoices, setAvailableVoices] = useState<
    Array<{ name: string; lang: string; uri: string; isNeural: boolean }>
  >([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>("");
  const [livekitCloudActive, setLivekitCloudActive] = useState<boolean>(false);

  // Hardware device selection state
  const [availableMics, setAvailableMics] = useState<MediaDeviceInfo[]>([]);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>("");
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");

  // Two-way Conversational Transcript
  const [conversationalChat, setConversationalChat] = useState<
    ConversationalTranscriptItem[]
  >([]);
  const [customQuestionInput, setCustomQuestionInput] = useState<string>("");
  const [isAskingInterviewer, setIsAskingInterviewer] = useState<boolean>(false);
  const isAskingInterviewerRef = useRef<boolean>(false);
  isAskingInterviewerRef.current = isAskingInterviewer;

  const [isHandsFreeLiveVoice, setIsHandsFreeLiveVoice] = useState<boolean>(true);
  const isHandsFreeRef = useRef<boolean>(true);
  isHandsFreeRef.current = isHandsFreeLiveVoice;

  const interviewerStatusRef = useRef<"idle" | "speaking" | "evaluating">("idle");
  interviewerStatusRef.current = interviewerStatus;

  const silenceQuestionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingVoiceQueryRef = useRef<string>("");
  const handleSendQueryRef = useRef<
    ((
      text?: string,
      options?: {
        fromVoice?: boolean;
        coachingAction?: InterviewerCoachingAction;
        hintLevel?: number;
        candidateLabel?: string;
      }
    ) => Promise<void>) | null
  >(null);

  // 7b. Phase 2 Guided Interview Flow & Progressive Hint Ladder State
  const [interviewFlowStage, setInterviewFlowStage] = useState<InterviewFlowStage>("clarify");
  const [hintLevelByTier, setHintLevelByTier] = useState<Record<SolutionTier, number>>({
    bruteForce: 0,
    better: 0,
    optimal: 0,
  });
  const [unlockedHintsByTier, setUnlockedHintsByTier] = useState<
    Record<SolutionTier, Array<{ level: number; text: string; followUp?: string }>>
  >({
    bruteForce: [],
    better: [],
    optimal: [],
  });
  const [liveDetectedComplexity, setLiveDetectedComplexity] = useState<{
    time: string;
    space: string;
  } | null>(null);

  // 7c. Phase 3 Question Filters & Live Sample Test Runner State
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>("All");
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string>("All");
  const availableCompanies = useMemo(() => ["All", ...getAvailableCompanyTags()], []);
  const availableTopics = useMemo(() => ["All", ...getAvailableInterviewTopics()], []);

  const { user, token } = useAuth();
  const [isRunningSampleTests, setIsRunningSampleTests] = useState<boolean>(false);
  const [sampleTestResult, setSampleTestResult] = useState<InterviewSampleRunResponse | null>(null);
  const [leetRunResult, setLeetRunResult] = useState<LeetCodeRunResponse | null>(null);
  const [leetSubmitResult, setLeetSubmitResult] = useState<LeetCodeSubmitResponse | null>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState<DrawerTabType>("testcase");
  const [interviewSubmissionHistory, setInterviewSubmissionHistory] = useState<
    LeetCodeSubmissionHistoryEntry[]
  >([]);
  const [interviewProfileSaved, setInterviewProfileSaved] = useState<boolean>(false);
  const [isTestConsoleOpen, setIsTestConsoleOpen] = useState<boolean>(true);
  const [activeTestCaseIndex, setActiveTestCaseIndex] = useState<number>(0);
  const [customTestCaseInput, setCustomTestCaseInput] = useState<string>("");

  const interviewSampleCases = useMemo(
    () =>
      extractThreeSampleCasesForProblem({
        slug: currentQuestion.id || currentQuestion.title.toLowerCase().replace(/\s+/g, "-"),
        title: currentQuestion.title,
        topics: currentQuestion.topic ? [currentQuestion.topic] : [],
        statement: currentQuestion.description,
        explicitExamples: currentQuestion.examples,
      }),
    [currentQuestion]
  );

  // 8. Proctoring & AI Camera State
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
    pendingStrikeModal: null,
  });

  const [cameraState, setCameraState] = useState<CameraTrackingState>({
    status: "ok",
    faceCount: 1,
    yawDegrees: 0,
    pitchDegrees: 0,
    isLookingAway: false,
    alertMessage: null,
  });
  const [isPipMinimized, setIsPipMinimized] = useState<boolean>(false);

  // 9. Results & Scorecard State
  const [isEvaluating, setIsEvaluating] = useState(false);
  const isEvaluatingRef = useRef<boolean>(false);
  isEvaluatingRef.current = isEvaluating;
  const [isGeneratingScorecard, setIsGeneratingScorecard] = useState(false);
  const [scorecard, setScorecard] = useState<InterviewScorecardResult | null>(null);
  const [activeTab, setActiveTab] = useState<"problem" | "chat" | "proctoring">("problem");
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [selectedScorecardQuestionIdx, setSelectedScorecardQuestionIdx] = useState<number>(0);
  const [selectedScorecardTier, setSelectedScorecardTier] = useState<SolutionTier>("optimal");
  const [showScorecardTranscript, setShowScorecardTranscript] = useState<boolean>(false);
  const [copiedReferenceCode, setCopiedReferenceCode] = useState<boolean>(false);

  // 10. Phase 5: Practice vs. Proctored Mode, Complexity Self-Check, Scratchpad & History Vault
  const [interviewMode, setInterviewMode] = useState<InterviewSessionMode>("proctored");
  const [claimedTimeComplexity, setClaimedTimeComplexity] = useState<string>("O(N^2)");
  const [claimedSpaceComplexity, setClaimedSpaceComplexity] = useState<string>("O(1)");
  const [isScratchpadOpen, setIsScratchpadOpen] = useState<boolean>(false);
  const [scratchpadNotes, setScratchpadNotes] = useState<string>("");
  const [interviewHistory, setInterviewHistory] = useState<SavedInterviewHistoryItem[]>([]);

  // Setup permissions state
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [agreeToRules, setAgreeToRules] = useState(false);
  const [isInsideIframe, setIsInsideIframe] = useState<boolean>(false);
  const [selectedBrowserTab, setSelectedBrowserTab] = useState<"chrome" | "edge" | "safari" | "firefox">("chrome");
  const [showBrowserGuide, setShowBrowserGuide] = useState<boolean>(true);
  const [isProbingDevices, setIsProbingDevices] = useState<boolean>(false);

  // Media Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const speechSynthRef = useRef<InterviewSpeechSynthesizer | null>(null);
  const audioTrackerRef = useRef<CandidateAudioTracker | null>(null);
  const proctoringEngineRef = useRef<InterviewProctoringEngine | null>(null);
  const cameraTrackerRef = useRef<InterviewCameraTracker | null>(null);
  const workspaceContainerRef = useRef<HTMLDivElement | null>(null);

  // Schedule hands-free turn-taking check when candidate pauses after speaking
  const scheduleHandsFreeTurnCheck = () => {
    if (silenceQuestionTimerRef.current) {
      clearTimeout(silenceQuestionTimerRef.current);
      silenceQuestionTimerRef.current = null;
    }

    if (
      stageRef.current !== "interviewing" ||
      !isHandsFreeRef.current ||
      interviewerStatusRef.current !== "idle" ||
      isEvaluatingRef.current ||
      isAskingInterviewerRef.current
    ) {
      return;
    }

    silenceQuestionTimerRef.current = setTimeout(() => {
      // Wait if the user is still mid-sentence (interim speech present)
      if (audioTrackerRef.current?.getInterimTranscript()) {
        scheduleHandsFreeTurnCheck();
        return;
      }

      const bufferedSpeech = pendingVoiceQueryRef.current.trim();
      const wordCount = bufferedSpeech.split(/\s+/).filter(Boolean).length;

      if (
        stageRef.current === "interviewing" &&
        isHandsFreeRef.current &&
        interviewerStatusRef.current === "idle" &&
        !isEvaluatingRef.current &&
        !isAskingInterviewerRef.current &&
        wordCount >= 4
      ) {
        pendingVoiceQueryRef.current = "";
        handleSendQueryRef.current?.(bufferedSpeech, { fromVoice: true });
      }
    }, 1650);
  };

  // Initialize Engines & Voice Services
  useEffect(() => {
    speechSynthRef.current = new InterviewSpeechSynthesizer();
    audioTrackerRef.current = new CandidateAudioTracker();
    cameraTrackerRef.current = new InterviewCameraTracker();

    // Populate voices
    const timer = setTimeout(() => {
      if (speechSynthRef.current) {
        const voices = speechSynthRef.current.getAvailableVoices();
        setAvailableVoices(voices);
        if (voices.length > 0 && !selectedVoiceURI) {
          const neural = voices.find((v) => v.isNeural) || voices[0]!;
          setSelectedVoiceURI(neural.uri);
          speechSynthRef.current.setVoiceByURI(neural.uri);
        }
      }
    }, 400);

    // Check if LiveKit Cloud credentials are configured in server environment
    apiGetLiveKitToken()
      .then((res) => {
        if (res?.configured) {
          setLivekitCloudActive(true);
        }
      })
      .catch(() => {
        // Fallback silently to browser neural voice
      });

    // Audio tracker callbacks
    audioTrackerRef.current.onVolumeUpdate = (vol) => {
      setCandidateVolume(vol);
    };

    audioTrackerRef.current.onRecognitionStatusChange = (status, msg) => {
      setSpeechRecStatus(status);
      setSpeechRecMessage(msg || "");
    };

    audioTrackerRef.current.onInterimUpdate = (interimText) => {
      setLiveInterimSpeech(interimText);
      // Reset silence timer while the candidate is actively speaking words
      if (interimText && silenceQuestionTimerRef.current) {
        clearTimeout(silenceQuestionTimerRef.current);
        silenceQuestionTimerRef.current = null;
      }
    };

    audioTrackerRef.current.onFinalSegment = (finalSegment, fullTranscript) => {
      setCandidateTranscript(fullTranscript);
      setLiveInterimSpeech("");

      if (!finalSegment || stageRef.current !== "interviewing") {
        return;
      }

      // Append only finalized segment to conversational feed (no interim stuttering!)
      setConversationalChat((prev) => {
        const last = prev[prev.length - 1];
        if (
          last &&
          last.speaker === "candidate" &&
          last.type === "speech" &&
          Date.now() - Number(last.id) < 6000
        ) {
          return [
            ...prev.slice(0, -1),
            {
              ...last,
              id: Date.now().toString(),
              text: `${last.text} ${finalSegment}`.trim(),
            },
          ];
        }
        return [
          ...prev,
          {
            id: Date.now().toString(),
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            speaker: "candidate",
            text: finalSegment,
            type: "speech",
          },
        ];
      });

      // Accumulate finalized speech for hands-free turn-taking
      pendingVoiceQueryRef.current = `${pendingVoiceQueryRef.current} ${finalSegment}`.trim();
      scheduleHandsFreeTurnCheck();
    };

    // Camera tracker callbacks
    cameraTrackerRef.current.onStatusChange = (camState) => {
      setCameraState(camState);
    };

    cameraTrackerRef.current.onViolation = (_camStatus, alertMsg) => {
      if (proctoringEngineRef.current) {
        proctoringEngineRef.current.recordCameraViolation(alertMsg);
      }
      toast.warning(`Camera Proctoring Alert: ${alertMsg}`, { duration: 4000 });
    };

    // Proctoring Engine
    proctoringEngineRef.current = new InterviewProctoringEngine(
      (updatedState) => {
        setProctoringState(updatedState);
        if (updatedState.pendingStrikeModal?.isOpen) {
          setStrikeModal(updatedState.pendingStrikeModal);
        }
      },
      (strikeNumber, reason) => {
        toast.error(`⚠️ Proctoring Strike ${strikeNumber}/3: ${reason}`, { duration: 7000 });
        if (speechSynthRef.current && !isMuted) {
          audioTrackerRef.current?.setTtsSpeaking(true);
          speechSynthRef.current.speak(
            `Integrity alert. Strike ${strikeNumber} recorded. Please remain inside full screen.`,
            {
              onStart: () => audioTrackerRef.current?.setTtsSpeaking(true),
              onEnd: () => audioTrackerRef.current?.setTtsSpeaking(false),
              onError: () => audioTrackerRef.current?.setTtsSpeaking(false),
            }
          );
        }
      },
      (termReason) => {
        handleAutoTerminate(termReason);
      }
    );

    // Iframe detection
    if (typeof window !== "undefined") {
      try {
        setIsInsideIframe(window.self !== window.top);
      } catch {
        setIsInsideIframe(true);
      }
    }
    checkHardwarePermissions();
    listMediaDevices().then(({ microphones, cameras }) => {
      setAvailableMics(microphones);
      setAvailableCameras(cameras);
    });

    return () => {
      clearTimeout(timer);
      if (silenceQuestionTimerRef.current) {
        clearTimeout(silenceQuestionTimerRef.current);
      }
      speechSynthRef.current?.stop();
      audioTrackerRef.current?.stopTracking();
      cameraTrackerRef.current?.stopTracking();
      proctoringEngineRef.current?.stopProctoring();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Phase 5: Load saved interview history from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(INTERVIEW_HISTORY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setInterviewHistory(parsed);
        }
      }
    } catch {
      // Ignore storage read errors
    }
  }, []);

  // Update question queue when template, company filter, or topic filter changes
  useEffect(() => {
    const queue = getQuestionQueueForTemplate(selectedTemplateId, {
      company: selectedCompanyFilter,
      topic: selectedTopicFilter,
    });
    setQuestionQueue(queue);
    setActiveQueueIndex(0);
    setPerQuestionSecondsLeft(selectedTemplate.perQuestionMinutes * 60);
    setTotalSessionSecondsLeft(selectedTemplate.totalMinutes * 60);
  }, [selectedTemplateId, selectedCompanyFilter, selectedTopicFilter]);

  const handleReshuffleQueue = () => {
    const queue = getQuestionQueueForTemplate(selectedTemplateId, {
      company: selectedCompanyFilter,
      topic: selectedTopicFilter,
    });
    setQuestionQueue(queue);
    setActiveQueueIndex(0);
    toast.success("Interview question queue reshuffled!");
  };

  const prevSelectedLangRef = useRef<Language>(selectedLanguage);

  // Load starter code for current question, tier, and language
  useEffect(() => {
    if (!currentQuestion) return;
    const langChanged = prevSelectedLangRef.current !== selectedLanguage;
    prevSelectedLangRef.current = selectedLanguage;

    const starter = getTierStarterCode(currentQuestion, currentTier, selectedLanguage);
    if (langChanged) {
      setCode(starter);
      setTierCodes({
        bruteForce: getTierStarterCode(currentQuestion, "bruteForce", selectedLanguage),
        better: getTierStarterCode(currentQuestion, "better", selectedLanguage),
        optimal: getTierStarterCode(currentQuestion, "optimal", selectedLanguage),
      });
    } else {
      setCode((prev) => {
        if (!prev || prev.includes("Step 1:") || prev.includes("Phase:")) {
          return starter;
        }
        return tierCodes[currentTier] || starter;
      });
      setTierCodes((prev) => ({
        ...prev,
        [currentTier]: prev[currentTier] || starter,
      }));
    }

    setClaimedTimeComplexity(currentQuestion.tierDetails[currentTier].targetTime);
    setClaimedSpaceComplexity(currentQuestion.tierDetails[currentTier].targetSpace);
  }, [currentQuestion, currentTier, selectedLanguage]);

  // Dual Countdown Timers
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (stage === "interviewing") {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);

        setPerQuestionSecondsLeft((prev) => {
          if (prev <= 1) {
            // Per-question countdown reached 00:00! Auto-advance to next question
            toast.warning(`Time is up for Question #${activeQueueIndex + 1}! Auto-advancing...`, {
              duration: 5000,
            });
            handleNextQuestion(true);
            return selectedTemplate.perQuestionMinutes * 60;
          }
          return prev - 1;
        });

        setTotalSessionSecondsLeft((prev) => {
          if (prev <= 1) {
            toast.error("Total interview session duration reached! Finalizing scorecard...", {
              duration: 6000,
            });
            handleConcludeInterview();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [stage, activeQueueIndex, selectedTemplate]);

  // Hardware Permissions Probing
  const checkHardwarePermissions = async () => {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return;
    try {
      const cam = await navigator.permissions.query({ name: "camera" as any });
      if (cam.state === "granted") setHasCameraPermission(true);
      else if (cam.state === "denied") setHasCameraPermission(false);
    } catch {}

    try {
      const mic = await navigator.permissions.query({ name: "microphone" as any });
      if (mic.state === "granted") setHasMicPermission(true);
      else if (mic.state === "denied") setHasMicPermission(false);
    } catch {}
  };

  const openInStandaloneTab = () => {
    if (typeof window !== "undefined") {
      window.open(window.location.href, "_blank", "noopener,noreferrer");
    }
  };

  const requestMediaPermissions = async (overrideMicId?: string, overrideCamId?: string) => {
    setIsProbingDevices(true);
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("getUserMedia not supported");
      }

      // Stop previous tracks if switching devices
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const activeMic = overrideMicId ?? selectedMicId;
      const activeCam = overrideCamId ?? selectedCameraId;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: activeCam
          ? { deviceId: { exact: activeCam }, width: { ideal: 640 }, height: { ideal: 480 } }
          : { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: activeMic
          ? {
              deviceId: { exact: activeMic },
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          : {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
      });

      streamRef.current = stream;
      setHasCameraPermission(true);
      setHasMicPermission(true);
      setIsMicMuted(false);

      // Refresh labeled device list now that permissions are granted
      const { microphones, cameras } = await listMediaDevices();
      setAvailableMics(microphones);
      setAvailableCameras(cameras);

      const currentAudioTrack = stream.getAudioTracks()[0];
      const currentVideoTrack = stream.getVideoTracks()[0];
      if (!activeMic && currentAudioTrack?.getSettings()?.deviceId) {
        setSelectedMicId(currentAudioTrack.getSettings().deviceId || "");
      }
      if (!activeCam && currentVideoTrack?.getSettings()?.deviceId) {
        setSelectedCameraId(currentVideoTrack.getSettings().deviceId || "");
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      if (audioTrackerRef.current) {
        await audioTrackerRef.current.startTracking(stream);
      }

      toast.success("Camera and live microphone stream verified!");
    } catch {
      setHasCameraPermission(false);
      setHasMicPermission(false);
      setShowBrowserGuide(true);
      toast.error("Permissions error. Please allow Camera & Mic in browser settings.");
    } finally {
      setIsProbingDevices(false);
    }
  };

  const handleMicDeviceChange = async (newMicId: string) => {
    setSelectedMicId(newMicId);
    if (hasMicPermission) {
      await requestMediaPermissions(newMicId, selectedCameraId);
    }
  };

  const handleCameraDeviceChange = async (newCamId: string) => {
    setSelectedCameraId(newCamId);
    if (hasCameraPermission) {
      await requestMediaPermissions(selectedMicId, newCamId);
    }
  };

  // Coordinated AI Interviewer TTS helper with automatic microphone echo suppression
  const speakInterviewerText = (text: string) => {
    setInterviewerSpeechText(text);
    if (isMuted || !speechSynthRef.current) {
      setInterviewerStatus("idle");
      audioTrackerRef.current?.setTtsSpeaking(false);
      return;
    }

    setInterviewerStatus("speaking");
    audioTrackerRef.current?.setTtsSpeaking(true);

    speechSynthRef.current.speak(text, {
      onStart: () => {
        setInterviewerStatus("speaking");
        audioTrackerRef.current?.setTtsSpeaking(true);
      },
      onEnd: () => {
        audioTrackerRef.current?.setTtsSpeaking(false);
        setInterviewerStatus("idle");
      },
      onError: () => {
        audioTrackerRef.current?.setTtsSpeaking(false);
        setInterviewerStatus("idle");
      },
    });
  };

  const handleInterruptInterviewer = () => {
    speechSynthRef.current?.stop();
    audioTrackerRef.current?.setTtsSpeaking(false);
    setInterviewerStatus("idle");
  };

  const handleToggleAiVoiceMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    speechSynthRef.current?.setMuted(nextMuted);
    if (nextMuted) {
      audioTrackerRef.current?.setTtsSpeaking(false);
      if (interviewerStatus === "speaking") {
        setInterviewerStatus("idle");
      }
    }
  };

  const handleToggleMicMute = () => {
    const nextMicMuted = !isMicMuted;
    setIsMicMuted(nextMicMuted);
    audioTrackerRef.current?.setMicMuted(nextMicMuted);
    if (nextMicMuted && silenceQuestionTimerRef.current) {
      clearTimeout(silenceQuestionTimerRef.current);
      silenceQuestionTimerRef.current = null;
    }
    toast.info(nextMicMuted ? "Microphone muted" : "Microphone unmuted — listening");
  };

  const handleVoiceChange = (uri: string) => {
    setSelectedVoiceURI(uri);
    if (speechSynthRef.current) {
      speechSynthRef.current.setVoiceByURI(uri);
    }
  };

  const handleTestVoice = () => {
    speakInterviewerText(
      "Hello! I am your AI Technical Interviewer. I will be evaluating your problem solving and code complexity."
    );
  };

  // Start the interview (Strict Proctored Mode or Guided Practice Mode)
  const handleStartInterview = async () => {
    if (interviewMode === "proctored") {
      if (!hasCameraPermission || !hasMicPermission) {
        setShowBrowserGuide(true);
        toast.error("Webcam and microphone permissions are required for Strict Proctored Mode (or switch to Guided Practice Mode).");
        return;
      }
      if (!agreeToRules) {
        toast.error("Please agree to the anti-cheat guidelines.");
        return;
      }
    }

    pendingVoiceQueryRef.current = "";
    setLiveInterimSpeech("");
    setStage("interviewing");
    setElapsedSeconds(0);
    setActiveQueueIndex(0);
    setCurrentTier("bruteForce");
    setPerQuestionSecondsLeft(selectedTemplate.perQuestionMinutes * 60);
    setTotalSessionSecondsLeft(selectedTemplate.totalMinutes * 60);

    // Start strict proctoring with fullscreen only when in Strict Proctored Mode
    if (interviewMode === "proctored" && proctoringEngineRef.current) {
      await proctoringEngineRef.current.startProctoring(
        workspaceContainerRef.current || document.documentElement
      );
      proctoringEngineRef.current.setCameraStatus(true);
    }

    // Attach stream to video & start client-side camera tracker if camera stream is active
    setTimeout(() => {
      if (videoRef.current && streamRef.current && hasCameraPermission) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});

        if (cameraTrackerRef.current && overlayCanvasRef.current) {
          cameraTrackerRef.current.startTracking(videoRef.current, overlayCanvasRef.current);
        }
      }
    }, 200);

    // Initial interviewer greeting
    const modeNote =
      interviewMode === "practice"
        ? "You are in Guided Practice & Coaching Mode—feel free to use the Dry-Run Scratchpad, Progressive Hints, and Socratic Coaching at your own pace."
        : "Strict proctoring is active. I will be tracking your code, complexity progression, and verbal explanations.";
    const greeting = `Welcome to your live interview for the ${selectedTemplate.title}. We have ${questionQueue.length} problem(s) queued. First up is "${currentQuestion.title}". ${modeNote} Let's begin by clarifying the input constraints or pitching your brute force baseline.`;
    setConversationalChat([
      {
        id: "msg-1",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        speaker: "interviewer",
        text: greeting,
        type: "greeting",
      },
    ]);

    speakInterviewerText(greeting);
  };

  // Phase 5: Seed Example 1 Trace Template into Dry-Run Scratchpad
  const handleSeedScratchpadTemplate = () => {
    const ex1 = currentQuestion.examples[0];
    const template = [
      `// Dry-Run & Pointer Trace Scratchpad — ${currentQuestion.title} (${currentTier})`,
      `// Claimed Complexity: Time ${claimedTimeComplexity}, Space ${claimedSpaceComplexity}`,
      ex1 ? `// Sample Input: ${ex1.input}` : `// Sample Input: ...`,
      ex1 ? `// Expected Output: ${ex1.output}` : `// Expected Output: ...`,
      ``,
      `Invariant / Core Idea:`,
      `- `,
      ``,
      `Step-by-Step Trace:`,
      `Step 0 (Init): `,
      `Step 1: `,
      `Step 2: `,
      ``,
      `Edge Cases Checked: [ ] Empty/Min Input  [ ] Duplicates  [ ] Boundary Indices`,
    ].join("\n");
    setScratchpadNotes(template);
    setIsScratchpadOpen(true);
    toast.success("Loaded Example 1 dry-run trace template into Scratchpad!");
  };

  // Phase 5: Ask AI Interviewer to verify the candidate's Dry-Run Scratchpad
  const handleVerifyScratchpadWithAi = async () => {
    if (!scratchpadNotes.trim()) {
      toast.info("Write a brief pointer trace or invariant in the scratchpad first.");
      return;
    }
    setActiveTab("chat");
    setInterviewFlowStage("verify");
    await handleSendConversationalQuery(
      `Here is my dry-run trace and invariant notes from my scratchpad (claiming ${claimedTimeComplexity} time, ${claimedSpaceComplexity} space):\n"${scratchpadNotes.slice(0, 400)}"\nDoes my trace hold on boundary cases?`,
      {
        coachingAction: "dry_run",
        candidateLabel: "Verify Scratchpad Trace",
      }
    );
  };

  // Handle Code Change
  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || "";
    setCode(newCode);
    setTierCodes((prev) => ({
      ...prev,
      [currentTier]: newCode,
    }));
  };

  // FEATURE 1: Submit Current Tier & Auto-Switch State Machine
  const handleSubmitTier = async () => {
    if (isEvaluating) return;

    if (!code.trim() || code.length < 25) {
      toast.warning("Please write an implementation before submitting this tier.");
      return;
    }

    // Flush any pending interim speech before submitting
    audioTrackerRef.current?.flushInterimAsFinal();
    speechSynthRef.current?.stop();
    audioTrackerRef.current?.setTtsSpeaking(false);

    setIsEvaluating(true);
    setInterviewerStatus("evaluating");
    setIsTestConsoleOpen(true);
    setActiveDrawerTab("submission");
    setInterviewProfileSaved(false);

    const baseTranscript = audioTrackerRef.current?.getLiveTranscript() || candidateTranscript;
    const enrichedTranscript = [
      baseTranscript,
      `[Candidate Complexity Self-Check: Claimed Time = ${claimedTimeComplexity}, Claimed Space = ${claimedSpaceComplexity}]`,
      scratchpadNotes.trim() ? `[Candidate Dry-Run Scratchpad: ${scratchpadNotes.trim().slice(0, 300)}]` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const questionSlug = currentQuestion.id || currentQuestion.title.toLowerCase().replace(/\s+/g, "-");

    const evalPromise = apiInterviewEvaluate({
      question: currentQuestion,
      tier: currentTier,
      code,
      language: selectedLanguage,
      transcript: enrichedTranscript,
      previousTiers: tiersCompleted,
    });

    const judgeSubmitPromise = apiSubmitProblemCode({
      slug: questionSlug,
      title: currentQuestion.title,
      difficulty: currentQuestion.difficulty,
      topics: currentQuestion.topic ? [currentQuestion.topic] : [],
      statement: currentQuestion.description,
      code,
      language: selectedLanguage,
    }).catch(() => null);

    toast.promise(evalPromise, {
      loading: `Running Stress Judge Suite & evaluating ${currentTier === "bruteForce" ? "Brute Force" : currentTier === "better" ? "Better" : "Optimal"} approach...`,
      success: "Judge & Interviewer evaluation complete!",
      error: "Evaluation service notice. Applying heuristic audit...",
    });

    try {
      const [result, submitVerdict] = await Promise.all([evalPromise, judgeSubmitPromise]);
      if (submitVerdict) {
        setLeetSubmitResult(submitVerdict);
        const histEntry: LeetCodeSubmissionHistoryEntry = {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
          status: submitVerdict.status,
          language: selectedLanguage,
          runtimeMs: submitVerdict.runtimeMs,
          memoryMb: submitVerdict.memoryMb,
          passedCases: submitVerdict.passedCases,
          totalCases: submitVerdict.totalCases,
          timeComplexity: submitVerdict.timeComplexity,
          spaceComplexity: submitVerdict.spaceComplexity,
          code,
          verdict: submitVerdict,
        };
        setInterviewSubmissionHistory((prev) => [histEntry, ...prev].slice(0, 15));
      }
      setTierEvaluations((prev) => ({
        ...prev,
        [currentTier]: result,
      }));

      // Save to user profile if Accepted or Optimal tier passed
      if ((result.passed || submitVerdict?.status === "Accepted") && user && token) {
        try {
          const saveRes = await fetch("/api/submissions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              slug: questionSlug,
              title: currentQuestion.title,
              difficulty: currentQuestion.difficulty,
              code: code.trim(),
              language: selectedLanguage,
              status: currentTier === "optimal" ? "Optimal" : result.tierClassification || "Good",
              review: submitVerdict
                ? `${submitVerdict.summaryMessage} • Runtime: ${submitVerdict.runtimeMs} ms (Beats ${submitVerdict.runtimePercentile}%). ${result.writtenNotes}`
                : result.writtenNotes,
              complexity: {
                time: result.timeComplexity || submitVerdict?.timeComplexity || claimedTimeComplexity,
                space: result.spaceComplexity || submitVerdict?.spaceComplexity || claimedSpaceComplexity,
              },
            }),
          });
          if (saveRes.ok) {
            setInterviewProfileSaved(true);
          }
        } catch {
          // non-blocking profile save
        }
      }

      // Append interviewer spoken feedback to chat
      if (result.spokenFeedback) {
        setConversationalChat((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            speaker: "interviewer",
            text: result.spokenFeedback,
            type: "evaluation",
          },
        ]);

        speakInterviewerText(result.spokenFeedback);
      }

      if (result.passed) {
        setTiersCompleted((prev) => ({
          ...prev,
          [currentTier]: true,
        }));

        // Determine next complexity tier & transition
        let next: SolutionTier | null = null;
        const prevComp = currentQuestion.tierDetails[currentTier].targetTime;
        let newComp = "";

        if (currentTier === "bruteForce") {
          next = "better";
          newComp = currentQuestion.tierDetails.better.targetTime;
        } else if (currentTier === "better") {
          next = "optimal";
          newComp = currentQuestion.tierDetails.optimal.targetTime;
        }

        // Trigger Celebratory Modal & Auto-Switch
        setCelebrationModal({
          isOpen: true,
          completedTier: currentTier,
          nextTier: next,
          prevComplexity: prevComp,
          newComplexity: newComp || prevComp,
          feedback: result.writtenNotes,
        });

        if (next) {
          setCurrentTier(next);
          setInterviewFlowStage("approach");
          setLiveDetectedComplexity(null);
          const nextStarter = getTierStarterCode(currentQuestion, next, selectedLanguage);
          if (!tierCodes[next] || tierCodes[next].length < 15) {
            setCode(nextStarter);
            setTierCodes((prev) => ({ ...prev, [next!]: nextStarter }));
          } else {
            setCode(tierCodes[next]);
          }
          toast.success(`Milestone reached! Unlocked ${next.toUpperCase()} complexity tier.`);
        } else {
          setInterviewFlowStage("verify");
          toast.success("Peak optimal complexity invariant achieved & saved to profile!");
        }
      } else {
        setInterviewFlowStage("verify");
        toast.error("Solution requires refinement. Inspect the Judge Verdict & failing testcase below.");
      }
    } catch (err: any) {
      console.warn("Evaluation notice:", err);
    } finally {
      setIsEvaluating(false);
    }
  };

  // FEATURE 2: Next Question in Timed Queue
  const handleNextQuestion = (_isTimerTriggered = false) => {
    const snapshot: QuestionSubmissionSnapshot = {
      questionId: currentQuestion.id,
      questionTitle: currentQuestion.title,
      timeSpentSeconds: selectedTemplate.perQuestionMinutes * 60 - perQuestionSecondsLeft,
      tiersCompleted: { ...tiersCompleted },
      tierCodes: { ...tierCodes },
      tierEvaluations: { ...tierEvaluations },
      scorecardPartial: {
        passedTiers: Object.values(tiersCompleted).filter(Boolean).length,
        highestTierReached: tiersCompleted.optimal ? "optimal" : tiersCompleted.better ? "better" : "bruteForce",
      },
    };

    setQuestionSubmissions((prev) => [...prev, snapshot]);

    if (activeQueueIndex + 1 < questionQueue.length) {
      const nextIdx = activeQueueIndex + 1;
      const nextQ = questionQueue[nextIdx]!;
      setActiveQueueIndex(nextIdx);
      setPerQuestionSecondsLeft(selectedTemplate.perQuestionMinutes * 60);

      // Reset tier & coaching state for the new question
      setCurrentTier("bruteForce");
      setTiersCompleted({ bruteForce: false, better: false, optimal: false });
      setTierEvaluations({ bruteForce: null, better: null, optimal: null });
      setInterviewFlowStage("clarify");
      setHintLevelByTier({ bruteForce: 0, better: 0, optimal: 0 });
      setUnlockedHintsByTier({ bruteForce: [], better: [], optimal: [] });
      setLiveDetectedComplexity(null);
      setSampleTestResult(null);
      setLeetRunResult(null);
      setLeetSubmitResult(null);
      setInterviewProfileSaved(false);
      setActiveDrawerTab("testcase");
      setActiveTestCaseIndex(0);

      const starter = getTierStarterCode(nextQ, "bruteForce", selectedLanguage);
      setCode(starter);
      setTierCodes({ bruteForce: starter, better: "", optimal: "" });

      const promptMsg = `Transitioning to Question #${nextIdx + 1}: "${nextQ.title}". You have ${selectedTemplate.perQuestionMinutes} minutes. Begin by clarifying constraints or pitching your brute force baseline.`;
      speakInterviewerText(promptMsg);
      toast.info(`Switched to Question #${nextIdx + 1}: ${nextQ.title}`);
    } else {
      toast.success("All questions in the interview queue completed! Finalizing evaluation...");
      handleConcludeInterview();
    }
  };

  // Phase 3: Run 3 Sample Tests & Custom Input in Live Interview Console
  const handleRunSampleTests = async () => {
    if (isRunningSampleTests) return;
    setIsRunningSampleTests(true);
    setIsTestConsoleOpen(true);
    setActiveDrawerTab("result");

    try {
      const questionSlug =
        currentQuestion.id || currentQuestion.title.toLowerCase().replace(/\s+/g, "-");
      const judgeRes = await apiRunProblemTests({
        slug: questionSlug,
        title: currentQuestion.title,
        difficulty: currentQuestion.difficulty,
        topics: currentQuestion.topic ? [currentQuestion.topic] : [],
        statement: currentQuestion.description,
        code,
        language: selectedLanguage,
        sampleCases: interviewSampleCases,
        customInput: customTestCaseInput.trim() || undefined,
      });

      setLeetRunResult(judgeRes);

      // Keep sampleTestResult synced for AI Interviewer debug button
      setSampleTestResult({
        status:
          judgeRes.status === "Accepted"
            ? "passed"
            : judgeRes.status === "Compile Error" || judgeRes.status === "Runtime Error"
            ? "compile_error"
            : judgeRes.status === "Starter Template"
            ? "incomplete"
            : "failed",
        summaryMessage: judgeRes.summaryMessage,
        compilerOutput: judgeRes.compilerOutput,
        estimatedTimeComplexity: judgeRes.estimatedTimeComplexity,
        estimatedSpaceComplexity: judgeRes.estimatedSpaceComplexity,
        passedCount: judgeRes.passedCount,
        totalCount: judgeRes.totalCount,
        cases: judgeRes.cases.map((c) => ({
          caseIndex: c.caseNumber,
          input: c.input,
          expectedOutput: c.expectedOutput,
          actualOutput: c.actualOutput,
          passed: c.passed,
          runtimeMs: c.runtimeMs,
          explanation: c.explanation || c.diffHint,
          isCustom: c.isCustom,
        })),
      });

      if (
        judgeRes.estimatedTimeComplexity &&
        judgeRes.estimatedTimeComplexity !== "Incomplete"
      ) {
        setLiveDetectedComplexity({
          time: judgeRes.estimatedTimeComplexity,
          space: judgeRes.estimatedSpaceComplexity || "O(1)",
        });
      }

      if (judgeRes.status === "Accepted") {
        setInterviewFlowStage("verify");
        setActiveTestCaseIndex(0);
        toast.success(`All ${judgeRes.totalCount} sample test cases passed!`);
      } else if (
        judgeRes.status === "Compile Error" ||
        judgeRes.status === "Runtime Error"
      ) {
        toast.error(judgeRes.summaryMessage || "Compilation / runtime error detected.");
      } else if (judgeRes.status === "Starter Template") {
        toast.info("Implement your solution body first before running sample tests.");
      } else {
        const firstFailedIdx = judgeRes.cases.findIndex((c) => !c.passed);
        if (firstFailedIdx >= 0) setActiveTestCaseIndex(firstFailedIdx);
        toast.warning(`${judgeRes.passedCount}/${judgeRes.totalCount} sample test cases passed.`);
      }
    } catch {
      toast.error("Could not run sample tests right now. Please try again.");
    } finally {
      setIsRunningSampleTests(false);
    }
  };

  const handleAskAiAboutTestResult = async () => {
    if (!sampleTestResult) return;
    setActiveTab("chat");

    if (sampleTestResult.status === "compile_error") {
      await handleSendConversationalQuery(
        `My ${selectedLanguage} code produced this compilation error: "${(sampleTestResult.compilerOutput || "").slice(0, 220)}". Can you give me a Socratic nudge on what syntax or type issue to fix?`,
        {
          coachingAction: "dry_run",
          candidateLabel: "Debug Compile Error",
        }
      );
      return;
    }

    const failingCase = sampleTestResult.cases.find((c) => !c.passed) || sampleTestResult.cases[0];
    if (failingCase) {
      await handleSendConversationalQuery(
        `On sample Case #${failingCase.caseIndex} (${failingCase.input}), expected "${failingCase.expectedOutput}" but my code produced "${failingCase.actualOutput}". Can we trace where my invariant diverges?`,
        {
          coachingAction: "dry_run",
          candidateLabel: `Debug Case #${failingCase.caseIndex}`,
        }
      );
    }
  };

  // Progressive 3-Level Socratic Hint Ladder
  const handleAskHint = async () => {
    const currentLevel = hintLevelByTier[currentTier] || 0;
    const nextLevel = Math.min(3, currentLevel + 1);
    const tierLabel =
      currentTier === "bruteForce" ? "Brute Force" : currentTier === "better" ? "Better" : "Optimal";
    const levelLabel =
      nextLevel === 1
        ? "Level 1/3 (Conceptual Nudge)"
        : nextLevel === 2
        ? "Level 2/3 (Pattern & Data Structure Clue)"
        : "Level 3/3 (Invariant & Boundary Blueprint)";

    await handleSendConversationalQuery(
      `Can I get ${levelLabel} for my ${tierLabel} approach?`,
      {
        coachingAction: "progressive_hint",
        hintLevel: nextLevel,
        candidateLabel: `Requested ${levelLabel}`,
      }
    );
  };

  // Interactive Socratic Coaching Quick-Actions
  const handleCoachingQuickAction = async (action: InterviewerCoachingAction) => {
    if (action === "progressive_hint") {
      await handleAskHint();
      return;
    }

    // Flush any live interim speech so Pitch Approach captures what the user just said
    audioTrackerRef.current?.flushInterimAsFinal();
    const recentVoice =
      pendingVoiceQueryRef.current.trim() ||
      [...conversationalChat]
        .reverse()
        .find((m) => m.speaker === "candidate")?.text ||
      "";

    if (action === "clarify_constraints") {
      setInterviewFlowStage("clarify");
      await handleSendConversationalQuery(
        `Can we clarify the input constraints, bounds, and any edge cases (such as duplicates, negative values, or minimal inputs) for ${currentQuestion.title}?`,
        {
          coachingAction: "clarify_constraints",
          candidateLabel: "Clarify Constraints & Edge Cases",
        }
      );
      return;
    }

    if (action === "pitch_approach") {
      setInterviewFlowStage("approach");
      const pitchText =
        recentVoice.length > 12
          ? `Here is my approach for the ${currentTier} tier: "${recentVoice}". Does this invariant and complexity target look solid before I code it out?`
          : `I want to pitch my ${currentTier} approach targeting ${currentQuestion.tierDetails[currentTier].targetTime} time and ${currentQuestion.tierDetails[currentTier].targetSpace} space. What key invariant should I confirm before coding?`;
      await handleSendConversationalQuery(pitchText, {
        coachingAction: "pitch_approach",
        candidateLabel: "Pitch My Approach",
      });
      return;
    }

    if (action === "dry_run") {
      setInterviewFlowStage("verify");
      const ex1 = currentQuestion.examples[0];
      await handleSendConversationalQuery(
        `Let's dry-run my current ${selectedLanguage} code against Example 1 (${ex1 ? `Input: ${ex1.input}` : "sample input"}) and check for any boundary or off-by-one issues.`,
        {
          coachingAction: "dry_run",
          candidateLabel: "Dry-Run Trace on Example 1",
        }
      );
      return;
    }

    if (action === "complexity_check") {
      await handleSendConversationalQuery(
        `Can you evaluate the current time and space complexity of my code in the editor compared to our ${currentQuestion.tierDetails[currentTier].targetTime} target?`,
        {
          coachingAction: "complexity_check",
          candidateLabel: "Check Time & Space Complexity",
        }
      );
    }
  };

  // Instant Push-to-Send for Live Voice Input
  const handleSendSpokenThoughtNow = async () => {
    if (silenceQuestionTimerRef.current) {
      clearTimeout(silenceQuestionTimerRef.current);
      silenceQuestionTimerRef.current = null;
    }

    // Flush any live interim speech into final segment first
    audioTrackerRef.current?.flushInterimAsFinal();

    const buffered = pendingVoiceQueryRef.current.trim();
    const lastCandidateMsg = [...conversationalChat]
      .reverse()
      .find((m) => m.speaker === "candidate")?.text;

    const spokenToSend = buffered || lastCandidateMsg || "";
    if (!spokenToSend) {
      toast.info("Speak into your microphone first, or click one of the Coaching Quick-Actions.");
      return;
    }

    pendingVoiceQueryRef.current = "";
    await handleSendConversationalQuery(spokenToSend, { fromVoice: true });
  };

  // FEATURE 3 & 8: Conversational Interaction & Socratic Coaching with AI Interviewer
  const handleSendConversationalQuery = async (
    queryText?: string,
    options?: {
      fromVoice?: boolean;
      coachingAction?: InterviewerCoachingAction;
      hintLevel?: number;
      candidateLabel?: string;
    }
  ) => {
    const textToSend = (queryText || customQuestionInput).trim();
    if (!textToSend || isAskingInterviewerRef.current) return;

    if (silenceQuestionTimerRef.current) {
      clearTimeout(silenceQuestionTimerRef.current);
      silenceQuestionTimerRef.current = null;
    }
    pendingVoiceQueryRef.current = "";

    setIsAskingInterviewer(true);
    if (!queryText) {
      setCustomQuestionInput("");
    }

    // Only append a new candidate bubble if typed manually or triggered via coaching chip
    if (!options?.fromVoice) {
      setConversationalChat((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          speaker: "candidate",
          text: options?.candidateLabel ? `[${options.candidateLabel}] ${textToSend}` : textToSend,
          type: options?.coachingAction ? "coaching" : "question",
          stage: interviewFlowStage,
          coachingAction: options?.coachingAction,
          hintLevel: options?.hintLevel,
        },
      ]);
    }

    try {
      const resp = await apiInterviewRespond({
        question: currentQuestion,
        tier: currentTier,
        code,
        language: selectedLanguage,
        candidateSpeech: textToSend,
        transcriptHistory: conversationalChat
          .slice(-8)
          .map((m) => `${m.speaker}: ${m.text}`)
          .join("\n"),
        interviewStage: interviewFlowStage,
        coachingAction: options?.coachingAction || "general",
        hintLevel: options?.hintLevel,
      });

      if (resp?.suggestedStage && resp.suggestedStage !== interviewFlowStage) {
        setInterviewFlowStage(resp.suggestedStage);
      }

      if (resp?.detectedComplexity?.time) {
        setLiveDetectedComplexity(resp.detectedComplexity);
      }

      if (options?.coachingAction === "progressive_hint" && options?.hintLevel && resp?.spokenText) {
        const level = options.hintLevel;
        setHintLevelByTier((prev) => ({
          ...prev,
          [currentTier]: Math.max(prev[currentTier] || 0, level),
        }));
        setUnlockedHintsByTier((prev) => {
          const existing = prev[currentTier] || [];
          const filtered = existing.filter((h) => h.level !== level);
          return {
            ...prev,
            [currentTier]: [
              ...filtered,
              {
                level,
                text: resp.spokenText,
                followUp: resp.followUpPrompt,
              },
            ].sort((a, b) => a.level - b.level),
          };
        });
      }

      if (resp?.spokenText) {
        setConversationalChat((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            speaker: "interviewer",
            text: resp.spokenText,
            type: options?.coachingAction === "progressive_hint" ? "hint" : "coaching",
            stage: resp.suggestedStage || interviewFlowStage,
            coachingAction: options?.coachingAction,
            followUpPrompt: resp.followUpPrompt,
            detectedComplexity: resp.detectedComplexity,
            hintLevel: options?.hintLevel,
          },
        ]);

        speakInterviewerText(resp.spokenText);
      }
    } catch {
      toast.error("Interviewer is listening, please continue with your invariant.");
    } finally {
      setIsAskingInterviewer(false);
    }
  };

  handleSendQueryRef.current = handleSendConversationalQuery;

  // FEATURE 4 & 5: Auto-Lockdown & Acknowledge Strike Modal
  const handleAcknowledgeStrike = async () => {
    setStrikeModal(null);
    if (proctoringEngineRef.current) {
      proctoringEngineRef.current.acknowledgeStrike();
    }
    // Re-request fullscreen on acknowledge
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {}
  };

  // Automatic Termination at 3 strikes
  const handleAutoTerminate = (reason: string) => {
    setStrikeModal({
      isOpen: true,
      strikeNumber: 3,
      reason,
      isTerminated: true,
    });
    handleConcludeInterview(true);
  };

  // Conclude Interview & Generate Multi-Question Scorecard
  const handleConcludeInterview = async (isViolationTerminated = false) => {
    setIsGeneratingScorecard(true);
    speechSynthRef.current?.stop();

    // High quality audio retention retrieval
    let audioUrl: string | null = null;
    if (audioTrackerRef.current) {
      audioUrl = audioTrackerRef.current.getRecordedAudioUrl();
      setRecordedAudioUrl(audioUrl);
    }

    let confReport: ConfidenceReport = {
      overallConfidenceScore: 8.5,
      vocalSteadinessScore: 8.5,
      fluencyScore: 8.5,
      articulationScore: 8.5,
      wordsPerMinute: 110,
      totalSpokenSeconds: elapsedSeconds,
      totalWordsSpoken: candidateTranscript.split(/\s+/).length,
      fillerWordCount: 2,
      fillerWordsDetected: ["like", "um"],
      hesitationPauses: 1,
      feedbackSummary: "Good vocal presence and methodical progression.",
    };

    if (audioTrackerRef.current) {
      confReport = audioTrackerRef.current.calculateReport();
    }

    const currentProctoring = proctoringEngineRef.current?.getState() || proctoringState;

    const completedList = Object.entries(tiersCompleted)
      .filter(([_, passed]) => passed)
      .map(([tier]) => tier);

    // Save final active question snapshot
    const finalSnapshot: QuestionSubmissionSnapshot = {
      questionId: currentQuestion.id,
      questionTitle: currentQuestion.title,
      timeSpentSeconds: Math.max(0, selectedTemplate.perQuestionMinutes * 60 - perQuestionSecondsLeft),
      tiersCompleted: { ...tiersCompleted },
      tierCodes: { ...tierCodes },
      tierEvaluations: { ...tierEvaluations },
    };
    const allSubmissions = [...questionSubmissions, finalSnapshot];

    // Aggregate completed tiers across all questions in the queue
    const allCompletedTiers = Array.from(
      new Set([
        ...completedList,
        ...(allSubmissions.some((s) => s.tiersCompleted.bruteForce) ? ["bruteForce"] : []),
        ...(allSubmissions.some((s) => s.tiersCompleted.better) ? ["better"] : []),
        ...(allSubmissions.some((s) => s.tiersCompleted.optimal) ? ["optimal"] : []),
      ])
    );

    setSelectedScorecardQuestionIdx(Math.max(0, allSubmissions.length - 1));
    setSelectedScorecardTier(
      tiersCompleted.optimal ? "optimal" : tiersCompleted.better ? "better" : "bruteForce"
    );

    const persistScorecardToHistory = (finalCard: InterviewScorecardResult) => {
      try {
        const entry: SavedInterviewHistoryItem = {
          id: `session-${Date.now()}`,
          date: new Date().toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
          templateTitle: selectedTemplate.title,
          mode: interviewMode,
          language: selectedLanguage,
          overallScore: finalCard.overallScore,
          craftScore: finalCard.craftScore,
          confidenceScore: finalCard.confidenceScore,
          integrityScore: finalCard.integrityScore,
          hiringRecommendation: finalCard.hiringRecommendation,
          questionsAttempted: allSubmissions.map((s) => s.questionTitle),
          scorecard: finalCard,
        };
        setInterviewHistory((prev) => {
          const updated = [entry, ...prev].slice(0, 12);
          try {
            localStorage.setItem(INTERVIEW_HISTORY_STORAGE_KEY, JSON.stringify(updated));
          } catch {
            // Ignore quota errors
          }
          return updated;
        });
      } catch {
        // Ignore storage errors
      }
    };

    try {
      const result: InterviewScorecardResult = await apiInterviewScorecard({
        question: currentQuestion,
        bruteForceCode: tierCodes.bruteForce,
        betterCode: tierCodes.better,
        optimalCode: tierCodes.optimal,
        tiersCompleted: allCompletedTiers,
        questionSubmissions: allSubmissions,
        confidenceMetrics: confReport,
        proctoringMetrics: {
          strikes: currentProctoring.strikes,
          tabSwitchCount: currentProctoring.tabSwitchCount,
          blurCount: currentProctoring.blurCount,
          pasteCount: currentProctoring.pasteCount,
          integrityScore: isViolationTerminated ? 1.0 : currentProctoring.integrityScore,
        },
        elapsedSeconds,
      });

      result.questionSubmissions = allSubmissions;
      result.audioRecordingUrl = audioUrl || undefined;
      if (isViolationTerminated) {
        result.hiringRecommendation = "Needs Practice";
        result.proctoringSummary.isTerminated = true;
      }

      persistScorecardToHistory(result);
      setScorecard(result);
      setStage("scorecard");

      proctoringEngineRef.current?.stopProctoring();
      audioTrackerRef.current?.stopTracking();
      cameraTrackerRef.current?.stopTracking();

      if (!isViolationTerminated && result.spokenClosingFeedback && !isMuted) {
        setTimeout(() => {
          speechSynthRef.current?.speak(result.spokenClosingFeedback);
        }, 350);
      }
    } catch {
      // Robust client fallback scorecard
      const fallbackScorecard: InterviewScorecardResult = {
        overallScore: isViolationTerminated ? 4.0 : 8.2,
        craftScore: isViolationTerminated ? 4.5 : 8.5,
        confidenceScore: confReport.overallConfidenceScore,
        integrityScore: isViolationTerminated ? 1.0 : currentProctoring.integrityScore,
        hiringRecommendation: isViolationTerminated ? "Needs Practice" : "Hire",
        spokenClosingFeedback:
          "Interview session concluded. Your algorithmic breakdown, complexity trade-offs, and code submissions have been evaluated.",
        executiveSummary: `Candidate completed ${allSubmissions.length} question(s) in ${Math.max(
          1,
          Math.round(elapsedSeconds / 60)
        )} minutes, demonstrating structured progression across Brute Force, Better, and Optimal tiers.`,
        tierBreakdown: {
          bruteForce: {
            completed: allCompletedTiers.includes("bruteForce"),
            time: currentQuestion.tierDetails.bruteForce.targetTime,
            space: currentQuestion.tierDetails.bruteForce.targetSpace,
            summary: "Baseline pair/subarray enumeration.",
          },
          better: {
            completed: allCompletedTiers.includes("better"),
            time: currentQuestion.tierDetails.better.targetTime,
            space: currentQuestion.tierDetails.better.targetSpace,
            summary: "Intermediate auxiliary structure trade-off.",
          },
          optimal: {
            completed: allCompletedTiers.includes("optimal"),
            time: currentQuestion.tierDetails.optimal.targetTime,
            space: currentQuestion.tierDetails.optimal.targetSpace,
            summary: "Peak asymptotic efficiency.",
          },
        },
        topStrengths: [
          "Methodical progression across Brute Force → Better → Optimal tiers",
          "Clear vocal explanations of time and space complexity trade-offs",
          "Disciplined code structure and proctoring integrity",
        ],
        areasForGrowth: [
          "Dry-run boundary and empty/duplicate edge cases aloud before submitting",
          "Maintain steady vocal cadence during complex pointer/state updates",
        ],
        speechAnalysis: {
          wordsPerMinute: confReport.wordsPerMinute,
          fillerWordCount: confReport.fillerWordCount,
          vocalSteadiness: confReport.vocalSteadinessScore,
          hesitationPauses: confReport.hesitationPauses,
        },
        proctoringSummary: {
          strikes: currentProctoring.strikes,
          tabSwitches: currentProctoring.tabSwitchCount,
          blurCount: currentProctoring.blurCount,
          isTerminated: isViolationTerminated,
        },
        questionSubmissions: allSubmissions,
        audioRecordingUrl: audioUrl || undefined,
      };

      persistScorecardToHistory(fallbackScorecard);
      setScorecard(fallbackScorecard);
      setStage("scorecard");
      proctoringEngineRef.current?.stopProctoring();
      audioTrackerRef.current?.stopTracking();
      cameraTrackerRef.current?.stopTracking();
    } finally {
      setIsGeneratingScorecard(false);
    }
  };

  // Phase 5: Open a saved scorecard from History Vault or clear history
  const handleOpenSavedScorecard = (item: SavedInterviewHistoryItem) => {
    setSelectedLanguage(item.language);
    setSelectedScorecardQuestionIdx(0);
    setSelectedScorecardTier("optimal");
    setScorecard(item.scorecard);
    setStage("scorecard");
  };

  const handleClearInterviewHistory = () => {
    setInterviewHistory([]);
    try {
      localStorage.removeItem(INTERVIEW_HISTORY_STORAGE_KEY);
    } catch {}
    toast.info("Cleared saved interview history.");
  };

  // Phase 4: Export Comprehensive Markdown Interview Report
  const handleExportScorecardMarkdown = () => {
    if (!scorecard) return;
    const submissions = scorecard.questionSubmissions || [];
    const lines: string[] = [
      `# ${selectedTemplate.title} — Technical Interview Practice Scorecard`,
      ``,
      `- **Date**: ${new Date().toLocaleString()}`,
      `- **Practice Readiness Indicator**: **${scorecard.hiringRecommendation}** *(Automated Heuristic — For Self-Study Only)*`,
      `- **Overall Rating**: **${scorecard.overallScore} / 10**`,
      `- **Algorithmic Craft**: ${scorecard.craftScore} / 10`,
      `- **Speech & Communication**: ${scorecard.confidenceScore} / 10 (${scorecard.speechAnalysis.wordsPerMinute} WPM, Steadiness ${scorecard.speechAnalysis.vocalSteadiness}/10)`,
      `- **Proctoring Integrity**: ${scorecard.integrityScore} / 10 (${scorecard.proctoringSummary.strikes} Strikes, ${scorecard.proctoringSummary.tabSwitches} Tab Switches)`,
      `- **Total Duration**: ${Math.max(1, Math.round(elapsedSeconds / 60))} minutes`,
      ``,
      `## Executive Summary`,
      scorecard.executiveSummary,
      ``,
      `> **Automated AI Coaching Summary:** ${scorecard.spokenClosingFeedback}`,
      ``,
      `## Top Strengths`,
      ...scorecard.topStrengths.map((s) => `- ✅ ${s}`),
      ``,
      `## Priority Areas for Growth`,
      ...scorecard.areasForGrowth.map((g) => `- 🎯 ${g}`),
      ``,
      `## Question-by-Question Code Review`,
    ];

    submissions.forEach((sub, idx) => {
      const qObj = INTERVIEW_QUESTIONS.find((q) => q.id === sub.questionId) || currentQuestion;
      const refCode = getReferenceOptimalCode(qObj, selectedLanguage);
      lines.push(
        ``,
        `### Q${idx + 1}: ${sub.questionTitle} (${Math.max(1, Math.round(sub.timeSpentSeconds / 60))} min)`,
        `- **Tiers Verified**: Brute Force (${sub.tiersCompleted.bruteForce ? "Passed" : "Pending"}) • Better (${
          sub.tiersCompleted.better ? "Passed" : "Pending"
        }) • Optimal (${sub.tiersCompleted.optimal ? "Passed" : "Pending"})`,
        `- **Target Optimal Complexity**: Time \`${qObj.tierDetails.optimal.targetTime}\`, Space \`${qObj.tierDetails.optimal.targetSpace}\``,
        ``,
        `#### Candidate Submitted Optimal / Latest Code (${selectedLanguage.toUpperCase()})`,
        "```" + selectedLanguage,
        sub.tierCodes.optimal || sub.tierCodes.better || sub.tierCodes.bruteForce || "// No code submitted",
        "```",
        ``,
        `#### Reference Optimal Solution (${selectedLanguage.toUpperCase()})`,
        "```" + selectedLanguage,
        refCode,
        "```"
      );
    });

    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dsa_interview_scorecard_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded Markdown Interview Scorecard Report!");
  };

  // Phase 4: Immediately launch a targeted practice session for a recommended follow-up question
  const handlePracticeRecommendedQuestion = (nextQ: InterviewQuestion) => {
    const deepDiveTemplate = INTERVIEW_TEMPLATES[0] || selectedTemplate;
    setSelectedTemplateId(deepDiveTemplate.id);
    setQuestionQueue([nextQ]);
    setActiveQueueIndex(0);
    setTierCodes({
      bruteForce: getTierStarterCode(nextQ, "bruteForce", selectedLanguage),
      better: getTierStarterCode(nextQ, "better", selectedLanguage),
      optimal: getTierStarterCode(nextQ, "optimal", selectedLanguage),
    });
    setCode(getTierStarterCode(nextQ, "bruteForce", selectedLanguage));
    setTiersCompleted({ bruteForce: false, better: false, optimal: false });
    setTierEvaluations({ bruteForce: null, better: null, optimal: null });
    setScorecard(null);
    setStage("setup");
    toast.success(`Loaded "${nextQ.title}" into your interview queue!`);
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(Math.max(0, totalSeconds) / 60);
    const secs = Math.max(0, totalSeconds) % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-primary/20">
      <SiteHeader />

      {/* STAGE 1: SETUP SCREEN */}
      {stage === "setup" && (
        <main id="main-content" className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-background">
          <div className="w-full max-w-4xl space-y-6">
            {/* Header banner */}
            <div className="rounded-3xl border border-border/80 bg-card/80 backdrop-blur-xl p-6 sm:p-8 space-y-4 shadow-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-mono font-bold text-primary">
                <Brain className="size-3.5" />
                Simulated Practice Environment • Local Browser Media Processing
              </div>

              <div className="space-y-1">
                <h1 className="text-3xl sm:text-4xl font-black font-display text-foreground tracking-tight">
                  Simulated Technical Coding Round
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Practice progressing from <strong className="text-foreground">Brute Force</strong> to <strong className="text-foreground">Better</strong> to <strong className="text-foreground">Optimal</strong> with Socratic AI hints, browser-native speech recognition, and optional local webcam preview.
                </p>
                <p className="text-[11px] font-mono text-muted-foreground/80 pt-1">
                  Privacy &amp; Fair Use Notice: Webcam video and microphone audio stay 100% inside your local browser and are never recorded or uploaded. Company tags are referenced under nominative fair use; practice scorecards are automated study heuristics and do not guarantee interview outcomes.
                </p>
              </div>

              {/* Template Selection Cards */}
              <div className="space-y-2.5 pt-2">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="size-3.5 text-primary" /> Select Interview Template &amp; Question Queue:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {INTERVIEW_TEMPLATES.map((tpl) => {
                    const isSelected = selectedTemplateId === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => setSelectedTemplateId(tpl.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 flex flex-col justify-between ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-md ring-1 ring-primary/40"
                            : "border-border/70 bg-card hover:border-border hover:bg-muted/30"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-foreground truncate">{tpl.title}</span>
                            {isSelected ? (
                              <CheckCircle2 className="size-4 text-primary shrink-0" />
                            ) : (
                              <span className="size-3.5 rounded-full border border-border" />
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-primary font-bold">{tpl.tagline}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                            {tpl.description}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                          <span>{tpl.questionCount} Questions</span>
                          <span>{tpl.perQuestionMinutes}m / question</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Phase 3: Target Company & Topic Filter + Question Queue Preview */}
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                      Historical Topic &amp; Company Filter:
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {INTERVIEW_QUESTIONS.length} Practice Problems (Nominative Fair Use)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleReshuffleQueue}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border/80 bg-card hover:border-primary/50 hover:text-primary text-[11px] font-mono font-bold transition-colors cursor-pointer"
                  >
                    <Shuffle className="size-3" /> Shuffle Queue
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase text-muted-foreground">
                      Company Tag (Nominative Fair Use)
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {availableCompanies.map((comp) => (
                        <button
                          key={comp}
                          type="button"
                          onClick={() => setSelectedCompanyFilter(comp)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                            selectedCompanyFilter === comp
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card border-border/70 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {comp}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase text-muted-foreground">
                      Algorithmic Topic
                    </span>
                    <select
                      value={selectedTopicFilter}
                      onChange={(e) => setSelectedTopicFilter(e.target.value)}
                      className="w-full rounded-lg border border-border/80 bg-card px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {availableTopics.map((topic) => (
                        <option key={topic} value={topic}>
                          {topic === "All" ? "All Topics (Balanced Mix)" : topic}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Active Queue Preview Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  {questionQueue.map((q, idx) => (
                    <div
                      key={q.id}
                      className="rounded-xl border border-border/70 bg-background/70 p-2.5 flex flex-col justify-between gap-1.5"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-mono font-bold text-primary">
                          Q{idx + 1} · {q.topic}
                        </span>
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                            q.difficulty === "Easy"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : q.difficulty === "Medium"
                              ? "bg-amber-500/15 text-amber-400"
                              : "bg-rose-500/15 text-rose-400"
                          }`}
                        >
                          {q.difficulty}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-foreground truncate">{q.title}</p>
                      <div className="flex flex-wrap gap-1">
                        {q.companyTags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Language & Voice Tuning Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Language Picker */}
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-3.5 space-y-2">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Code2 className="size-3.5 text-primary" /> Programming Language:
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(["cpp", "python", "javascript", "java"] as const).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setSelectedLanguage(lang)}
                        className={`rounded-lg py-1.5 text-xs font-mono font-bold capitalize transition-all cursor-pointer ${
                          selectedLanguage === lang
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-card border border-border/70 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {lang === "cpp" ? "C++" : lang === "javascript" ? "JS" : lang}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Voicepack Engine Picker */}
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Volume2 className="size-3.5 text-primary" /> AI Voice Engine:
                      </label>
                      {livekitCloudActive ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" /> LiveKit Cloud
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          Browser Speech Synthesis
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleTestVoice}
                      className="text-[11px] font-mono text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="size-2.5" /> Test Voice
                    </button>
                  </div>
                  <select
                    value={selectedVoiceURI}
                    onChange={(e) => handleVoiceChange(e.target.value)}
                    className="w-full text-xs font-mono bg-card border border-border/80 rounded-lg p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {availableVoices.length === 0 && (
                      <option value="">Default System English Voice</option>
                    )}
                    {availableVoices.map((v) => (
                      <option key={v.uri} value={v.uri}>
                        {v.name} ({v.lang}) {v.isNeural ? "★ Neural" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Device Verification & Browser Guide */}
              <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                    <ShieldAlert className="size-4 text-primary" />
                    <span>Hardware Webcam &amp; Microphone Verification</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => requestMediaPermissions()}
                    disabled={isProbingDevices}
                    className="text-xs font-mono h-7 gap-1"
                  >
                    <RefreshCw className={`size-3 ${isProbingDevices ? "animate-spin" : ""}`} />
                    {hasCameraPermission && hasMicPermission ? "Verified ✓" : "Grant Hardware Access"}
                  </Button>
                </div>

                {/* Hardware indicators */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    className={`flex flex-col gap-2 p-2.5 rounded-xl border text-xs font-mono ${
                      hasCameraPermission
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                        : "border-border/60 bg-muted/30 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Video className="size-4 shrink-0" />
                      <span>Webcam: {hasCameraPermission ? "Connected (Local Browser Stream)" : "Awaiting Permission"}</span>
                    </div>
                    {availableCameras.length > 0 && (
                      <select
                        value={selectedCameraId}
                        onChange={(e) => handleCameraDeviceChange(e.target.value)}
                        className="w-full text-[11px] font-mono bg-card/90 border border-border/80 rounded-lg px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {availableCameras.map((cam, idx) => (
                          <option key={cam.deviceId || idx} value={cam.deviceId}>
                            {cam.label || `Camera ${idx + 1}`}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div
                    className={`flex flex-col gap-2 p-2.5 rounded-xl border text-xs font-mono ${
                      hasMicPermission
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                        : "border-border/60 bg-muted/30 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Mic className="size-4 shrink-0" />
                        <span>Microphone: {hasMicPermission ? "Live Input Ready" : "Awaiting Permission"}</span>
                      </div>
                      {hasMicPermission && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-background/70 text-foreground">
                          {candidateVolume}%
                        </span>
                      )}
                    </div>
                    {availableMics.length > 0 && (
                      <select
                        value={selectedMicId}
                        onChange={(e) => handleMicDeviceChange(e.target.value)}
                        className="w-full text-[11px] font-mono bg-card/90 border border-border/80 rounded-lg px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {availableMics.map((mic, idx) => (
                          <option key={mic.deviceId || idx} value={mic.deviceId}>
                            {mic.label || `Microphone ${idx + 1}`}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Live Mic Level & Real-Time Speech-to-Text Verification Box */}
                {hasMicPermission && (
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                      <div className="flex items-center gap-2">
                        <Radio
                          className={`size-3.5 ${
                            speechRecStatus === "listening"
                              ? "text-emerald-400 animate-pulse"
                              : "text-amber-400"
                          }`}
                        />
                        <span className="font-bold text-foreground">
                          Live Mic & Speech-to-Text Test:
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            speechRecStatus === "listening"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {speechRecStatus === "listening"
                            ? "Listening Live"
                            : speechRecStatus === "unsupported"
                            ? "Use Chrome/Edge for STT"
                            : "Standby"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-[10px]">Input Level</span>
                        <div className="w-24 h-2 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all duration-75"
                            style={{ width: `${Math.min(100, candidateVolume * 1.6)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border/60 bg-card/80 px-3 py-2 text-xs font-mono text-muted-foreground min-h-[34px] flex items-center">
                      {liveInterimSpeech ? (
                        <span className="text-primary font-semibold">
                          🎙️ &ldquo;{liveInterimSpeech}...&rdquo;
                        </span>
                      ) : candidateTranscript ? (
                        <span className="text-foreground">
                          ✓ Heard: &ldquo;{candidateTranscript.slice(-140)}&rdquo;
                        </span>
                      ) : speechRecMessage ? (
                        <span className="text-amber-400">{speechRecMessage}</span>
                      ) : (
                        <span>
                          Say &ldquo;Testing microphone one two three&rdquo; to verify live voice transcription...
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Embedded Iframe Alert if applicable */}
                {isInsideIframe && (
                  <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-3 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Info className="size-4 text-blue-400 shrink-0" />
                      <span className="text-muted-foreground text-[11px]">
                        Embedded preview iframe detected. Open in direct standalone tab if permissions are restricted.
                      </span>
                    </div>
                    <Button size="sm" onClick={openInStandaloneTab} className="h-7 text-xs font-mono">
                      <ExternalLink className="size-3 mr-1" /> Open Direct Tab
                    </Button>
                  </div>
                )}
              </div>

              {/* Phase 5: Session Mode Selector (Strict Proctored vs. Guided Practice Mode) */}
              <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-primary" /> Interview Environment Mode:
                  </span>
                  <span className="text-[11px] font-mono text-primary">
                    {interviewMode === "proctored" ? "Full Anti-Cheat Active" : "Flexible Coaching Mode"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setInterviewMode("proctored")}
                    className={`text-left rounded-xl border p-3 transition-all cursor-pointer ${
                      interviewMode === "proctored"
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border/70 bg-muted/20 hover:border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Lock className="size-3.5 text-primary" /> Strict Proctored Mode
                      </span>
                      {interviewMode === "proctored" && (
                        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-mono font-bold text-primary">
                          Selected
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      Enforces fullscreen lock, 3-strike tab/focus detection, and live webcam + microphone verification.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInterviewMode("practice")}
                    className={`text-left rounded-xl border p-3 transition-all cursor-pointer ${
                      interviewMode === "practice"
                        ? "border-emerald-500 bg-emerald-500/10 shadow-sm"
                        : "border-border/70 bg-muted/20 hover:border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-emerald-400" /> Guided Practice / Coaching Mode
                      </span>
                      {interviewMode === "practice" && (
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-400">
                          Selected
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      No fullscreen lock or strike termination. Camera optional—ideal for daily voice dry-runs and Socratic coaching.
                    </p>
                  </button>
                </div>
              </div>

              {/* Proctoring Agreement & Launch */}
              <div className="space-y-3 pt-1">
                {interviewMode === "proctored" && (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreeToRules}
                      onChange={(e) => setAgreeToRules(e.target.checked)}
                      className="size-4 rounded border-border text-primary accent-primary"
                    />
                    <span>
                      I agree to the strict full-screen anti-cheat protocols (3 strikes maximum for tab-switching or leaving full-screen).
                    </span>
                  </label>
                )}

                <Button
                  size="lg"
                  disabled={
                    interviewMode === "proctored" &&
                    (!hasCameraPermission || !hasMicPermission || !agreeToRules)
                  }
                  onClick={handleStartInterview}
                  className="w-full h-12 text-sm font-mono font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg cursor-pointer"
                >
                  <Play className="size-4 fill-current" />
                  {interviewMode === "proctored"
                    ? `Launch Live Proctored Interview (${questionQueue.length} Questions • ${selectedTemplate.totalMinutes}m)`
                    : `Start Guided Practice Session (${questionQueue.length} Questions • ${selectedTemplate.totalMinutes}m)`}
                </Button>
              </div>

              {/* Phase 5: Persistent Interview History & Progress Vault */}
              {interviewHistory.length > 0 && (
                <div className="rounded-2xl border border-border/80 bg-card/80 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Award className="size-4 text-primary" />
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                        Recent Interview Sessions & Progress Vault ({interviewHistory.length})
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground">
                        Avg Score:{" "}
                        <strong className="text-primary">
                          {(
                            interviewHistory.reduce((acc, item) => acc + item.overallScore, 0) /
                            interviewHistory.length
                          ).toFixed(1)}{" "}
                          / 10
                        </strong>
                      </span>
                      <button
                        type="button"
                        onClick={handleClearInterviewHistory}
                        className="text-[11px] font-mono text-muted-foreground hover:text-rose-400 cursor-pointer"
                      >
                        Clear History
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-52 overflow-y-auto pr-1">
                    {interviewHistory.slice(0, 6).map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-border/70 bg-muted/20 p-3 flex items-center justify-between gap-2 hover:border-primary/40 transition-all"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-foreground truncate">
                              {item.questionsAttempted.join(", ") || item.templateTitle}
                            </span>
                            <span className="rounded bg-secondary px-1.5 py-0.2 text-[9px] font-mono uppercase text-muted-foreground">
                              {item.language}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground">
                            {item.date} • {item.mode === "practice" ? "Practice" : "Proctored"} •{" "}
                            <span className="text-primary font-bold">{item.hiringRecommendation}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right font-mono">
                            <div className="text-sm font-black text-foreground">{item.overallScore}/10</div>
                          </div>
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleOpenSavedScorecard(item)}
                            className="font-mono text-[10px] h-7"
                          >
                            View Report
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {/* STAGE 2: LIVE INTERVIEW WORKSPACE */}
      {stage === "interviewing" && (
        <main
          ref={workspaceContainerRef}
          id="main-content"
          className="flex-1 flex flex-col bg-background text-foreground h-[calc(100vh-64px)] overflow-hidden"
        >
          {/* Top Control Bar: Queue Progress, Tiers, Dual Timers, Mic/Speaker Controls & Strikes */}
          <div className="h-14 border-b border-border/80 bg-card/80 px-4 flex items-center justify-between shrink-0 gap-2">
            {/* Left: Queue Progress & Next Question */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/30 text-primary px-2.5 py-1 rounded-lg text-xs font-mono font-bold">
                <Brain className="size-3.5" />
                <span>
                  Question {activeQueueIndex + 1} of {questionQueue.length}
                </span>
              </div>
              <span className="hidden md:inline font-bold text-xs truncate max-w-[200px] text-foreground">
                {currentQuestion.title}
              </span>

              {/* Next Question Button */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleNextQuestion(false)}
                className="h-7 text-[11px] font-mono font-bold gap-1 cursor-pointer hover:bg-secondary"
                title="Save submission and proceed to the next question in the queue"
              >
                <span>{activeQueueIndex + 1 < questionQueue.length ? "Next Question" : "Finish Queue"}</span>
                <ChevronRight className="size-3" />
              </Button>
            </div>

            {/* Middle: 3-Tier Solution Phase Tracker */}
            <div className="flex items-center gap-1 sm:gap-2">
              <div
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-mono font-bold transition-all ${
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
                <span>1. Brute</span>
              </div>

              <ChevronRight className="size-3 text-muted-foreground" />

              <div
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-mono font-bold transition-all ${
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
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-mono font-bold transition-all ${
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

            {/* Right: Mic/Audio Toggles, Dual Countdown Clocks, Strikes & Conclude */}
            <div className="flex items-center gap-2">
              {/* Candidate Mic Mute Toggle */}
              <button
                type="button"
                onClick={handleToggleMicMute}
                className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-mono font-bold border transition-colors cursor-pointer ${
                  isMicMuted
                    ? "bg-rose-500/15 border-rose-500/40 text-rose-400"
                    : candidateVolume > 12
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                    : "bg-muted/50 border-border/70 text-foreground hover:bg-secondary"
                }`}
                title={isMicMuted ? "Unmute Microphone" : "Mute Microphone"}
              >
                {isMicMuted ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
                <span className="hidden lg:inline">{isMicMuted ? "Mic Muted" : `${candidateVolume}%`}</span>
              </button>

              {/* AI Voice Mute Toggle */}
              <button
                type="button"
                onClick={handleToggleAiVoiceMute}
                className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-mono font-bold border transition-colors cursor-pointer ${
                  isMuted
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                    : interviewerStatus === "speaking"
                    ? "bg-primary/15 border-primary/40 text-primary"
                    : "bg-muted/50 border-border/70 text-foreground hover:bg-secondary"
                }`}
                title={isMuted ? "Unmute AI Interviewer Voice" : "Mute AI Interviewer Voice"}
              >
                {isMuted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
              </button>

              {/* Question Dedicated Timer */}
              <div
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono font-bold border transition-colors ${
                  perQuestionSecondsLeft < 180
                    ? "bg-rose-500/15 border-rose-500/40 text-rose-400 animate-pulse"
                    : perQuestionSecondsLeft < 360
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                    : "bg-muted/60 border-border/70 text-foreground"
                }`}
                title="Remaining time for current question"
              >
                <Clock className="size-3" />
                <span>Q: {formatTimer(perQuestionSecondsLeft)}</span>
              </div>

              {/* Total Session Timer */}
              <div className="hidden sm:flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono bg-muted/40 border border-border/60 text-muted-foreground" title="Total Session Remaining Time">
                <span>Total: {formatTimer(totalSessionSecondsLeft)}</span>
              </div>

              {/* Strikes Counter or Practice Mode Badge */}
              {interviewMode === "practice" ? (
                <div
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-mono font-bold border bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  title="Guided Practice Mode — No fullscreen lock or strike termination"
                >
                  <Sparkles className="size-3" />
                  <span>Practice Mode</span>
                </div>
              ) : (
                <div
                  className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-mono font-bold border ${
                    proctoringState.strikes === 0
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : proctoringState.strikes === 1
                      ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                      : "bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse"
                  }`}
                  title="Integrity strikes for tab switches or leaving full screen"
                >
                  <ShieldAlert className="size-3" />
                  <span>{proctoringState.strikes}/3</span>
                </div>
              )}

              {/* End Interview */}
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleConcludeInterview(false)}
                disabled={isGeneratingScorecard}
                className="h-7 text-xs font-mono font-bold"
              >
                {isGeneratingScorecard ? "Finalizing..." : "End Session"}
              </Button>
            </div>
          </div>

          {/* Main Dual-Column Content */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Left Column: Persistent Live Voice Strip + Problem, Chat Transcript & Proctoring Tabs */}
            <div className="w-2/5 border-r border-border/80 flex flex-col bg-card/30">
              {/* Persistent Live Mic & AI Interviewer Strip (Always visible across all tabs) */}
              <div className="border-b border-border/70 bg-card/90 px-3 py-2.5 space-y-2 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`size-2.5 rounded-full shrink-0 ${
                        isMicMuted
                          ? "bg-rose-500"
                          : interviewerStatus === "speaking"
                          ? "bg-primary animate-ping"
                          : isAskingInterviewer || interviewerStatus === "evaluating"
                          ? "bg-amber-400 animate-pulse"
                          : candidateVolume > 10 || liveInterimSpeech
                          ? "bg-emerald-400 animate-pulse"
                          : "bg-emerald-500"
                      }`}
                    />
                    <span className="font-mono text-[11px] font-bold text-foreground truncate">
                      {isMicMuted
                        ? "Mic Muted"
                        : interviewerStatus === "speaking"
                        ? "AI Interviewer Speaking (Mic Echo-Guarded)"
                        : isAskingInterviewer || interviewerStatus === "evaluating"
                        ? "AI Interviewer Thinking..."
                        : liveInterimSpeech || candidateVolume > 12
                        ? "Hearing You Speak..."
                        : isHandsFreeLiveVoice
                        ? "Mic Live (Hands-Free Turn-Taking ON)"
                        : "Mic Live (Manual Send Mode)"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {interviewerStatus === "speaking" ? (
                      <button
                        type="button"
                        onClick={handleInterruptInterviewer}
                        className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[10px] font-bold hover:bg-amber-500/30 transition-colors cursor-pointer"
                        title="Stop AI speech immediately so you can speak"
                      >
                        Interrupt AI
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isAskingInterviewer}
                        onClick={handleSendSpokenThoughtNow}
                        className="px-2 py-0.5 rounded-md bg-primary/15 border border-primary/40 text-primary font-mono text-[10px] font-bold hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer disabled:opacity-50"
                        title="Immediately send your latest spoken words to the AI Interviewer"
                      >
                        Ask AI Now
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsHandsFreeLiveVoice(!isHandsFreeLiveVoice)}
                      className={`px-2 py-0.5 rounded-md border font-mono text-[10px] font-bold transition-colors cursor-pointer ${
                        isHandsFreeLiveVoice
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                          : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
                      }`}
                      title="Toggle automatic response when you pause after speaking"
                    >
                      {isHandsFreeLiveVoice ? "Auto: ON" : "Auto: OFF"}
                    </button>
                  </div>
                </div>

                {/* Live Voice Caption Box */}
                <div className="rounded-lg border border-border/60 bg-background/70 px-2.5 py-1.5 text-[11px] font-mono leading-snug">
                  {liveInterimSpeech ? (
                    <div className="text-emerald-400 font-medium">
                      <span className="uppercase text-[9px] font-bold mr-1.5 px-1 py-0.2 rounded bg-emerald-500/20">
                        You (Live)
                      </span>
                      &ldquo;{liveInterimSpeech}...&rdquo;
                    </div>
                  ) : interviewerStatus === "speaking" && interviewerSpeechText ? (
                    <div className="text-primary line-clamp-2">
                      <span className="uppercase text-[9px] font-bold mr-1.5 px-1 py-0.2 rounded bg-primary/20">
                        Interviewer
                      </span>
                      {interviewerSpeechText}
                    </div>
                  ) : pendingVoiceQueryRef.current ? (
                    <div className="text-foreground line-clamp-1">
                      <span className="uppercase text-[9px] font-bold mr-1.5 px-1 py-0.2 rounded bg-secondary text-muted-foreground">
                        Heard
                      </span>
                      &ldquo;{pendingVoiceQueryRef.current}&rdquo;{" "}
                      <span className="text-[10px] text-muted-foreground">(pause to auto-send or click Ask AI Now)</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-muted-foreground text-[10px]">
                      <span>Speak naturally to think aloud or ask clarifying questions.</span>
                      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden shrink-0 ml-2">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-75"
                          style={{ width: `${Math.min(100, candidateVolume * 1.6)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Phase 2: 4-Stage Guided FAANG Interview Stepper */}
                <div className="pt-1 space-y-1.5">
                  <div className="grid grid-cols-4 gap-1">
                    {(
                      [
                        { id: "clarify", step: "1. Clarify", desc: "Ask bounds & edge cases" },
                        { id: "approach", step: "2. Approach", desc: "Pitch idea & Big-O first" },
                        { id: "implement", step: "3. Code", desc: "Talk through invariant" },
                        { id: "verify", step: "4. Dry-Run", desc: "Trace Example 1 & edge cases" },
                      ] as const
                    ).map((s, idx, arr) => {
                      const activeIdx = arr.findIndex((item) => item.id === interviewFlowStage);
                      const isCurrent = s.id === interviewFlowStage;
                      const isDone = idx < activeIdx;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setInterviewFlowStage(s.id)}
                          title={s.desc}
                          className={`px-1.5 py-1 rounded-md border font-mono text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                            isCurrent
                              ? "bg-primary/20 border-primary text-primary shadow-xs"
                              : isDone
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                              : "bg-card/60 border-border/60 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {isDone && <Check className="size-2.5 shrink-0" />}
                          <span className="truncate">{s.step}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Stage Coaching Tip + Detected Complexity Badge */}
                  <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-muted-foreground px-1">
                    <span className="truncate">
                      {interviewFlowStage === "clarify" &&
                        "Tip: Ask about input bounds, duplicates, or empty cases before coding."}
                      {interviewFlowStage === "approach" &&
                        `Tip: Pitch your ${currentTier} idea & ${currentQuestion.tierDetails[currentTier].targetTime} complexity aloud.`}
                      {interviewFlowStage === "implement" &&
                        "Tip: Explain your loop invariant and pointer transitions as you type."}
                      {interviewFlowStage === "verify" &&
                        "Tip: Trace Example 1 line-by-line to catch off-by-one boundary bugs."}
                    </span>
                    {liveDetectedComplexity && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded bg-primary/15 border border-primary/30 text-primary font-bold">
                        Detected: {liveDetectedComplexity.time} · {liveDetectedComplexity.space}
                      </span>
                    )}
                  </div>

                  {/* Interactive Socratic Coaching Quick-Actions Strip */}
                  <div className="flex flex-wrap items-center gap-1 pt-0.5">
                    <button
                      type="button"
                      disabled={isAskingInterviewer}
                      onClick={() => handleCoachingQuickAction("clarify_constraints")}
                      className="px-2 py-1 rounded-md border border-border/80 bg-card hover:border-primary/50 hover:text-primary text-[10px] font-mono font-semibold transition-colors cursor-pointer disabled:opacity-50"
                      title="Ask the AI Interviewer to clarify input constraints and tricky edge cases"
                    >
                      Clarify Bounds
                    </button>
                    <button
                      type="button"
                      disabled={isAskingInterviewer}
                      onClick={() => handleCoachingQuickAction("pitch_approach")}
                      className="px-2 py-1 rounded-md border border-border/80 bg-card hover:border-primary/50 hover:text-primary text-[10px] font-mono font-semibold transition-colors cursor-pointer disabled:opacity-50"
                      title="Validate your spoken approach and complexity with the AI Interviewer"
                    >
                      Pitch Approach
                    </button>
                    <button
                      type="button"
                      disabled={isAskingInterviewer}
                      onClick={() => handleCoachingQuickAction("dry_run")}
                      className="px-2 py-1 rounded-md border border-border/80 bg-card hover:border-primary/50 hover:text-primary text-[10px] font-mono font-semibold transition-colors cursor-pointer disabled:opacity-50"
                      title="Ask the AI Interviewer to dry-run your code on Example 1"
                    >
                      Dry-Run Ex 1
                    </button>
                    <button
                      type="button"
                      disabled={isAskingInterviewer}
                      onClick={() => handleCoachingQuickAction("complexity_check")}
                      className="px-2 py-1 rounded-md border border-border/80 bg-card hover:border-primary/50 hover:text-primary text-[10px] font-mono font-semibold transition-colors cursor-pointer disabled:opacity-50"
                      title="Check your current editor code's Time and Space complexity"
                    >
                      Check Big-O
                    </button>
                    <button
                      type="button"
                      disabled={isAskingInterviewer}
                      onClick={handleAskHint}
                      className="px-2 py-1 rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-[10px] font-mono font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1 ml-auto"
                      title="Unlock the next progressive Socratic hint level (1: Conceptual -> 2: Pattern -> 3: Blueprint)"
                    >
                      <Sparkles className="size-2.5" />
                      <span>
                        Hint ({hintLevelByTier[currentTier] || 0}/3)
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Tab Selector */}
              <div className="flex border-b border-border/70 bg-muted/40 p-1 gap-1 text-xs font-mono font-bold shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab("problem")}
                  className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === "problem"
                      ? "bg-card text-foreground shadow-xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Code2 className="size-3.5 text-primary" /> Problem Spec
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("chat")}
                  className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 relative ${
                    activeTab === "chat"
                      ? "bg-card text-foreground shadow-xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MessageSquare className="size-3.5 text-primary" /> AI Co-Pilot ({conversationalChat.length})
                  {conversationalChat.length > 0 && (
                    <span className="size-2 rounded-full bg-primary animate-pulse" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("proctoring")}
                  className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === "proctoring"
                      ? "bg-card text-foreground shadow-xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ShieldCheck className="size-3.5 text-primary" /> Integrity Log
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                {/* 1. Problem Tab */}
                {activeTab === "problem" && (
                  <div className="space-y-4">
                    {/* Active Tier Goal Card */}
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase font-bold text-primary">
                          Current Tier Goal:{" "}
                          {currentTier === "bruteForce"
                            ? "1. Brute Force"
                            : currentTier === "better"
                            ? "2. Better Approach"
                            : "3. Optimal Invariant"}
                        </span>
                        <span className="font-mono text-[11px] font-bold text-foreground">
                          Target: {currentQuestion.tierDetails[currentTier].targetTime} ·{" "}
                          {currentQuestion.tierDetails[currentTier].targetSpace}
                        </span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        {currentQuestion.tierDetails[currentTier].description}
                      </p>
                    </div>

                    {/* Progressive 3-Level Socratic Hint Ladder Card */}
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="size-3.5 text-amber-400" />
                          <span className="font-mono text-[10px] uppercase font-bold text-amber-300">
                            Progressive Socratic Hint Ladder ({hintLevelByTier[currentTier] || 0}/3 Unlocked)
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={isAskingInterviewer}
                          onClick={handleAskHint}
                          className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 font-mono text-[10px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {(hintLevelByTier[currentTier] || 0) < 3
                            ? `Unlock Level ${(hintLevelByTier[currentTier] || 0) + 1}/3`
                            : "Re-Hear Level 3/3"}
                        </button>
                      </div>

                      {(unlockedHintsByTier[currentTier] || []).length === 0 ? (
                        <p className="text-[11px] text-muted-foreground font-mono">
                          Stuck? Unlock calibrated clues step-by-step: Level 1 (Conceptual Nudge) → Level 2 (Pattern & Data Structure) → Level 3 (Invariant Blueprint).
                        </p>
                      ) : (
                        <div className="space-y-1.5 pt-1">
                          {(unlockedHintsByTier[currentTier] || []).map((h) => (
                            <div
                              key={h.level}
                              className="rounded-lg border border-amber-500/25 bg-background/70 p-2 space-y-1"
                            >
                              <div className="flex items-center justify-between text-[10px] font-mono font-bold text-amber-300">
                                <span>
                                  {h.level === 1
                                    ? "Level 1/3 · Conceptual Nudge"
                                    : h.level === 2
                                    ? "Level 2/3 · Pattern & Data Structure"
                                    : "Level 3/3 · Invariant Blueprint"}
                                </span>
                              </div>
                              <p className="text-[11px] text-foreground leading-relaxed">{h.text}</p>
                              {h.followUp && (
                                <p className="text-[10px] font-mono text-primary pt-0.5">
                                  Think about: {h.followUp}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Problem Description */}
                    <div className="space-y-1.5 break-words">
                      <h3 className="font-bold text-sm text-foreground break-words">{currentQuestion.title}</h3>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                        {currentQuestion.description}
                      </p>
                    </div>

                    {/* Examples */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-foreground font-mono text-[11px] uppercase tracking-wider">
                        Examples
                      </h4>
                      {currentQuestion.examples.map((ex, i) => (
                        <div key={i} className="rounded-xl border border-border/60 bg-muted/30 p-2.5 font-mono text-[11px] space-y-1 break-words overflow-x-auto">
                          <div className="whitespace-pre-wrap break-words">
                            <span className="text-muted-foreground">Input: </span>
                            <span className="text-foreground">{ex.input}</span>
                          </div>
                          <div className="whitespace-pre-wrap break-words">
                            <span className="text-muted-foreground">Output: </span>
                            <span className="text-emerald-400 font-bold">{ex.output}</span>
                          </div>
                          {ex.explanation && (
                            <p className="text-[10px] text-muted-foreground/80 pt-1 border-t border-border/40 whitespace-pre-wrap break-words">
                              {ex.explanation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Constraints */}
                    <div className="space-y-1">
                      <h4 className="font-bold text-foreground font-mono text-[11px] uppercase tracking-wider">
                        Constraints
                      </h4>
                      <ul className="list-disc list-inside space-y-0.5 text-muted-foreground font-mono text-[11px] break-words">
                        {currentQuestion.constraints.map((c, i) => (
                          <li key={i} className="break-words">{c}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* 2. Conversational Voice Chat & AI Co-Pilot Tab */}
                {activeTab === "chat" && (
                  <div className="flex flex-col h-full space-y-3">
                    {/* Messages Feed */}
                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                      {conversationalChat.map((msg) => {
                        const isInterviewer = msg.speaker === "interviewer";
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col space-y-1 ${isInterviewer ? "items-start" : "items-end"}`}
                          >
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                              <span className="font-bold">
                                {isInterviewer ? "AI Interviewer" : "Candidate"}
                              </span>
                              <span>• {msg.timestamp}</span>
                              {msg.stage && (
                                <span className="px-1.5 py-0.2 rounded bg-muted border border-border/60 text-[9px] uppercase">
                                  Stage: {msg.stage}
                                </span>
                              )}
                              {msg.hintLevel && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-bold">
                                  Hint {msg.hintLevel}/3
                                </span>
                              )}
                              {msg.detectedComplexity?.time && (
                                <span className="px-1.5 py-0.2 rounded bg-primary/15 border border-primary/30 text-primary text-[9px] font-bold">
                                  {msg.detectedComplexity.time} · {msg.detectedComplexity.space}
                                </span>
                              )}
                            </div>
                            <div
                              className={`rounded-2xl p-3 max-w-[90%] text-xs leading-relaxed space-y-2 ${
                                isInterviewer
                                  ? "bg-secondary/70 border border-border text-foreground"
                                  : "bg-primary text-primary-foreground font-medium"
                              }`}
                            >
                              <p>{msg.text}</p>
                              {isInterviewer && msg.followUpPrompt && (
                                <div className="pt-1.5 border-t border-border/60 flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-mono text-primary">
                                    Follow-up: {msg.followUpPrompt}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCustomQuestionInput(`Regarding "${msg.followUpPrompt}": `);
                                    }}
                                    className="shrink-0 px-2 py-0.5 rounded bg-primary/15 border border-primary/30 text-primary text-[9px] font-mono font-bold hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                                  >
                                    Reply
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Live Interim Speech Bubble while Candidate is Speaking */}
                      {liveInterimSpeech && (
                        <div className="flex flex-col space-y-1 items-end opacity-85">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
                            <Radio className="size-3 animate-pulse" />
                            <span>Speaking live...</span>
                          </div>
                          <div className="rounded-2xl p-3 max-w-[88%] text-xs leading-relaxed border border-emerald-500/40 bg-emerald-500/10 text-foreground italic">
                            {liveInterimSpeech}...
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Ask Interviewer Prompt Input */}
                    <div className="pt-2 border-t border-border/60 flex items-center gap-2">
                      <input
                        type="text"
                        value={customQuestionInput}
                        onChange={(e) => setCustomQuestionInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendConversationalQuery()}
                        placeholder="Ask interviewer verbally or type question..."
                        className="flex-1 bg-card border border-border/80 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isAskingInterviewer}
                        onClick={handleSendSpokenThoughtNow}
                        className="h-8 font-mono text-[11px] font-bold gap-1"
                        title="Send your latest spoken words to the interviewer"
                      >
                        <Mic className="size-3 text-emerald-400" />
                        <span>Send Voice</span>
                      </Button>
                      <Button
                        size="sm"
                        disabled={isAskingInterviewer}
                        onClick={() => handleSendConversationalQuery()}
                        className="h-8 font-mono text-xs font-bold gap-1"
                      >
                        <Send className="size-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* 3. Proctoring Log Tab */}
                {activeTab === "proctoring" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/70 bg-card">
                      <span className="font-mono font-bold text-xs">Integrity Score</span>
                      <span className="font-mono font-bold text-sm text-primary">
                        {proctoringState.integrityScore} / 10
                      </span>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-mono font-bold text-xs text-muted-foreground">Incident Timeline:</h4>
                      {proctoringState.events.length === 0 ? (
                        <p className="text-muted-foreground font-mono text-[11px]">No violations recorded. Session verified.</p>
                      ) : (
                        proctoringState.events.map((evt) => (
                          <div
                            key={evt.id}
                            className={`p-2 rounded-xl border text-[11px] font-mono space-y-0.5 ${
                              evt.severity === "strike"
                                ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                                : "border-amber-500/30 bg-amber-500/5 text-amber-300"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold uppercase">{evt.type.replace("_", " ")}</span>
                              <span>{evt.timestamp}</span>
                            </div>
                            <p className="text-[10px] opacity-90">{evt.description}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Code Editor & Execution Deck */}
            <div className="flex-1 flex flex-col bg-background">
              {/* Editor Header */}
              <div className="h-10 border-b border-border/70 bg-card/40 px-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-muted/40 p-0.5">
                    {(["python", "cpp", "javascript", "java"] as const).map((langKey) => (
                      <button
                        key={langKey}
                        type="button"
                        onClick={() => {
                          setSelectedLanguage(langKey);
                          const starter = getTierStarterCode(
                            currentQuestion,
                            currentTier,
                            langKey
                          );
                          setCode(starter);
                          setTierCodes({
                            bruteForce: getTierStarterCode(
                              currentQuestion,
                              "bruteForce",
                              langKey
                            ),
                            better: getTierStarterCode(currentQuestion, "better", langKey),
                            optimal: getTierStarterCode(currentQuestion, "optimal", langKey),
                          });
                          toast.info(`Switched to ${langKey.toUpperCase()} starter preset`);
                        }}
                        className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-bold transition-all cursor-pointer ${
                          selectedLanguage === langKey
                            ? "bg-primary text-primary-foreground shadow-2xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {langKey === "cpp"
                          ? "C++"
                          : langKey === "javascript"
                          ? "JS"
                          : langKey === "java"
                          ? "Java"
                          : "Python"}
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
                    ({currentTier === "bruteForce" ? "Brute Force" : currentTier === "better" ? "Better" : "Optimal"} Invariant)
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <ApiKeyVaultButton compact />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isRunningSampleTests}
                    onClick={handleRunSampleTests}
                    className="h-7 text-xs font-mono font-bold gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 cursor-pointer"
                    title="Execute your current solution against the problem's sample test cases"
                  >
                    <Play className="size-3 text-emerald-400" />
                    <span>{isRunningSampleTests ? "Running..." : "Run Sample Tests"}</span>
                  </Button>
                  <Button
                    size="sm"
                    variant={isScratchpadOpen ? "default" : "outline"}
                    onClick={() => setIsScratchpadOpen((prev) => !prev)}
                    className="h-7 text-xs font-mono gap-1 cursor-pointer"
                    title="Open Dry-Run & Pointer Trace Scratchpad"
                  >
                    <Layers className="size-3" /> Scratchpad
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isAskingInterviewer}
                    onClick={() => handleCoachingQuickAction("dry_run")}
                    className="h-7 text-xs font-mono gap-1 text-muted-foreground hover:text-foreground"
                    title="Trace your current code against Example 1 with the AI Interviewer"
                  >
                    <Terminal className="size-3 text-primary" /> AI Trace
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isAskingInterviewer}
                    onClick={handleAskHint}
                    className="h-7 text-xs font-mono gap-1 text-amber-400 hover:text-amber-300"
                    title="Request progressive Socratic hint (Level 1 -> 2 -> 3)"
                  >
                    <Sparkles className="size-3" /> Hint ({hintLevelByTier[currentTier] || 0}/3)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const starter = getTierStarterCode(currentQuestion, currentTier, selectedLanguage);
                      setCode(starter);
                    }}
                    className="h-7 text-xs font-mono gap-1"
                  >
                    <RotateCcw className="size-3" /> Reset Template
                  </Button>
                </div>
              </div>

              {/* Monaco Editor Container */}
              <div className="flex-1 overflow-hidden relative">
                <Editor
                  height="100%"
                  language={selectedLanguage === "cpp" ? "cpp" : selectedLanguage === "python" ? "python" : selectedLanguage === "javascript" ? "javascript" : "java"}
                  value={code}
                  onChange={handleCodeChange}
                  theme="vs-dark"
                  options={{
                    fontSize: 13,
                    fontFamily: "JetBrains Mono, Menlo, monospace",
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 4,
                  }}
                />
              </div>

              {/* Phase 5: Collapsible Dry-Run & Pointer Trace Scratchpad Drawer */}
              {isScratchpadOpen && (
                <div className="h-44 border-t border-border/80 bg-card/95 flex flex-col shrink-0">
                  <div className="h-8 px-3 border-b border-border/60 bg-muted/40 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <Layers className="size-3.5 text-primary" />
                      <span className="font-bold text-foreground">Dry-Run & Invariant Scratchpad</span>
                      <span className="text-[10px] text-muted-foreground hidden sm:inline">
                        (Included in AI Evaluator & Coaching context)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleSeedScratchpadTemplate}
                        className="px-2 py-0.5 rounded border border-border/70 bg-background/70 text-[10px] text-foreground hover:border-primary/50 cursor-pointer"
                      >
                        Seed Ex 1 Template
                      </button>
                      <button
                        type="button"
                        disabled={isAskingInterviewer}
                        onClick={handleVerifyScratchpadWithAi}
                        className="px-2 py-0.5 rounded bg-primary/15 border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        Verify My Trace with AI
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsScratchpadOpen(false)}
                        className="px-2 py-0.5 rounded border border-border/70 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Hide
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={scratchpadNotes}
                    onChange={(e) => setScratchpadNotes(e.target.value)}
                    placeholder="Jot down your pointer trace (e.g. l=0, r=n-1), hash map states, loop invariants, and boundary edge cases here while talking through your approach..."
                    className="flex-1 w-full resize-none bg-background/90 p-3 font-mono text-xs text-foreground focus:outline-none leading-relaxed"
                  />
                </div>
              )}

              {/* LeetCode-Style Bottom Testcase / Test Result / Massive Stress Submission Drawer */}
              <div className="border-t border-border/80 bg-card/95 p-2 shrink-0 space-y-1.5">
                {sampleTestResult && sampleTestResult.status !== "passed" && (
                  <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-primary/10 border border-primary/30 text-[11px] font-mono">
                    <span className="text-muted-foreground">
                      Need a Socratic nudge on the failing testcase or error?
                    </span>
                    <button
                      type="button"
                      disabled={isAskingInterviewer}
                      onClick={handleAskAiAboutTestResult}
                      className="px-2.5 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-bold hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      Ask AI Interviewer Why This Failed
                    </button>
                  </div>
                )}
                <LeetCodeTestDrawer
                  sampleCases={interviewSampleCases}
                  runResult={leetRunResult}
                  submitResult={leetSubmitResult}
                  isRunning={isRunningSampleTests}
                  isSubmitting={isEvaluating}
                  customInput={customTestCaseInput}
                  onCustomInputChange={setCustomTestCaseInput}
                  onRunTests={() => void handleRunSampleTests()}
                  onSubmitCode={() => void handleSubmitTier()}
                  activeDrawerTab={activeDrawerTab}
                  onTabChange={setActiveDrawerTab}
                  isCollapsed={!isTestConsoleOpen}
                  onToggleCollapse={() => setIsTestConsoleOpen((prev) => !prev)}
                  profileSaved={interviewProfileSaved}
                  submissionHistory={interviewSubmissionHistory}
                  onRestoreSubmission={(entry) => {
                    setCode(entry.code);
                    setTierCodes((prev) => ({ ...prev, [currentTier]: entry.code }));
                    toast.success(`Restored ${entry.language.toUpperCase()} submission (${entry.status})`);
                  }}
                />
              </div>

              {/* Evaluation Results Banner (if evaluated) */}
              {tierEvaluations[currentTier] && (
                <div
                  className={`border-t px-4 py-2 text-xs font-mono flex items-center justify-between ${
                    tierEvaluations[currentTier]?.passed
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {tierEvaluations[currentTier]?.passed ? (
                      <CheckCircle2 className="size-4 shrink-0" />
                    ) : (
                      <AlertTriangle className="size-4 shrink-0" />
                    )}
                    <span>
                      {tierEvaluations[currentTier]?.tierClassification}:{" "}
                      {tierEvaluations[currentTier]?.timeComplexity} time, {tierEvaluations[currentTier]?.spaceComplexity} space
                    </span>
                  </div>
                  <span className="font-bold">{tierEvaluations[currentTier]?.passed ? "Passed ✓" : "Needs Optimization"}</span>
                </div>
              )}

              {/* Bottom Action Deck: Complexity Self-Check + Run Sample Tests + Auto-Switch Tier Submit */}
              <div className="min-h-14 py-2 border-t border-border/80 bg-card/80 px-4 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="text-xs font-mono text-muted-foreground flex flex-wrap items-center gap-2">
                  <span>Target:</span>
                  <strong className="text-foreground">
                    {currentTier === "bruteForce"
                      ? "1. Brute"
                      : currentTier === "better"
                      ? "2. Better"
                      : "3. Optimal"}
                  </strong>
                  <span className="text-primary font-bold">({currentQuestion.tierDetails[currentTier].targetTime})</span>

                  {/* Phase 5: Candidate Complexity Self-Check Selectors */}
                  <div className="hidden xl:flex items-center gap-1.5 ml-2 pl-2 border-l border-border/70">
                    <span className="text-[10px] uppercase text-muted-foreground">My Claimed Big-O:</span>
                    <select
                      value={claimedTimeComplexity}
                      onChange={(e) => setClaimedTimeComplexity(e.target.value)}
                      className="rounded border border-border/80 bg-background px-1.5 py-0.5 text-[11px] font-mono text-foreground"
                      title="Your claimed Time Complexity"
                    >
                      {COMPLEXITY_OPTIONS.map((opt) => (
                        <option key={`t-${opt}`} value={opt}>
                          Time: {opt}
                        </option>
                      ))}
                    </select>
                    <select
                      value={claimedSpaceComplexity}
                      onChange={(e) => setClaimedSpaceComplexity(e.target.value)}
                      className="rounded border border-border/80 bg-background px-1.5 py-0.5 text-[11px] font-mono text-foreground"
                      title="Your claimed Space Complexity"
                    >
                      {COMPLEXITY_OPTIONS.map((opt) => (
                        <option key={`s-${opt}`} value={opt}>
                          Space: {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsTestConsoleOpen((prev) => !prev)}
                    className="ml-1 px-2 py-0.5 rounded border border-border/80 bg-background/70 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {isTestConsoleOpen ? "Hide Console" : "Console"}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="default"
                    variant="outline"
                    disabled={isRunningSampleTests || isEvaluating}
                    onClick={handleRunSampleTests}
                    className="font-mono text-xs font-bold gap-1.5 cursor-pointer border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                  >
                    <Play className="size-3.5" />
                    <span>{isRunningSampleTests ? "Running Cases..." : "Run Sample Cases"}</span>
                  </Button>

                  <Button
                    size="default"
                    disabled={isEvaluating}
                    onClick={handleSubmitTier}
                    className="font-mono text-xs font-bold gap-2 cursor-pointer shadow-md bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {isEvaluating ? (
                      <>
                        <Sparkles className="size-3.5 animate-spin" />
                        <span>Verifying Complexity Invariants...</span>
                      </>
                    ) : (
                      <>
                        <FileCheck className="size-3.5" />
                        <span>
                          {currentTier === "bruteForce"
                            ? "Submit Brute Force"
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

          {/* FEATURE 7: In-Browser AI Camera Picture-in-Picture Widget */}
          <div
            className={`fixed bottom-16 right-4 z-40 transition-all rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden ${
              isPipMinimized ? "w-44 h-11 p-2" : "w-64 h-52 p-2.5"
            }`}
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-border/50 text-[11px] font-mono">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <Video className="size-3 text-primary" />
                <span>AI Camera PiP</span>
              </div>
              <button
                type="button"
                onClick={() => setIsPipMinimized(!isPipMinimized)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {isPipMinimized ? <Maximize2 className="size-3" /> : <ChevronDown className="size-3.5" />}
              </button>
            </div>

            {!isPipMinimized && (
              <div className="relative w-full h-36 mt-1.5 rounded-xl overflow-hidden bg-black flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror"
                />
                <canvas
                  ref={overlayCanvasRef}
                  width={240}
                  height={140}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />

                {/* Status Badge */}
                <div className="absolute top-1.5 left-1.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                      cameraState.status === "ok"
                        ? "bg-emerald-500/80 text-white"
                        : cameraState.status === "looking_away"
                        ? "bg-amber-500/90 text-black animate-pulse"
                        : "bg-rose-500/90 text-white animate-pulse"
                    }`}
                  >
                    {cameraState.status === "ok" && <UserCheck className="size-2.5" />}
                    {cameraState.status === "looking_away" && <Eye className="size-2.5" />}
                    {cameraState.status === "multiple_faces" && <Users className="size-2.5" />}
                    {cameraState.status === "no_face" && <UserX className="size-2.5" />}
                    <span>
                      {cameraState.status === "ok"
                        ? "Face Centered"
                        : cameraState.status === "looking_away"
                        ? "Looking Away"
                        : cameraState.status === "multiple_faces"
                        ? "Multi-Face Alert"
                        : "No Face Detected"}
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* FEATURE 1: Auto-Switch Tier Celebration Modal */}
          {celebrationModal?.isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="w-full max-w-md rounded-3xl border border-primary/40 bg-card p-6 shadow-2xl text-center space-y-4">
                <div className="size-14 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="size-8" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-black font-display text-foreground">
                    {celebrationModal.completedTier === "bruteForce"
                      ? "Brute Force Invariant Passed!"
                      : celebrationModal.completedTier === "better"
                      ? "Better Approach Solved!"
                      : "Optimal Solution Mastered!"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Complexity transition:{" "}
                    <strong className="text-foreground font-mono">
                      {celebrationModal.prevComplexity} → {celebrationModal.newComplexity}
                    </strong>
                  </p>
                </div>

                <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-xl leading-relaxed">
                  {celebrationModal.feedback}
                </p>

                <div className="pt-2">
                  <Button
                    size="default"
                    onClick={() => setCelebrationModal(null)}
                    className="w-full font-mono text-xs font-bold bg-primary text-primary-foreground"
                  >
                    {celebrationModal.nextTier ? `Advance to ${celebrationModal.nextTier.toUpperCase()} Approach` : "Continue Code Exploration"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* FEATURE 4 & 5: High-Priority Strike Warning Lockdown Modal */}
          {strikeModal?.isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
              <div className="w-full max-w-lg rounded-3xl border border-rose-500/50 bg-card p-6 shadow-2xl space-y-4">
                <div className="size-14 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
                  <ShieldAlert className="size-8 animate-pulse" />
                </div>

                <div className="text-center space-y-1">
                  <h3 className="text-xl font-black font-display text-rose-400">
                    {strikeModal.isTerminated ? "Interview Terminated" : `Proctoring Alert: Strike ${strikeModal.strikeNumber}/3`}
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    {strikeModal.reason}
                  </p>
                </div>

                <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 text-xs text-muted-foreground space-y-1.5 font-mono">
                  <p className="text-foreground font-bold">Proctoring Enforcement Rules:</p>
                  <ul className="list-disc list-inside space-y-1 text-[11px]">
                    <li>Tab switching, window unfocusing, and exiting full-screen are recorded.</li>
                    <li>3 cumulative strikes trigger instant session forfeiture.</li>
                    <li>Browser focus has been locked down until acknowledged.</li>
                  </ul>
                </div>

                <div className="pt-2">
                  {strikeModal.isTerminated ? (
                    <Button
                      size="default"
                      variant="destructive"
                      onClick={() => {
                        setStrikeModal(null);
                        handleConcludeInterview(true);
                      }}
                      className="w-full font-mono text-xs font-bold"
                    >
                      View Forfeited Evaluation Scorecard
                    </Button>
                  ) : (
                    <Button
                      size="default"
                      onClick={handleAcknowledgeStrike}
                      className="w-full font-mono text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      I Acknowledge & Return to Fullscreen
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      {/* STAGE 3: PHASE 4 POST-INTERVIEW DEBRIEF, CODE COMPARISON & PRACTICE ROADMAP */}
      {stage === "scorecard" && scorecard && (() => {
        const submissions = scorecard.questionSubmissions || [];
        const activeSub =
          submissions[selectedScorecardQuestionIdx] ||
          submissions[0] || {
            questionId: currentQuestion.id,
            questionTitle: currentQuestion.title,
            timeSpentSeconds: elapsedSeconds,
            tiersCompleted,
            tierCodes,
            tierEvaluations,
          };
        const inspectedQuestion =
          INTERVIEW_QUESTIONS.find((q) => q.id === activeSub.questionId) || currentQuestion;
        const referenceOptimalCode = getReferenceOptimalCode(inspectedQuestion, selectedLanguage);
        const candidateTierCode =
          activeSub.tierCodes?.[selectedScorecardTier] ||
          getTierStarterCode(inspectedQuestion, selectedScorecardTier, selectedLanguage);
        const candidateTierEval = activeSub.tierEvaluations?.[selectedScorecardTier] || null;
        const candidateTierPassed = Boolean(activeSub.tiersCompleted?.[selectedScorecardTier]);

        const recommendedFollowUps = getRecommendedFollowUpQuestions(
          submissions.map((s) => s.questionId),
          3
        );

        const wpm = scorecard.speechAnalysis.wordsPerMinute;
        const wpmStatus =
          wpm >= 105 && wpm <= 160
            ? { label: "Optimal Pace (105–160 WPM)", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" }
            : wpm > 160
              ? { label: "Rapid Pace (>160 WPM)", color: "text-amber-400 border-amber-500/30 bg-amber-500/10" }
              : { label: "Measured / Quiet (<105 WPM)", color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10" };

        const hiringBadgeClass =
          scorecard.hiringRecommendation === "Strong Hire"
            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
            : scorecard.hiringRecommendation === "Hire"
              ? "bg-primary/15 text-primary border-primary/40"
              : scorecard.hiringRecommendation === "Leaning Hire"
                ? "bg-amber-500/15 text-amber-400 border-amber-500/40"
                : "bg-rose-500/15 text-rose-400 border-rose-500/40";

        return (
          <main id="main-content" className="flex-1 flex justify-center p-4 sm:p-6 lg:p-8 bg-background">
            <div className="w-full max-w-6xl space-y-6">
              {/* Top Executive Header Card */}
              <div className="rounded-3xl border border-border/80 bg-card/90 p-6 sm:p-8 space-y-6 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-mono font-bold text-primary">
                      <Award className="size-3.5" />
                      Phase 4 FAANG Debrief • Multi-Question Performance Scorecard
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black font-display text-foreground">
                      {selectedTemplate.title} — Evaluation Report
                    </h2>
                    <p className="text-xs sm:text-sm font-mono text-muted-foreground">
                      Session Duration: {Math.max(1, Math.round(elapsedSeconds / 60))} min •{" "}
                      {submissions.length || 1} Question(s) Evaluated • Language:{" "}
                      <span className="text-foreground font-bold uppercase">{selectedLanguage}</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {scorecard.spokenClosingFeedback && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => speechSynthRef.current?.speak(scorecard.spokenClosingFeedback)}
                        className="font-mono text-xs gap-1.5"
                      >
                        <Volume2 className="size-3.5 text-primary" />
                        Replay Spoken Verdict
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleExportScorecardMarkdown}
                      className="font-mono text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                    >
                      <Download className="size-3.5" />
                      Export Markdown Report
                    </Button>
                  </div>
                </div>

                {/* 4-Pillar Score Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4 space-y-1.5">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary">
                      Overall Hiring Rating
                    </div>
                    <div className="text-3xl sm:text-4xl font-black text-foreground">
                      {scorecard.overallScore}
                      <span className="text-xs text-muted-foreground font-normal"> / 10</span>
                    </div>
                    <span
                      className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold font-mono ${hiringBadgeClass}`}
                    >
                      {scorecard.hiringRecommendation}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-secondary/25 p-4 space-y-1.5">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                      Algorithmic Craft
                    </div>
                    <div className="text-3xl sm:text-4xl font-black text-foreground">
                      {scorecard.craftScore}
                      <span className="text-xs text-muted-foreground font-normal"> / 10</span>
                    </div>
                    <span className="inline-block text-[11px] font-mono text-muted-foreground">
                      Brute → Better → Optimal
                    </span>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-secondary/25 p-4 space-y-1.5">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                      Vocal & Communication
                    </div>
                    <div className="text-3xl sm:text-4xl font-black text-foreground">
                      {scorecard.confidenceScore}
                      <span className="text-xs text-muted-foreground font-normal"> / 10</span>
                    </div>
                    <span className="inline-block text-[11px] font-mono text-muted-foreground">
                      {scorecard.speechAnalysis.wordsPerMinute} WPM • Steadiness {scorecard.speechAnalysis.vocalSteadiness}/10
                    </span>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-secondary/25 p-4 space-y-1.5">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                      Proctoring Integrity
                    </div>
                    <div className="text-3xl sm:text-4xl font-black text-foreground">
                      {scorecard.integrityScore}
                      <span className="text-xs text-muted-foreground font-normal"> / 10</span>
                    </div>
                    <span className="inline-block text-[11px] font-mono text-muted-foreground">
                      {scorecard.proctoringSummary.strikes}/3 Strikes • {scorecard.proctoringSummary.tabSwitches} Tab Switches
                    </span>
                  </div>
                </div>

                {/* Executive Summary & Spoken Closing Feedback */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-left">
                  <div className="lg:col-span-2 rounded-2xl border border-border/70 bg-muted/20 p-4 sm:p-5 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-primary">
                      <Brain className="size-4" />
                      Lead Evaluator Executive Debrief
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed">
                      {scorecard.executiveSummary}
                    </p>
                    {scorecard.spokenClosingFeedback && (
                      <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 text-xs font-mono text-muted-foreground italic">
                        <span className="font-bold text-primary not-italic">Spoken Closing Feedback: </span>
                        "{scorecard.spokenClosingFeedback}"
                      </div>
                    )}
                  </div>

                  {/* Complexity Tier Progression Summary */}
                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 sm:p-5 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-foreground">
                      <Layers className="size-4 text-primary" />
                      Complexity Tier Rubric
                    </div>
                    <div className="space-y-2">
                      {(
                        [
                          { key: "bruteForce", label: "1. Brute Force", data: scorecard.tierBreakdown.bruteForce },
                          { key: "better", label: "2. Better Approach", data: scorecard.tierBreakdown.better },
                          { key: "optimal", label: "3. Optimal Solution", data: scorecard.tierBreakdown.optimal },
                        ] as const
                      ).map((tierItem) => (
                        <div
                          key={tierItem.key}
                          className={`rounded-xl border p-2.5 text-xs ${
                            tierItem.data.completed
                              ? "border-emerald-500/35 bg-emerald-500/10"
                              : "border-border/60 bg-background/60"
                          }`}
                        >
                          <div className="flex items-center justify-between font-mono font-bold">
                            <span className={tierItem.data.completed ? "text-emerald-400" : "text-muted-foreground"}>
                              {tierItem.data.completed ? "✓ " : "○ "}
                              {tierItem.label}
                            </span>
                            <span className="text-[10px] text-foreground/80">
                              {tierItem.data.time} • {tierItem.data.space}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                            {tierItem.data.summary}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Top Strengths & Priority Areas for Growth (2-Column Rubric) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:p-5 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                      <CheckCircle2 className="size-4" />
                      Key Technical & Communication Strengths
                    </div>
                    <ul className="space-y-2">
                      {scorecard.topStrengths.map((strength, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-foreground/90">
                          <span className="text-emerald-400 font-bold mt-0.5">•</span>
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                      <Sparkles className="size-4" />
                      Actionable Areas for Growth
                    </div>
                    <ul className="space-y-2">
                      {scorecard.areasForGrowth.map((area, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-foreground/90">
                          <span className="text-amber-400 font-bold mt-0.5">→</span>
                          <span>{area}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Vocal Delivery Telemetry & Retained Audio Player */}
                <div className="rounded-2xl border border-border/80 bg-muted/15 p-4 sm:p-5 text-left space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-foreground">
                      <Radio className="size-4 text-primary" />
                      Communication & Vocal Delivery Telemetry
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-bold ${wpmStatus.color}`}>
                        {wpmStatus.label}
                      </span>
                      {conversationalChat.length > 0 && (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => setShowScorecardTranscript((prev) => !prev)}
                          className="font-mono text-[11px] gap-1"
                        >
                          <MessageSquare className="size-3" />
                          {showScorecardTranscript ? "Hide" : "View"} Coaching Transcript ({conversationalChat.length})
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-border/60 bg-background/70 p-3">
                      <div className="text-[10px] font-mono text-muted-foreground uppercase">Speaking Rate</div>
                      <div className="text-lg font-black font-mono text-foreground mt-0.5">
                        {scorecard.speechAnalysis.wordsPerMinute} <span className="text-xs font-normal text-muted-foreground">WPM</span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/70 p-3">
                      <div className="text-[10px] font-mono text-muted-foreground uppercase">Vocal Steadiness</div>
                      <div className="text-lg font-black font-mono text-foreground mt-0.5">
                        {scorecard.speechAnalysis.vocalSteadiness} <span className="text-xs font-normal text-muted-foreground">/ 10</span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/70 p-3">
                      <div className="text-[10px] font-mono text-muted-foreground uppercase">Filler Words</div>
                      <div className="text-lg font-black font-mono text-foreground mt-0.5">
                        {scorecard.speechAnalysis.fillerWordCount}{" "}
                        <span className="text-xs font-normal text-muted-foreground">detected</span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/70 p-3">
                      <div className="text-[10px] font-mono text-muted-foreground uppercase">Hesitation Pauses</div>
                      <div className="text-lg font-black font-mono text-foreground mt-0.5">
                        {scorecard.speechAnalysis.hesitationPauses}{" "}
                        <span className="text-xs font-normal text-muted-foreground">pauses</span>
                      </div>
                    </div>
                  </div>

                  {recordedAudioUrl && (
                    <div className="rounded-xl border border-border/70 bg-background/80 p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-mono text-xs font-bold text-foreground">
                          <Mic className="size-3.5 text-primary" />
                          <span>Retained Candidate Voice Recording (Opus WebM)</span>
                        </div>
                        <a
                          href={recordedAudioUrl}
                          download="interview_audio_recording.webm"
                          className="text-xs font-mono text-primary flex items-center gap-1 hover:underline"
                        >
                          <Download className="size-3" /> Download Audio
                        </a>
                      </div>
                      <audio controls src={recordedAudioUrl} className="w-full h-9" />
                    </div>
                  )}

                  {showScorecardTranscript && conversationalChat.length > 0 && (
                    <div className="rounded-xl border border-border/70 bg-background/90 p-3.5 max-h-60 overflow-y-auto space-y-2">
                      <div className="text-[10px] font-mono font-bold uppercase text-muted-foreground">
                        Session Dialogue Log
                      </div>
                      {conversationalChat.map((entry) => (
                        <div
                          key={entry.id}
                          className={`rounded-lg p-2.5 text-xs ${
                            entry.speaker === "interviewer"
                              ? "bg-primary/10 border border-primary/20 text-foreground"
                              : "bg-secondary/40 border border-border/60 text-foreground/90"
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground mb-1">
                            <span className="font-bold uppercase">
                              {entry.speaker === "interviewer" ? "AI Interviewer" : "Candidate"}
                            </span>
                            <span>{entry.timestamp}</span>
                          </div>
                          <p className="leading-relaxed">{entry.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Interactive Per-Question Code Review & Side-by-Side Reference Optimal Solution */}
                <div className="rounded-2xl border border-border/80 bg-muted/15 p-4 sm:p-6 text-left space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-primary">
                        <Code2 className="size-4" />
                        Interactive Code Review & FAANG Reference Optimal Comparison
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Compare your submitted implementation against the clean FAANG reference optimal solution in{" "}
                        <span className="font-mono font-bold text-foreground uppercase">{selectedLanguage}</span>.
                      </p>
                    </div>

                    {/* Question Selector Tabs */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {submissions.map((sub, idx) => (
                        <button
                          key={sub.questionId + idx}
                          type="button"
                          onClick={() => setSelectedScorecardQuestionIdx(idx)}
                          className={`rounded-xl border px-3 py-1.5 text-xs font-mono transition-all ${
                            selectedScorecardQuestionIdx === idx
                              ? "border-primary bg-primary/15 text-primary font-bold shadow-sm"
                              : "border-border/70 bg-background/70 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Q{idx + 1}: {sub.questionTitle} ({Math.max(1, Math.round(sub.timeSpentSeconds / 60))}m)
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tier Selector for Candidate Code */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-y border-border/60 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono text-muted-foreground mr-1">Inspect Your Tier:</span>
                      {(
                        [
                          { id: "bruteForce", label: "Brute Force", passed: activeSub.tiersCompleted?.bruteForce },
                          { id: "better", label: "Better", passed: activeSub.tiersCompleted?.better },
                          { id: "optimal", label: "Optimal", passed: activeSub.tiersCompleted?.optimal },
                        ] as const
                      ).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedScorecardTier(t.id)}
                          className={`rounded-lg border px-2.5 py-1 text-xs font-mono flex items-center gap-1.5 transition-all ${
                            selectedScorecardTier === t.id
                              ? "border-primary bg-primary/15 text-primary font-bold"
                              : "border-border/60 bg-background/60 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <span className={t.passed ? "text-emerald-400" : "text-muted-foreground"}>
                            {t.passed ? "✓" : "○"}
                          </span>
                          {t.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-xs font-mono text-muted-foreground">
                        Target Optimal:{" "}
                        <span className="text-emerald-400 font-bold">
                          {inspectedQuestion.tierDetails.optimal.targetTime}
                        </span>{" "}
                        time •{" "}
                        <span className="text-emerald-400 font-bold">
                          {inspectedQuestion.tierDetails.optimal.targetSpace}
                        </span>{" "}
                        space
                      </div>
                      <Link
                        to="/problem/$slug"
                        params={{ slug: inspectedQuestion.slug }}
                        className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-mono font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        <ExternalLink className="size-3" />
                        Open in Visualizer
                      </Link>
                    </div>
                  </div>

                  {candidateTierEval && (
                    <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between font-mono font-bold text-primary">
                        <span>
                          Evaluator Notes ({candidateTierEval.tierClassification} • {candidateTierEval.timeComplexity} time,{" "}
                          {candidateTierEval.spaceComplexity} space)
                        </span>
                        <span>{candidateTierEval.passed ? "Verified ✓" : "Needs Refinement"}</span>
                      </div>
                      <p className="text-foreground/90">{candidateTierEval.writtenNotes}</p>
                    </div>
                  )}

                  {/* Side-by-Side Code Comparison Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Left: Candidate Submitted Code */}
                    <div className="rounded-xl border border-border/80 bg-background/90 overflow-hidden flex flex-col">
                      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/60 bg-muted/30">
                        <div className="flex items-center gap-2 text-xs font-mono font-bold text-foreground">
                          <Terminal className="size-3.5 text-primary" />
                          <span>
                            Your {selectedScorecardTier === "bruteForce" ? "Brute Force" : selectedScorecardTier === "better" ? "Better" : "Optimal"} Code
                          </span>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-bold ${
                            candidateTierPassed
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {candidateTierPassed ? "Tier Verified ✓" : "Draft / Unverified"}
                        </span>
                      </div>
                      <pre className="p-3.5 text-xs font-mono text-foreground/90 overflow-x-auto max-h-80 leading-relaxed">
                        <code>{candidateTierCode}</code>
                      </pre>
                    </div>

                    {/* Right: FAANG Reference Optimal Code */}
                    <div className="rounded-xl border border-emerald-500/35 bg-background/90 overflow-hidden flex flex-col">
                      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-emerald-500/25 bg-emerald-500/10">
                        <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400">
                          <Sparkles className="size-3.5" />
                          <span>
                            FAANG Reference Optimal ({inspectedQuestion.tierDetails.optimal.targetTime} /{" "}
                            {inspectedQuestion.tierDetails.optimal.targetSpace})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(referenceOptimalCode);
                            setCopiedReferenceCode(true);
                            toast.success("Copied Reference Optimal Solution!");
                            setTimeout(() => setCopiedReferenceCode(false), 2000);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300 hover:bg-emerald-500/20"
                        >
                          {copiedReferenceCode ? <Check className="size-3" /> : <Copy className="size-3" />}
                          {copiedReferenceCode ? "Copied" : "Copy Code"}
                        </button>
                      </div>
                      <pre className="p-3.5 text-xs font-mono text-emerald-100/95 overflow-x-auto max-h-80 leading-relaxed">
                        <code>{referenceOptimalCode}</code>
                      </pre>
                      <div className="px-3.5 py-2.5 border-t border-border/60 bg-muted/20 text-[11px] text-muted-foreground">
                        <span className="font-mono font-bold text-foreground">Key Invariant: </span>
                        {inspectedQuestion.tierDetails.optimal.guidance}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personalized Next-Step Practice Roadmap */}
                {recommendedFollowUps.length > 0 && (
                  <div className="rounded-2xl border border-border/80 bg-muted/15 p-4 sm:p-6 text-left space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-primary">
                          <Flame className="size-4" />
                          Recommended Next-Step Practice Problems
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Curated follow-up problems to reinforce{" "}
                          <span className="font-mono text-foreground">{inspectedQuestion.topic}</span> and sharpen
                          your optimal complexity instincts.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      {recommendedFollowUps.map((recQ) => (
                        <div
                          key={recQ.id}
                          className="rounded-2xl border border-border/70 bg-background/80 p-4 flex flex-col justify-between gap-3 hover:border-primary/50 transition-all"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-bold ${
                                  recQ.difficulty === "Easy"
                                    ? "bg-emerald-500/15 text-emerald-400"
                                    : recQ.difficulty === "Medium"
                                      ? "bg-amber-500/15 text-amber-400"
                                      : "bg-rose-500/15 text-rose-400"
                                }`}
                              >
                                {recQ.difficulty}
                              </span>
                              <span className="text-[10px] font-mono text-muted-foreground">
                                Optimal: {recQ.tierDetails.optimal.targetTime}
                              </span>
                            </div>
                            <h4 className="font-bold text-sm text-foreground">{recQ.title}</h4>
                            <div className="flex flex-wrap gap-1">
                              <span className="rounded-md bg-secondary/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                                {recQ.topic}
                              </span>
                            </div>
                            {recQ.companyTags && recQ.companyTags.length > 0 && (
                              <div className="text-[10px] font-mono text-primary/90">
                                Asked at: {recQ.companyTags.slice(0, 4).join(" • ")}
                              </div>
                            )}
                          </div>

                          <Button
                            size="xs"
                            onClick={() => handlePracticeRecommendedQuestion(recQ)}
                            className="w-full font-mono text-xs font-bold gap-1.5 mt-1"
                          >
                            <Play className="size-3" />
                            Practice This Problem Next
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bottom Action Footer */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <Button
                    size="default"
                    onClick={() => {
                      setStage("setup");
                      setScorecard(null);
                    }}
                    className="font-mono text-xs font-bold gap-2"
                  >
                    <RotateCcw className="size-3.5" /> Start Another Interview Round
                  </Button>
                  <Button
                    size="default"
                    variant="outline"
                    onClick={handleExportScorecardMarkdown}
                    className="font-mono text-xs font-bold gap-2"
                  >
                    <Download className="size-3.5" /> Download Markdown Report
                  </Button>
                  <Link to="/">
                    <Button size="default" variant="outline" className="font-mono text-xs font-bold">
                      Return to Dashboard
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </main>
        );
      })()}

      <SiteFooter />
    </div>
  );
}
