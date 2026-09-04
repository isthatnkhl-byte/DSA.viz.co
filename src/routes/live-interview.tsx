import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Video,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRight,
  Maximize2,
  Minimize2,
  Layers,
  Sparkles,
  Shuffle,
  Play,
  RotateCcw,
  Check,
  X,
  Code2,
  FileCode2,
  Eye,
  Sliders,
  HelpCircle,
  Clock,
  Terminal,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Award,
  BarChart3,
  ShieldCheck,
  AlertCircle,
  Info,
  Radio,
  Send,
  Copy,
  Lightbulb,
  PhoneOff,
  VideoOff,
  XCircle,
  Lock,
  LogOut,
  AlertOctagon,
  FileWarning,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { saveInterviewSession, getLocalInterviewRating } from "@/lib/interview-rating";
import { runInterviewTests, type TestCaseResult } from "@/lib/interview-runner";
import {
  LIVE_INTERVIEW_PROBLEMS,
  generateLocalSocraticAnswer,
  type LiveInterviewProblem,
  type ProblemTier,
} from "@/data/live-interview-problems";
import {
  type VoiceProfileId,
  type VoiceProfile,
  VOICE_PROFILES,
  cleanTextForHumanSpeech,
  findBestVoice,
} from "@/lib/interview-speech";
import { toast } from "sonner";

export const Route = createFileRoute("/live-interview")({
  head: () => ({
    meta: [
      { title: "Live Interview Practice — DSA.viz" },
      {
        name: "description",
        content:
          "Proctored DSA live mock interview with real-time hardware webcam/microphone gating, spoken AI interviewer audio, anti-cheat monitoring, and 3-tier solution progression.",
      },
    ],
  }),
  component: LiveInterviewPage,
});

type InterviewPhase = "pre-check" | "in-session" | "scorecard";
type ProgrammingLang = "python" | "cpp" | "javascript" | "typescript";

interface ProctoringLogEntry {
  timestamp: string;
  type: "warning" | "strike" | "info";
  message: string;
}

interface DialogueEntry {
  speaker: "interviewer" | "system" | "candidate";
  text: string;
  timestamp: string;
}

function LiveInterviewPage() {
  const { user } = useAuth();

  // Current Interview Flow Phase
  const [phase, setPhase] = useState<InterviewPhase>("pre-check");

  // Call Telemetry & Controls
  const [callSeconds, setCallSeconds] = useState(0);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isDisqualified, setIsDisqualified] = useState(false);
  const [isForfeited, setIsForfeited] = useState(false);
  const [showForfeitModal, setShowForfeitModal] = useState(false);
  const [ratingUpdate, setRatingUpdate] = useState<{
    previousRating: number;
    newRating: number;
    ratingDelta: number;
  } | null>(null);

  // Testcase & Output Diff Solving Panel
  const [activeConsoleTab, setActiveConsoleTab] = useState<"testcases" | "diff" | "inquiry">("testcases");
  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useState(0);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testRunResults, setTestRunResults] = useState<TestCaseResult[] | null>(null);

  // Selected Problem
  const [problemIndex, setProblemIndex] = useState(0);
  const problem: LiveInterviewProblem = LIVE_INTERVIEW_PROBLEMS[problemIndex] || LIVE_INTERVIEW_PROBLEMS[0]!;

  // Current Solution Tier: 1 (Brute), 2 (Better), 3 (Optimal)
  const [currentTier, setCurrentTier] = useState<1 | 2 | 3>(1);
  const [completedTiers, setCompletedTiers] = useState<number[]>([]);

  // Code Editor State
  const [language, setLanguage] = useState<ProgrammingLang>("python");
  const [code, setCode] = useState<string>(problem.tiers[1].starterCode.python);

  // Hardware Camera & Microphone State
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [hasCamMicPermission, setHasCamMicPermission] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [audioBars, setAudioBars] = useState<number[]>([12, 18, 14, 25, 20, 15, 22, 30, 18, 12, 15, 10]);
  const [isMuted, setIsMuted] = useState(false); // Candidate mic mute

  // Spoken AI Interviewer State
  const [isAiMuted, setIsAiMuted] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [dialogueLog, setDialogueLog] = useState<DialogueEntry[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceProfile, setSelectedVoiceProfile] = useState<VoiceProfileId>("alex-male");

  // Real-time browser voice synchronization
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const syncVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        setAvailableVoices(v);
      }
    };

    syncVoices();
    window.speechSynthesis.onvoiceschanged = syncVoices;

    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Quick voice audition for candidate pre-check
  const testVoiceProfile = useCallback(
    (profileId: VoiceProfileId) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      try {
        window.speechSynthesis.cancel();
        const testPhrase =
          profileId === "alex-male"
            ? "Hello! I'm Alex. Let's analyze your algorithmic approach and time complexity today."
            : profileId === "sarah-female"
            ? "Hi there! I'm Sarah. I'll be your interviewer today. Focus on edge cases and optimal data structures."
            : profileId === "david-british"
            ? "Good day! I'm David. Walk me through your thoughts and invariant reasoning as you code."
            : "Hello! System voice check complete. We are ready to begin your technical interview.";

        const utterance = new SpeechSynthesisUtterance(testPhrase);
        const currentVoices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();
        const bestVoice = findBestVoice(currentVoices, profileId);
        if (bestVoice) utterance.voice = bestVoice;

        if (profileId === "alex-male") {
          utterance.rate = 1.02;
          utterance.pitch = 0.98;
        } else if (profileId === "sarah-female") {
          utterance.rate = 1.02;
          utterance.pitch = 1.02;
        } else if (profileId === "david-british") {
          utterance.rate = 0.98;
          utterance.pitch = 0.97;
        } else {
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
        }

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn("Test voice error:", err);
      }
    },
    [availableVoices],
  );

  // Spoken Voice Questions & Audio Inquiry State
  const [candidateSpeechTranscript, setCandidateSpeechTranscript] = useState("");
  const [typedQuestion, setTypedQuestion] = useState("");
  const [isProcessingQuestion, setIsProcessingQuestion] = useState(false);
  const [lastCandidateQuestion, setLastCandidateQuestion] = useState<string | null>(null);
  const [lastInterviewerAnswer, setLastInterviewerAnswer] = useState<string | null>(null);

  // Spoken Speech Recording & Confident Speech Telemetry
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [candidateSpokenUtterances, setCandidateSpokenUtterances] = useState<
    Array<{ text: string; time: string; answer?: string }>
  >([]);

  // Reference Solution Modal & Consultation Tracking
  const [showReferenceSolutionModal, setShowReferenceSolutionModal] = useState(false);
  const [referenceSolutionsViewedCount, setReferenceSolutionsViewedCount] = useState(0);
  const [copiedReference, setCopiedReference] = useState(false);

  // Proctoring & Anti-Cheat Monitor State
  const [strikes, setStrikes] = useState<number>(0);
  const [proctoringLog, setProctoringLog] = useState<ProctoringLogEntry[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showComplianceDrawer, setShowComplianceDrawer] = useState(false);

  // Behavioral & Audio Telemetry
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [tierStartTimes, setTierStartTimes] = useState<Record<number, number>>({ 1: Date.now() });
  const [tierDurations, setTierDurations] = useState<Record<number, number>>({});
  const [keystrokeCount, setKeystrokeCount] = useState(0);
  const [speakingSeconds, setSpeakingSeconds] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);

  // Evaluation & Validation
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const floatingVideoRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const recognitionRef = useRef<any>(null);
  const isAiSpeakingRef = useRef<boolean>(false);
  const isProcessingQuestionRef = useRef<boolean>(false);
  const isRecognitionRunningRef = useRef<boolean>(false);
  const isMutedRef = useRef<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Sync mute ref
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Ensure AudioContext is resumed upon any user interaction
  useEffect(() => {
    const resumeAudio = () => {
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume().catch(() => {});
      }
    };
    window.addEventListener("pointerdown", resumeAudio);
    window.addEventListener("keydown", resumeAudio);
    return () => {
      window.removeEventListener("pointerdown", resumeAudio);
      window.removeEventListener("keydown", resumeAudio);
    };
  }, []);

  // Update starter code when problem or language or tier changes
  useEffect(() => {
    if (phase === "pre-check") {
      setCode(problem.tiers[1].starterCode[language]);
    } else {
      setCode(problem.tiers[currentTier].starterCode[language]);
    }
  }, [problemIndex, language, currentTier, phase]);

  // Active Call Timer
  useEffect(() => {
    if (phase !== "in-session") return;
    const interval = setInterval(() => {
      setCallSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // Candidate Video Toggle
  const handleToggleVideo = useCallback(() => {
    setIsVideoOff((prev) => {
      const next = !prev;
      if (mediaStream) {
        mediaStream.getVideoTracks().forEach((track) => {
          track.enabled = !next;
        });
      }
      toast.info(next ? "Camera turned off." : "Camera turned on.", { duration: 2000 });
      return next;
    });
  }, [mediaStream]);

  // Formatted Call Duration String (MM:SS)
  const formattedCallDuration = useMemo(() => {
    const mins = Math.floor(callSeconds / 60);
    const secs = callSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, [callSeconds]);

  // Run Code against Current Tier Test Cases with Output Diff
  const handleRunTests = useCallback(async () => {
    setIsRunningTests(true);
    setValidationError(null);

    try {
      const runOutput = await runInterviewTests({
        code,
        language,
        problem,
        currentTier,
      });

      setTestRunResults(runOutput.results);
      if (runOutput.allPassed) {
        toast.success(`All ${runOutput.totalCount} test cases passed! (Runtime: ${runOutput.results[0]?.runtimeMs || 2}ms)`);
        setActiveConsoleTab("testcases");
      } else {
        const failed = runOutput.results.find((r) => !r.passed);
        toast.error(`Test case failed: ${failed?.error || "Output did not match expected"}`);
        setActiveConsoleTab("diff");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to execute tests.");
    } finally {
      setIsRunningTests(false);
    }
  }, [code, language, currentTier, problem]);

  // Voice Synthesizer Helper with Natural Voicepack Tuning
  const speakAloud = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

      // Add to dialogue log (preserves markdown in UI transcript)
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setDialogueLog((prev) => [...prev, { speaker: "interviewer", text, timestamp: timeStr }]);

      if (isAiMuted) return;

      try {
        window.speechSynthesis.cancel();
        const spokenText = cleanTextForHumanSpeech(text);
        const utterance = new SpeechSynthesisUtterance(spokenText);

        // Select natural human voicepack
        const currentVoices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();
        const bestVoice = findBestVoice(currentVoices, selectedVoiceProfile);
        if (bestVoice) utterance.voice = bestVoice;

        // Custom pitch & rate profile for human cadence
        if (selectedVoiceProfile === "alex-male") {
          utterance.rate = 1.02;
          utterance.pitch = 0.98;
        } else if (selectedVoiceProfile === "sarah-female") {
          utterance.rate = 1.02;
          utterance.pitch = 1.02;
        } else if (selectedVoiceProfile === "david-british") {
          utterance.rate = 0.98;
          utterance.pitch = 0.97;
        } else {
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
        }

        utterance.onstart = () => {
          isAiSpeakingRef.current = true;
          setIsAiSpeaking(true);
          if (recognitionRef.current && isRecognitionRunningRef.current) {
            try {
              recognitionRef.current.stop();
            } catch {}
            isRecognitionRunningRef.current = false;
          }
        };

        utterance.onend = () => {
          isAiSpeakingRef.current = false;
          setIsAiSpeaking(false);
          // Resume speech recognition after speech synthesis finishes
          setTimeout(() => {
            if (
              phase === "in-session" &&
              !isMutedRef.current &&
              recognitionRef.current &&
              !isRecognitionRunningRef.current
            ) {
              try {
                recognitionRef.current.start();
                isRecognitionRunningRef.current = true;
              } catch {}
            }
          }, 350);
        };

        utterance.onerror = () => {
          isAiSpeakingRef.current = false;
          setIsAiSpeaking(false);
        };

        speechUtteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn("Speech synthesis error:", err);
      }
    },
    [isAiMuted, phase, availableVoices, selectedVoiceProfile],
  );

  // High-Precision Real-Time Time-Domain RMS and Multi-Band Frequency Audio Monitoring
  const setupAudioMonitoring = useCallback((stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }

      const audioCtx = new AudioCtx();
      if (audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {});
      }

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const timeDomainData = new Uint8Array(analyser.fftSize);
      const freqData = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        if (audioContextRef.current && audioContextRef.current.state === "suspended") {
          audioContextRef.current.resume().catch(() => {});
        }

        // If candidate has muted their mic, zero out levels and bars immediately
        if (isMutedRef.current) {
          setAudioLevel(0);
          setAudioBars([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
          animFrameRef.current = requestAnimationFrame(checkVolume);
          return;
        }

        analyserRef.current.getByteTimeDomainData(timeDomainData);
        let sumSquares = 0;
        for (let i = 0; i < timeDomainData.length; i++) {
          const val = timeDomainData[i] ?? 128;
          const norm = (val - 128) / 128;
          sumSquares += norm * norm;
        }
        const rms = Math.sqrt(sumSquares / timeDomainData.length);
        // Instant conversational speech RMS normalized to 0-100%
        const normalized = Math.min(100, Math.round(rms * 400));
        setAudioLevel(normalized);

        // Real-time 12-band frequency spectrum for dynamic equalizer visualization
        analyserRef.current.getByteFrequencyData(freqData);
        const barCount = 12;
        const step = Math.max(1, Math.floor(freqData.length / barCount));
        const bars: number[] = [];
        for (let b = 0; b < barCount; b++) {
          const val = freqData[b * step] || 0;
          // Scale smoothly between 8% and 100%
          const pct = Math.min(100, Math.max(8, Math.round((val / 255) * 100)));
          bars.push(pct);
        }
        setAudioBars(bars);

        // Track candidate speaking duration (volume > 12 counts as active voice)
        if (normalized > 12) {
          setSpeakingSeconds((s) => s + 0.05);
        }

        animFrameRef.current = requestAnimationFrame(checkVolume);
      };

      animFrameRef.current = requestAnimationFrame(checkVolume);
    } catch (err) {
      console.warn("Audio monitoring setup error:", err);
    }
  }, []);

  // Hardware Camera & Mic Access
  const requestMediaPermissions = async () => {
    setPermissionError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser does not support mediaDevices getUserMedia API.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: true,
        },
      });

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error("No physical microphone track detected. Please connect or enable your microphone.");
      }
      audioTracks.forEach((track) => {
        track.enabled = !isMutedRef.current;
      });

      setMediaStream(stream);
      setHasCamMicPermission(true);

      // Attach stream to preview video immediately
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      setupAudioMonitoring(stream);
      toast.success("Camera & Microphone hardware connected successfully!");
    } catch (err: any) {
      console.error("Camera/Mic permission failed:", err);
      setPermissionError(
        err.message || "Failed to access camera or microphone. Please allow permissions in your browser address bar.",
      );
      toast.error("Camera or Microphone permission was denied.");
    }
  };

  // Candidate Mic Mute / Unmute Toggle Handler
  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      isMutedRef.current = next;

      if (mediaStream) {
        mediaStream.getAudioTracks().forEach((track) => {
          track.enabled = !next;
        });
      }

      if (next) {
        toast.info("Microphone Muted. The interviewer cannot hear you.", { duration: 2500 });
        if (recognitionRef.current && isRecognitionRunningRef.current) {
          try {
            recognitionRef.current.stop();
          } catch {}
          isRecognitionRunningRef.current = false;
        }
      } else {
        toast.success("Microphone Unmuted! The interviewer is actively listening to your speech.", {
          duration: 2500,
        });
        if (audioContextRef.current && audioContextRef.current.state === "suspended") {
          audioContextRef.current.resume().catch(() => {});
        }
        if (
          phase === "in-session" &&
          recognitionRef.current &&
          !isAiSpeakingRef.current &&
          !isRecognitionRunningRef.current
        ) {
          try {
            recognitionRef.current.start();
            isRecognitionRunningRef.current = true;
          } catch {}
        }
      }
      return next;
    });
  }, [mediaStream, phase]);

  // Auto-connect hardware if browser already granted permission
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return;

    if (navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const hasLabeledDevices = devices.some(
            (d) => (d.kind === "videoinput" || d.kind === "audioinput") && d.label.length > 0,
          );
          if (hasLabeledDevices && phase === "pre-check" && !hasCamMicPermission) {
            requestMediaPermissions().catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, [phase, hasCamMicPermission]);

  // Synchronize preview video element in pre-check phase
  useEffect(() => {
    if (phase === "pre-check" && videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
      videoRef.current.play().catch(() => {});
    }
  }, [phase, mediaStream, hasCamMicPermission]);

  // Synchronize floating video in in-session phase
  useEffect(() => {
    if (phase === "in-session" && floatingVideoRef.current && mediaStream) {
      floatingVideoRef.current.srcObject = mediaStream;
      floatingVideoRef.current.play().catch(() => {});
    }
  }, [phase, mediaStream]);

  // MediaRecorder: Record candidate voice throughout the live interview session for confidence evaluation
  useEffect(() => {
    if (phase !== "in-session" || !mediaStream) return;

    try {
      const audioTracks = mediaStream.getAudioTracks();
      if (audioTracks.length === 0) return;

      audioChunksRef.current = [];
      const mimeTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
      const supportedMime = mimeTypes.find((m) => {
        try {
          return typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m);
        } catch {
          return false;
        }
      }) || "";

      const options = supportedMime ? { mimeType: supportedMime } : undefined;
      const recorder = new MediaRecorder(mediaStream, options);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          const mime = supportedMime || "audio/webm";
          const audioBlob = new Blob(audioChunksRef.current, { type: mime });
          const url = URL.createObjectURL(audioBlob);
          setRecordedAudioUrl(url);
        }
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
    } catch (err) {
      console.warn("MediaRecorder initialization notice:", err);
    }

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
    };
  }, [phase, mediaStream]);

  // Socratic Voice & Text Question Handler (Real-Time Inquiries & Socratic Doubts)
  const handleCandidateVoiceQuestion = useCallback(
    async (rawQuestion: string) => {
      const q = rawQuestion.trim();
      if (!q || isProcessingQuestionRef.current || isAiSpeakingRef.current) return;

      if (q.length < 3 || q.toLowerCase() === lastCandidateQuestion?.toLowerCase()) {
        return;
      }

      isProcessingQuestionRef.current = true;
      setIsProcessingQuestion(true);
      setLastCandidateQuestion(q);
      setCandidateSpeechTranscript("");

      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setDialogueLog((prev) => [...prev, { speaker: "candidate", text: q, timestamp: timeStr }]);

      // Temporarily pause recognition while processing response
      if (recognitionRef.current && isRecognitionRunningRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
        isRecognitionRunningRef.current = false;
      }

      try {
        const lowerQ = q.toLowerCase();

        // 1. Strict Out-of-Context Detection
        const isOutOfContext =
          /weather|rain|sunny|forecast|cricket|football|soccer|super bowl|messi|ronaldo|nba|movie|song|music|singer|president|election|politics|crypto|bitcoin|tell me a joke|are you single|dating|restaurant|lunch|dinner|game of thrones|minecraft|fortnite/i.test(
            lowerQ,
          ) && !/temperature|array|integer|number|price/i.test(lowerQ);

        let socraticAnswer = "";

        if (isOutOfContext) {
          socraticAnswer = `Let's stay focused on our technical interview today. What approach are you planning to take for ${problem.title}?`;
          setProctoringLog((prev) => [
            {
              timestamp: timeStr,
              type: "warning",
              message: `Off-topic spoken inquiry detected: "${q.slice(0, 45)}..."`,
            },
            ...prev,
          ]);
        } else {
          // 2. Call backend /api/interview/chat with candidate code, constraints, and active tier context
          let aiResponseText = "";
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const res = await fetch("/api/interview/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: controller.signal,
              body: JSON.stringify({
                question: q,
                problemTitle: problem.title,
                problemSlug: problem.slug,
                difficulty: problem.difficulty,
                category: problem.category,
                currentTier,
                tierName: problem.tiers[currentTier].name,
                tierComplexity: problem.tiers[currentTier].complexityTag,
                tierObjective: problem.tiers[currentTier].objective,
                constraints: problem.constraints,
                userCode: code,
              }),
            });

            clearTimeout(timeoutId);
            if (res.ok) {
              const data = await res.json();
              const reply = data?.content || data?.answer;
              if (reply) {
                aiResponseText = reply.trim();
              }
            } else {
              // Fallback to /api/chat if dedicated endpoint returns non-OK
              const fallbackRes = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  messages: [{ role: "user", content: q }],
                  role: "interviewer",
                  context: {
                    problemTitle: problem.title,
                    currentTier,
                    objective: problem.tiers[currentTier].objective,
                  },
                }),
              });
              if (fallbackRes.ok) {
                const fbData = await fallbackRes.json();
                if (fbData && fbData.content) {
                  aiResponseText = fbData.content.trim();
                }
              }
            }
          } catch {
            // Offline or timeout fallback
          }

          if (aiResponseText && aiResponseText.length > 10) {
            socraticAnswer = aiResponseText;
          } else {
            // Local Socratic Intelligence Engine (Instant 0ms Problem-Aware Fallback)
            socraticAnswer = generateLocalSocraticAnswer(lowerQ, problem, currentTier);
          }
        }

        setLastInterviewerAnswer(socraticAnswer);
        setCandidateSpokenUtterances((prev) => [
          ...prev,
          { text: q, time: timeStr, answer: socraticAnswer },
        ]);
        speakAloud(socraticAnswer);
      } finally {
        isProcessingQuestionRef.current = false;
        setIsProcessingQuestion(false);
      }
    },
    [problem, currentTier, lastCandidateQuestion, speakAloud, code],
  );

  // Web Speech Recognition: Real-time Audio Listener
  useEffect(() => {
    if (phase !== "in-session" || isMuted) {
      if (recognitionRef.current && isRecognitionRunningRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
        isRecognitionRunningRef.current = false;
      }
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    let recognition: any;
    try {
      recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;
    } catch {
      return;
    }

    let speechTimer: any = null;

    recognition.onstart = () => {
      isRecognitionRunningRef.current = true;
    };

    recognition.onresult = (event: any) => {
      if (isAiSpeakingRef.current || isProcessingQuestionRef.current || isMutedRef.current) return;

      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      const spoken = (final || interim).trim();
      if (spoken) {
        setCandidateSpeechTranscript(spoken);

        clearTimeout(speechTimer);
        speechTimer = setTimeout(() => {
          if (!isAiSpeakingRef.current && !isProcessingQuestionRef.current && !isMutedRef.current) {
            handleCandidateVoiceQuestion(spoken);
          }
        }, 1200);
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error !== "no-speech") {
        console.warn("Speech recognition notice:", e.error);
      }
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        isRecognitionRunningRef.current = false;
      }
    };

    recognition.onend = () => {
      isRecognitionRunningRef.current = false;
      // Restart cleanly with debounce if unmuted and in session
      if (phase === "in-session" && !isAiSpeakingRef.current && !isMutedRef.current && recognitionRef.current) {
        setTimeout(() => {
          if (
            phase === "in-session" &&
            !isAiSpeakingRef.current &&
            !isMutedRef.current &&
            !isRecognitionRunningRef.current &&
            recognitionRef.current
          ) {
            try {
              recognitionRef.current.start();
              isRecognitionRunningRef.current = true;
            } catch {}
          }
        }, 250);
      }
    };

    try {
      recognition.start();
      isRecognitionRunningRef.current = true;
    } catch {}

    return () => {
      clearTimeout(speechTimer);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
        isRecognitionRunningRef.current = false;
        recognitionRef.current = null;
      }
    };
  }, [phase, isMuted, handleCandidateVoiceQuestion]);

  // Sync floating video in in-session phase
  useEffect(() => {
    if (phase === "in-session" && floatingVideoRef.current && mediaStream) {
      floatingVideoRef.current.srcObject = mediaStream;
      floatingVideoRef.current.play().catch(() => {});
    }
  }, [phase, mediaStream]);

  // Clean up streams & speech on unmount
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [mediaStream]);

  // Record Proctoring Alert
  const recordViolation = useCallback(
    (type: "warning" | "strike", message: string) => {
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setProctoringLog((prev) => [{ timestamp: timeStr, type, message }, ...prev]);

      if (type === "strike") {
        setStrikes((s) => {
          const nextStrikes = s + 1;
          if (nextStrikes >= 3) {
            setIsDisqualified(true);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
              try {
                mediaRecorderRef.current.stop();
              } catch {}
            }
            if (recognitionRef.current) {
              try {
                recognitionRef.current.stop();
              } catch {}
            }
            speakAloud("Attention. You have accumulated 3 proctoring strikes. The interview has been terminated for compliance review.");
            toast.error("SESSION TERMINATED: 3 proctoring strikes reached. Disqualification recorded.", {
              duration: 6000,
            });
            setPhase("scorecard");
            return nextStrikes;
          }

          speakAloud(`Warning. Tab switch or window blur detected. Strike ${nextStrikes} of 3.`);
          toast.error(`PROCTORING ALERT: Strike ${nextStrikes}/3. Please remain on this screen.`, {
            duration: 4000,
          });
          return nextStrikes;
        });
      } else {
        toast.warning(message, { duration: 3000 });
      }
    },
    [speakAloud],
  );

  // Strict Anti-Cheat Event Listeners (Full-screen, Tab switch, Blur, Mouse exit, Paste)
  useEffect(() => {
    if (phase !== "in-session") return;

    // 1. Visibility change (tab switch)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation("strike", "Candidate switched tabs or minimized browser window.");
      }
    };

    // 2. Window blur (click outside browser / devtools / alt-tab)
    const handleBlur = () => {
      recordViolation("strike", "Browser window lost active focus.");
    };

    // 3. Mouse exit window boundary
    const handleMouseLeave = () => {
      recordViolation("warning", "Cursor exited interview workspace boundaries.");
    };

    // 4. Clipboard paste interception
    const handlePaste = (e: ClipboardEvent) => {
      const pastedData = e.clipboardData?.getData("text") || "";
      if (pastedData.length > 50) {
        recordViolation("warning", `External clipboard paste detected (${pastedData.length} characters).`);
      }
    };

    // 5. Fullscreen change detection
    const handleFullscreenChange = () => {
      const inFull = Boolean(document.fullscreenElement);
      setIsFullscreen(inFull);
      if (!inFull) {
        recordViolation("strike", "Candidate exited full screen mode.");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("paste", handlePaste);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("paste", handlePaste);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [phase, recordViolation]);

  // Start Session
  const handleStartSession = async () => {
    if (!hasCamMicPermission) {
      toast.error("Please grant camera and microphone access to enter the proctored interview.");
      return;
    }

    if (audioContextRef.current && audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume().catch(() => {});
    }
    if (mediaStream && (!audioContextRef.current || audioContextRef.current.state === "closed")) {
      setupAudioMonitoring(mediaStream);
    }

    // Try full screen
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch {
      // Fullscreen might be blocked by browser policy without immediate gesture
    }

    const now = Date.now();
    hasSavedSessionRef.current = false;
    setRatingUpdate(null);
    setIsDisqualified(false);
    setTestRunResults(null);
    setSessionStartTime(now);
    setTierStartTimes({ 1: now });
    setCurrentTier(1);
    setCompletedTiers([]);
    setStrikes(0);
    setProctoringLog([
      {
        timestamp: new Date().toLocaleTimeString(),
        type: "info",
        message: "Proctored live interview session started. Camera, microphone, and anti-cheat active.",
      },
    ]);
    setPhase("in-session");

    // Welcome speech
    setTimeout(() => {
      speakAloud(problem.welcomeSpeech);
    }, 800);
  };

  // Submit Current Tier Solution
  const handleSubmitTier = async () => {
    setIsEvaluating(true);
    setValidationError(null);

    try {
      const runOutput = await runInterviewTests({
        code,
        language,
        problem,
        currentTier,
      });

      setTestRunResults(runOutput.results);

      if (!runOutput.allPassed) {
        const failed = runOutput.results.find((r) => !r.passed);
        const errorMsg = failed?.error
          ? `Test case ${failed.index} failed: ${failed.error}`
          : `Test case ${failed?.index || 1} did not produce expected output. Please check the Execution Diff panel below.`;
        setValidationError(errorMsg);
        setActiveConsoleTab("diff");
        speakAloud("I noticed your solution didn't pass all test cases. Please inspect the output difference before submitting.");
        toast.error("Submission rejected: All test cases must pass.");
        return;
      }

      // Check if it's Tier 1, 2, or 3
      const activeTierSpec = problem.tiers[currentTier];
      const now = Date.now();
      const startTime = tierStartTimes[currentTier] || now;
      const duration = Math.round((now - startTime) / 1000);
      setTierDurations((prev) => ({ ...prev, [currentTier]: duration }));

      if (currentTier === 1) {
        // Completed Tier 1 -> Move to Tier 2
        setCompletedTiers((prev) => [...prev, 1]);
        toast.success("Tier 1: Brute Force Accepted! All test cases passed.");
        speakAloud(activeTierSpec.interviewerPraise + " " + activeTierSpec.nextPrompt);
        setCurrentTier(2);
        setTierStartTimes((prev) => ({ ...prev, 2: Date.now() }));
        setTestRunResults(null);
      } else if (currentTier === 2) {
        // Completed Tier 2 -> Move to Tier 3
        setCompletedTiers((prev) => [...prev, 2]);
        toast.success("Tier 2: Better Approach Accepted! All test cases passed.");
        speakAloud(activeTierSpec.interviewerPraise + " " + activeTierSpec.nextPrompt);
        setCurrentTier(3);
        setTierStartTimes((prev) => ({ ...prev, 3: Date.now() }));
        setTestRunResults(null);
      } else if (currentTier === 3) {
        // Completed Tier 3 -> Stop audio recording & Move to Final Scorecard!
        setCompletedTiers((prev) => [...prev, 3]);
        toast.success("Tier 3: Optimal Solution Accepted! Technical Interview Passed!");
        speakAloud(activeTierSpec.interviewerPraise + " " + activeTierSpec.nextPrompt);

        setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            try {
              mediaRecorderRef.current.stop();
            } catch {}
          }
          setPhase("scorecard");
        }, 1800);
      }
    } catch (err: any) {
      setValidationError(err?.message || "Execution verification error occurred.");
      toast.error(err?.message || "Evaluation error.");
    } finally {
      setIsEvaluating(false);
    }
  };

  // Request a subtle hint
  const handleRequestHint = () => {
    setHintsUsed((h) => h + 1);
    const hints = problem.tiers[currentTier].socraticHints;
    const selectedHint = hints[hintsUsed % hints.length] || hints[0]!;
    speakAloud(`Here is a thought: ${selectedHint}`);
  };

  // Reset editor to starter skeleton
  const handleResetSkeleton = useCallback(() => {
    setCode(problem.tiers[currentTier].starterCode[language]);
    toast.info(`Editor reset to Tier ${currentTier} starter skeleton.`, { duration: 2500 });
  }, [problem, currentTier, language]);

  // Open reference solution modal
  const handleOpenReferenceSolution = useCallback(() => {
    setShowReferenceSolutionModal(true);
    setReferenceSolutionsViewedCount((prev) => prev + 1);
    toast.info("Viewing reference solution noted in evaluation log.", { duration: 2500 });
  }, []);

  // Copy reference solution to clipboard
  const handleCopyReference = useCallback(() => {
    const refCode = problem.tiers[currentTier].referenceSolution?.[language];
    if (refCode) {
      navigator.clipboard.writeText(refCode);
      setCopiedReference(true);
      toast.success("Reference solution copied to clipboard!");
      setTimeout(() => setCopiedReference(false), 2000);
    }
  }, [problem, currentTier, language]);

  // Re-roll question in pre-check
  const handleRandomizeProblem = () => {
    const nextIdx = (problemIndex + 1) % LIVE_INTERVIEW_PROBLEMS.length;
    setProblemIndex(nextIdx);
  };

  // Concede / Forfeit interview early
  const handleConfirmForfeit = useCallback(() => {
    setShowForfeitModal(false);
    setIsForfeited(true);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    speakAloud("Interview session forfeited early by candidate. Proceeding to evaluation debrief.");
    toast.error("INTERVIEW FORFEITED: Conceded before solving. Penalty applied.", {
      duration: 5000,
    });
    setPhase("scorecard");
  }, [speakAloud]);

  // Scorecard Calculations (Strict FAANG Hiring Bar out of 10)
  const scorecard = useMemo(() => {
    const tiersPassed = completedTiers.length;
    const refPenalty = referenceSolutionsViewedCount * 3.0; // Severe penalty for opening answers in interview
    const hintPenalty = hintsUsed * 1.0;

    // 1. Delivery & Confidence / Behavioral (0 - 10)
    // Absolute disqualifier: Complete silence or keeping mic muted throughout
    let confidenceScore = 0.5;
    let confidenceVerdict = "SILENT / MUTED (CRITICAL RED FLAG)";
    let confidenceCritique =
      "Candidate remained muted or silent for the entire session. In real FAANG rounds (Google L4/L5, Meta E4/E5, Amazon SDE-II), you are evaluated on thinking out loud. Silent coding is an automatic, non-negotiable rejection because interviewers have zero signal on your reasoning.";

    if (isDisqualified) {
      confidenceScore = 0.5;
      confidenceVerdict = "DISQUALIFIED (NO SIGNAL)";
      confidenceCritique =
        "Interview was terminated due to compliance violations before behavioral and communication calibration could be concluded.";
    } else if (speakingSeconds === 0) {
      confidenceScore = 0.5;
      confidenceVerdict = "NON-COMMUNICATIVE (0s SPOKEN)";
      confidenceCritique =
        "Candidate kept mic muted or spoke 0 seconds. Zero verbal problem walkthrough detected. A silent candidate cannot be recommended for any engineering role.";
    } else if (speakingSeconds < 25) {
      confidenceScore = 1.5;
      confidenceVerdict = "CRITICAL DEFICIT (<25s SPOKEN)";
      confidenceCritique =
        `Candidate only vocalized for ${speakingSeconds} seconds. In real technical interviews, you must continuously articulate trade-offs, state transitions, and edge cases aloud.`;
    } else if (speakingSeconds < 60) {
      confidenceScore = 3.5;
      confidenceVerdict = "SUB-STANDARD COMMUNICATION";
      confidenceCritique =
        `Candidate spoke for ${speakingSeconds}s with minimal cadence. Failed to maintain an ongoing dialogue or proactively discuss algorithmic bottlenecks.`;
    } else if (speakingSeconds < 100) {
      confidenceScore = 6.0;
      confidenceVerdict = "HESITANT BUT DEVELOPING";
      confidenceCritique =
        `Candidate spoke for ${speakingSeconds}s with ${candidateSpokenUtterances.length} inquiry voiced. Basic communication shown, but long silences were observed during coding.`;
    } else {
      const inquiryBonus = Math.min(1.5, candidateSpokenUtterances.length * 0.4);
      const fluencyBonus = Math.min(1.0, (speakingSeconds - 100) / 80);
      confidenceScore = Math.min(10.0, Math.round((7.5 + inquiryBonus + fluencyBonus) * 10) / 10);
      confidenceVerdict = "CLEAR & ARTICULATE COMMUNICATOR";
      confidenceCritique =
        `Strong verbal walkthrough (${speakingSeconds}s vocalized across ${candidateSpokenUtterances.length} technical inquiries). Candidate effectively talked through invariants and algorithmic choices.`;
    }

    // 2. Algorithmic Craft (0 - 10)
    // Strict requirement: zero tiers validated = 0.0 craft score
    let craftScore = 0.0;
    let craftVerdict = "FAILED TO DELIVER (0/3 TIERS)";
    let craftCritique =
      "Zero progression tiers passed. You did not submit an executable brute-force or baseline algorithm that satisfies all test cases. In real FAANG interviews, producing no working code is an immediate Strong No Hire.";

    if (tiersPassed === 0) {
      craftScore = 0.0;
      craftVerdict = "FAILED TO DELIVER (0/3 TIERS)";
      craftCritique =
        "Zero progression tiers passed. You did not submit an executable brute-force or baseline algorithm that satisfies all test cases. In real FAANG interviews, producing no working code is an immediate Strong No Hire.";
    } else if (tiersPassed === 1) {
      const rawCraft = 3.5 - refPenalty - hintPenalty;
      craftScore = Math.max(0.5, Math.round(rawCraft * 10) / 10);
      craftVerdict = "SUB-OPTIMAL (BRUTE FORCE ONLY)";
      craftCritique =
        "Completed Tier 1 (Brute Force) only. In production, unoptimized quadratic/exponential algorithms trigger Time Limit Exceeded (TLE) under high volume. Failed to optimize to Tier 2 or 3.";
    } else if (tiersPassed === 2) {
      const rawCraft = 6.5 - refPenalty - hintPenalty;
      craftScore = Math.max(1.0, Math.round(rawCraft * 10) / 10);
      craftVerdict = "PARTIAL PASS (MISSED OPTIMAL TIER)";
      craftCritique =
        "Completed Tiers 1 and 2. Demonstrates solid fundamentals, but failed to derive or prove the optimal Tier 3 invariant under time constraints.";
    } else {
      const rawCraft = 10.0 - refPenalty - hintPenalty;
      craftScore = Math.max(2.0, Math.round(rawCraft * 10) / 10);
      craftVerdict = "OPTIMAL FAANG BENCHMARK";
      craftCritique =
        "Successfully navigated all 3 progression tiers from Brute Force up to the optimal asymptotic space/time complexity. Meets Senior engineering standards.";
    }

    if (referenceSolutionsViewedCount > 0) {
      craftCritique += ` Academic integrity warning: Consulted canonical reference solution ${referenceSolutionsViewedCount} time(s) (-${refPenalty.toFixed(1)} penalty). In live interviews, consulting answers is strictly prohibited.`;
    }

    // 3. Proctoring & Integrity (0 - 10)
    let integrityScore = 10.0;
    let integrityVerdict = "FLAWLESS COMPLIANCE";
    let integrityCritique =
      "Candidate remained fully focused on the interview viewport with 0 tab switches, window blurs, or fullscreen exits.";

    if (isDisqualified) {
      integrityScore = 0.0;
      integrityVerdict = "DISQUALIFIED (3 PROCTORING STRIKES)";
      integrityCritique =
        "Candidate accumulated 3 proctoring violations (tab switches / window unfocus). Disqualified for compliance review.";
    } else if (strikes > 0) {
      integrityScore = Math.max(1.0, Math.round((10.0 - strikes * 2.8) * 10) / 10);
      integrityVerdict = `${strikes} PROCTORING WARNING${strikes > 1 ? "S" : ""}`;
      integrityCritique =
        `${strikes} window blur or tab switch event(s) logged. In remote FAANG screenings, losing focus of the proctored screen risks interview cancellation.`;
    }

    // Composite Score & Hiring Committee Verdict
    let composite = 0.0;
    if (isDisqualified) {
      composite = 0.5;
    } else if (isForfeited || tiersPassed === 0) {
      // Hard cap: If candidate didn't pass any tiers or forfeited, composite is severely capped
      composite = Math.min(1.5, Math.round((craftScore * 0.5 + confidenceScore * 0.3 + integrityScore * 0.2) * 10) / 10);
    } else {
      composite = Math.round((craftScore * 0.5 + confidenceScore * 0.3 + integrityScore * 0.2) * 10) / 10;
    }

    // Strict FAANG Verdict Calibration
    let verdict: "STRONG NO HIRE" | "NO HIRE" | "LEANING NO HIRE" | "LEANING HIRE" | "STRONG HIRE" = "STRONG NO HIRE";
    let committeeConsensus = "REJECT";
    let levelCalibration = "Sub-L3 / Unqualified";

    if (isDisqualified) {
      verdict = "STRONG NO HIRE";
      committeeConsensus = "IMMEDIATE REJECT (INTEGRITY)";
      levelCalibration = "Disqualified for Proctoring Violation";
    } else if (isForfeited) {
      verdict = "STRONG NO HIRE";
      committeeConsensus = "REJECT (SESSION FORFEITED)";
      levelCalibration = "Incomplete / Candidate Abandoned";
    } else if (tiersPassed === 0 || composite < 3.5) {
      verdict = "STRONG NO HIRE";
      committeeConsensus = "UNANIMOUS REJECT";
      levelCalibration = "Sub-L3 / Failed Core Competency";
    } else if (composite < 5.5) {
      verdict = "NO HIRE";
      committeeConsensus = "REJECT (BELOW FAANG BAR)";
      levelCalibration = "L3 / Junior Borderline (Unresolved Gaps)";
    } else if (composite < 7.5) {
      verdict = "LEANING NO HIRE";
      committeeConsensus = "LEANING REJECT";
      levelCalibration = "L4 Developing (Sub-optimal Complexity / Communication Gaps)";
    } else if (composite < 8.8 || tiersPassed < 3) {
      verdict = "LEANING HIRE";
      committeeConsensus = "CONDITIONAL HIRE";
      levelCalibration = "L4 / SDE-2 Qualified (Meets Standard)";
    } else {
      verdict = "STRONG HIRE";
      committeeConsensus = "STRONG HIRE (BAR RAISER)";
      levelCalibration = "L5 / Senior Benchmark Ready";
    }

    return {
      confidenceScore,
      confidenceVerdict,
      confidenceCritique,
      craftScore,
      craftVerdict,
      craftCritique,
      integrityScore,
      integrityVerdict,
      integrityCritique,
      composite,
      verdict,
      committeeConsensus,
      levelCalibration,
      tiersPassed,
    };
  }, [
    isDisqualified,
    isForfeited,
    speakingSeconds,
    candidateSpokenUtterances.length,
    completedTiers.length,
    referenceSolutionsViewedCount,
    hintsUsed,
    strikes,
  ]);

  const hasSavedSessionRef = useRef(false);

  // Automatically persist interview outcome and calculate rating delta on scorecard
  useEffect(() => {
    if (phase !== "scorecard" || hasSavedSessionRef.current) return;
    hasSavedSessionRef.current = true;

    saveInterviewSession({
      problemId: problem.id,
      problemTitle: problem.title,
      compositeScore: scorecard.composite,
      confidenceScore: scorecard.confidenceScore,
      craftScore: scorecard.craftScore,
      integrityScore: scorecard.integrityScore,
      strikes,
      isDisqualified,
      isAbandoned: isForfeited,
      completedTiersCount: completedTiers.length,
      userId: user?.uid,
    })
      .then((res) => {
        setRatingUpdate({
          previousRating: res.previousRating,
          newRating: res.newRating,
          ratingDelta: res.ratingDelta,
        });
      })
      .catch((err) => {
        console.warn("Could not persist interview session:", err);
      });
  }, [phase, isDisqualified, isForfeited, problem, scorecard, strikes, completedTiers.length, user]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground select-none">
      <SiteHeader />

      {/* Main Container */}
      <main className="flex flex-1 flex-col p-3 sm:p-5 max-w-7xl mx-auto w-full gap-4">
        {/* ========================================================================= */}
        {/* PHASE 1: PRE-INTERVIEW HARDWARE & SYSTEM CHECK                           */}
        {/* ========================================================================= */}
        {phase === "pre-check" && (
          <div className="flex flex-col gap-5 max-w-3xl mx-auto w-full py-4 sm:py-8">
            {/* Header Title */}
            <div className="flex flex-col gap-1.5 text-center">
              <div className="inline-flex items-center gap-2 mx-auto rounded-full bg-rose-500/10 border border-rose-500/30 px-3.5 py-1 text-xs font-mono font-bold text-rose-400">
                <Radio className="size-3.5 animate-pulse" />
                <span>HARDWARE-PROCTORED LIVE INTERVIEW</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground font-display">
                Executive DSA Technical Interview
              </h1>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                Step into a real executive interview environment. Your camera and microphone are required for identity verification, eye-contact monitoring, and speech cadence analysis.
              </p>
            </div>

            {/* Permission Gating & Chrome Guide Card */}
            <div className="rounded-2xl border border-border/80 bg-card/80 p-5 backdrop-blur-md shadow-md flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-5 text-primary" />
                  <span className="font-mono text-sm font-bold text-foreground">
                    Hardware Readiness & Proctor Verification
                  </span>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold border ${
                    hasCamMicPermission
                      ? "bg-emerald-950/50 border-emerald-500/50 text-emerald-300"
                      : "bg-amber-950/50 border-amber-500/50 text-amber-300"
                  }`}
                >
                  {hasCamMicPermission ? "HARDWARE VERIFIED" : "PERMISSIONS REQUIRED"}
                </span>
              </div>

              {/* Browser Permission Prompt Graphic / Instructions */}
              {!hasCamMicPermission && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <Info className="size-5" />
                  </div>
                  <div className="flex-1 text-xs font-mono text-amber-200">
                    <p className="font-bold mb-0.5">Chrome & Browser Permission Setting:</p>
                    <p className="text-[11px] text-amber-200/80">
                      When prompted, click <strong className="text-amber-100">“Allow”</strong> in the top-left URL bar dialog to enable Camera and Microphone access. This is strictly required for eye-contact tracking and speech analysis.
                    </p>
                  </div>
                </div>
              )}

              {/* Live Webcam & Audio Visualizer Feed */}
              {/* Live Webcam & Real-Time Audio Visualizer Feed */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                {/* Real-time Video Feed Box */}
                <div className="relative flex aspect-video w-full flex-col items-center justify-center rounded-xl border border-border/80 bg-black/80 overflow-hidden shadow-inner ring-1 ring-border/50">
                  {hasCamMicPermission ? (
                    <>
                      <video
                        ref={(el) => {
                          videoRef.current = el;
                          if (el && mediaStream) {
                            el.srcObject = mediaStream;
                            el.play().catch(() => {});
                          }
                        }}
                        autoPlay
                        playsInline
                        muted
                        className="h-full w-full object-cover -scale-x-100"
                      />
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-md bg-black/75 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-400 border border-emerald-500/40 backdrop-blur-xs shadow-xs">
                        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        LIVE CAM 640x480 (PROCTORED)
                      </div>
                      <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/75 px-2 py-0.5 font-mono text-[9px] font-semibold text-emerald-300 border border-emerald-500/30 backdrop-blur-xs">
                        <Check className="size-3 text-emerald-400" />
                        <span>Camera Stream Verified</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-center p-4 text-muted-foreground font-mono text-xs">
                      <div className="size-12 rounded-full bg-muted/20 border border-border/60 flex items-center justify-center text-primary/70 mb-1">
                        <Video className="size-6" />
                      </div>
                      <span className="font-bold text-foreground">Webcam Preview Gated</span>
                      <span className="text-[11px] text-muted-foreground max-w-[220px]">
                        Grant camera & microphone access below to activate your live hardware preview.
                      </span>
                    </div>
                  )}
                </div>

                {/* Real-time Microphone Equalizer & System Checklist */}
                <div className="flex flex-col gap-3 justify-center">
                  <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card/75 p-3.5 shadow-sm backdrop-blur-sm">
                    {/* Header & Numerical Gauge */}
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="flex items-center gap-1.5 font-bold text-foreground">
                        {isMuted ? (
                          <MicOff className="size-3.5 text-rose-400" />
                        ) : (
                          <Mic
                            className={`size-3.5 ${
                              audioLevel > 12 ? "text-emerald-400 animate-pulse" : "text-cyan-400"
                            }`}
                          />
                        )}
                        <span>Microphone Input</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-mono text-xs font-bold ${
                            isMuted
                              ? "text-rose-400"
                              : audioLevel > 12
                                ? "text-emerald-400"
                                : "text-muted-foreground"
                          }`}
                        >
                          {isMuted ? "MUTED" : `${audioLevel}%`}
                        </span>
                      </div>
                    </div>

                    {/* Real-time Multi-Band Audio Equalizer (Reacts directly to user speech) */}
                    <div className="flex items-end gap-1 h-10 px-2.5 py-1 bg-black/60 rounded-lg border border-border/70 overflow-hidden">
                      {audioBars.map((barHeight, idx) => (
                        <div
                          key={idx}
                          className="flex-1 rounded-t-sm transition-all duration-75"
                          style={{
                            height: `${isMuted ? 6 : Math.max(8, barHeight)}%`,
                            backgroundColor: isMuted
                              ? "#f43f5e"
                              : barHeight > 50
                                ? "#10b981"
                                : barHeight > 18
                                  ? "#06b6d4"
                                  : "#475569",
                          }}
                        />
                      ))}
                    </div>

                    {/* Audio Status Pill & Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] pt-0.5">
                      <div>
                        {isMuted ? (
                          <span className="text-rose-400 font-bold flex items-center gap-1">
                            <MicOff className="size-3" /> Mic muted — click unmute to speak
                          </span>
                        ) : audioLevel > 12 ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1 animate-pulse">
                            <span className="size-2 rounded-full bg-emerald-400" /> Sound detected! Mic picking up voice
                          </span>
                        ) : hasCamMicPermission ? (
                          <span className="text-cyan-300 font-medium flex items-center gap-1">
                            <Radio className="size-3 animate-pulse" /> Live mic active. Speak to test level.
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Mic gated until permission granted</span>
                        )}
                      </div>

                      {hasCamMicPermission && (
                        <div className="flex items-center gap-1.5 ml-auto">
                          <button
                            type="button"
                            onClick={handleToggleMute}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                              isMuted
                                ? "border-rose-500/70 bg-rose-950/60 text-rose-200 hover:bg-rose-900/80"
                                : "border-emerald-500/60 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60"
                            }`}
                          >
                            {isMuted ? <Mic className="size-2.5" /> : <MicOff className="size-2.5" />}
                            <span>{isMuted ? "Unmute Mic" : "Mute Mic"}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rules Checklist */}
                  <div className="flex flex-col gap-1.5 font-mono text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle2
                        className={`size-3.5 ${
                          hasCamMicPermission ? "text-emerald-400" : "text-muted-foreground/40"
                        }`}
                      />
                      <span>Camera & Microphone verified and streaming</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-emerald-400" />
                      <span>Full screen proctor lock active during challenge</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-emerald-400" />
                      <span>Zero tab-switch policy (3 strikes maximum)</span>
                    </div>
                  </div>
                </div>
              </div>

              {permissionError && (
                <div className="rounded-lg bg-rose-950/40 border border-rose-500/50 p-3 text-xs font-mono text-rose-200 flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0 text-rose-400" />
                  <span>{permissionError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                {!hasCamMicPermission ? (
                  <Button
                    onClick={requestMediaPermissions}
                    className="w-full sm:w-auto font-mono text-xs font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
                  >
                    <Video className="size-4" /> Grant Camera & Mic Hardware Access
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold">
                    <Check className="size-4" /> Hardware Connected & Verified
                  </div>
                )}

                <Button
                  onClick={handleStartSession}
                  disabled={!hasCamMicPermission}
                  className="w-full sm:w-auto font-mono text-xs font-extrabold gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 disabled:opacity-40"
                >
                  <Play className="size-4" /> Enter Proctored Live Interview
                </Button>
              </div>
            </div>

            {/* Interviewer Persona & Human Voicepack Selection */}
            <div className="rounded-xl border border-border/80 bg-card/60 p-4 backdrop-blur-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="size-4 text-cyan-400" />
                  <span className="font-mono text-xs font-bold text-foreground">
                    Interviewer Persona & Human Voicepack
                  </span>
                </div>
                <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 font-mono text-[9px] font-bold text-cyan-300">
                  Neural Natural Audio
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {VOICE_PROFILES.filter((p) => p.id !== "system-natural").map((profile) => {
                  const isSelected = selectedVoiceProfile === profile.id;
                  return (
                    <div
                      key={profile.id}
                      onClick={() => setSelectedVoiceProfile(profile.id)}
                      className={`cursor-pointer rounded-lg border p-3 transition-all flex flex-col justify-between gap-2 text-left ${
                        isSelected
                          ? "border-cyan-500/80 bg-cyan-950/40 text-cyan-100 ring-1 ring-cyan-500/50 shadow-sm"
                          : "border-border/60 bg-card/40 hover:border-border hover:bg-muted/30 text-foreground"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{profile.avatar}</span>
                          <div>
                            <div className="font-bold text-xs flex items-center gap-1">
                              {profile.name}
                              {isSelected && <Check className="size-3 text-cyan-400" />}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono">{profile.role}</div>
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">{profile.description}</p>
                      <div className="flex items-center justify-between pt-1 border-t border-border/40">
                        <span className="text-[9px] font-mono text-cyan-400/80">{profile.tag}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVoiceProfile(profile.id);
                            testVoiceProfile(profile.id);
                          }}
                          className="flex items-center gap-1 rounded border border-cyan-500/40 bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-300 px-2 py-0.5 text-[10px] font-mono transition-colors"
                          title="Test Audition Spoken Voice"
                        >
                          <Volume2 className="size-2.5" />
                          <span>Audition</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Problem Selection Preview (Can re-roll before starting) */}
            <div className="rounded-xl border border-border/80 bg-card/60 p-4 backdrop-blur-sm flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="size-4 text-primary" />
                  <span className="font-mono text-xs font-bold text-foreground">
                    Assigned Technical Question (Pre-dispatch)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRandomizeProblem}
                  className="flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Shuffle className="size-3 text-primary" />
                  <span>Pick Another Random Problem</span>
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-foreground font-display">{problem.title}</span>
                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.2 font-mono text-[9px] font-extrabold text-emerald-400">
                      {problem.difficulty}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">({problem.category})</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{problem.description}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PHASE 2: IN-SESSION PROCTORED LIVE INTERVIEW                             */}
        {/* ========================================================================= */}
        {phase === "in-session" && (
          <div className="flex flex-1 flex-col gap-3 w-full">
            {/* Top Stat Ribbon: Problem Info, 3-Tier Progression, Audio & Strike Telemetry */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-card/85 p-3 backdrop-blur-xl shadow-xs">
              {/* Problem Title & Category */}
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-primary shadow-xs">
                  <Code2 className="size-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{problem.title}</span>
                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.2 font-mono text-[9px] font-extrabold text-emerald-400">
                      {problem.difficulty}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">{problem.category}</span>
                </div>
              </div>

              {/* 3-Tier Solution Progression Badges */}
              <div className="flex items-center gap-1.5 font-mono text-xs">
                {([1, 2, 3] as const).map((tNum) => {
                  const isDone = completedTiers.includes(tNum);
                  const isCurrent = currentTier === tNum;
                  const tierName = tNum === 1 ? "Brute" : tNum === 2 ? "Better" : "Optimal";
                  const complexity = problem.tiers[tNum].complexityTag;

                  return (
                    <div
                      key={tNum}
                      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-all ${
                        isDone
                          ? "border-emerald-500/60 bg-emerald-950/40 text-emerald-300"
                          : isCurrent
                            ? "border-primary bg-primary/20 text-primary shadow-xs ring-1 ring-primary/40"
                            : "border-border/60 bg-muted/30 text-muted-foreground opacity-60"
                      }`}
                    >
                      {isDone ? (
                        <Check className="size-3 text-emerald-400" />
                      ) : isCurrent ? (
                        <span className="size-1.5 rounded-full bg-primary animate-ping" />
                      ) : (
                        <span className="size-1.5 rounded-full bg-muted-foreground" />
                      )}
                      <span>Tier {tNum}: {tierName}</span>
                      <span className="font-mono text-[9px] opacity-70">({complexity})</span>
                    </div>
                  );
                })}
              </div>

              {/* Interviewer Audio Status & Controls */}
              <div className="flex items-center gap-2 font-mono text-xs">
                {/* Candidate Mic Live / Unmute Toggle */}
                <button
                  type="button"
                  onClick={handleToggleMute}
                  title={isMuted ? "Microphone is muted. Click to unmute and speak." : "Microphone is live. Click to mute."}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-bold transition-all ${
                    isMuted
                      ? "border-rose-500/70 bg-rose-950/60 text-rose-300 ring-1 ring-rose-500/50 hover:bg-rose-900/60"
                      : audioLevel > 15
                        ? "border-emerald-500/80 bg-emerald-950/60 text-emerald-200 ring-1 ring-emerald-500/50 animate-pulse"
                        : "border-cyan-500/60 bg-cyan-950/40 text-cyan-200 hover:bg-cyan-900/40"
                  }`}
                >
                  {isMuted ? (
                    <>
                      <MicOff className="size-3.5 text-rose-400" />
                      <span>Unmute Mic</span>
                    </>
                  ) : (
                    <>
                      <Mic className={`size-3.5 ${audioLevel > 15 ? "text-emerald-400" : "text-cyan-400"}`} />
                      <span>{audioLevel > 15 ? "Candidate Speaking..." : "Mic Live"}</span>
                    </>
                  )}
                </button>
                {/* Spoken AI Speaker Ring */}
                <div
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-bold transition-all ${
                    isAiSpeaking
                      ? "border-cyan-500/80 bg-cyan-950/60 text-cyan-200 ring-1 ring-cyan-500/50 animate-pulse"
                      : "border-border/60 bg-card/60 text-muted-foreground"
                  }`}
                >
                  <Volume2 className={`size-3.5 ${isAiSpeaking ? "text-cyan-400 animate-bounce" : "text-muted-foreground"}`} />
                  <span>{isAiSpeaking ? "AI Interviewer Speaking..." : "Silent Observer Active"}</span>
                </div>

                {/* AI Mute Toggle */}
                <button
                  type="button"
                  onClick={() => setIsAiMuted((m) => !m)}
                  title={isAiMuted ? "Unmute AI Voice" : "Mute AI Voice"}
                  className="rounded-lg border border-border/60 p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  {isAiMuted ? <VolumeX className="size-3.5 text-rose-400" /> : <Volume2 className="size-3.5" />}
                </button>

                {/* Voicepack Selector */}
                <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-card/60 px-2 py-1 text-xs">
                  <span className="text-muted-foreground font-mono text-[10px] hidden lg:inline">Voice:</span>
                  <select
                    value={selectedVoiceProfile}
                    onChange={(e) => setSelectedVoiceProfile(e.target.value as VoiceProfileId)}
                    className="bg-transparent text-[11px] font-medium text-foreground focus:outline-hidden cursor-pointer"
                    title="Switch AI Interviewer Voicepack"
                  >
                    <option value="alex-male" className="bg-background text-foreground">👨‍💻 Alex (US Male)</option>
                    <option value="sarah-female" className="bg-background text-foreground">👩‍💻 Sarah (US Female)</option>
                    <option value="david-british" className="bg-background text-foreground">👨‍💼 David (UK Male)</option>
                    <option value="system-natural" className="bg-background text-foreground">🎙️ System Natural</option>
                  </select>
                </div>

                {/* Transcript Drawer Toggle */}
                <button
                  type="button"
                  onClick={() => setShowTranscript((t) => !t)}
                  className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition-colors ${
                    showTranscript ? "border-primary text-primary bg-primary/10" : "border-border/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MessageSquare className="size-3" />
                  <span>Transcript</span>
                </button>

                {/* Anti-Cheat Strike Counter */}
                <button
                  type="button"
                  onClick={() => setShowComplianceDrawer((d) => !d)}
                  className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition-colors ${
                    strikes > 0
                      ? "border-rose-500 bg-rose-950/60 text-rose-300 ring-1 ring-rose-500/50"
                      : "border-emerald-500/40 bg-emerald-950/30 text-emerald-300"
                  }`}
                >
                  <ShieldAlert className="size-3 text-rose-400" />
                  <span>Strikes: {strikes}/3</span>
                </button>

                {/* Concede / Terminate Early Button */}
                <button
                  type="button"
                  onClick={() => setShowForfeitModal(true)}
                  className="flex items-center gap-1 rounded-lg border border-rose-500/60 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 px-2 py-1 text-[11px] font-bold transition-colors"
                  title="Concede / Forfeit Interview Session"
                >
                  <LogOut className="size-3 text-rose-400" />
                  <span>Concede</span>
                </button>
              </div>
            </div>

            {/* Transcript Drawer (When Toggled) */}
            {showTranscript && (
              <div className="flex flex-col gap-2 rounded-xl border border-border/80 bg-card/90 p-3 backdrop-blur-md shadow-md max-h-48 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-border/60 pb-1.5 font-mono text-xs">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <MessageSquare className="size-3 text-primary" /> Spoken Interview Dialogue Log
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowTranscript(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
                <div className="flex flex-col gap-1.5 font-mono text-xs">
                  {dialogueLog.map((d, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">[{d.timestamp}]</span>
                      <span className="font-bold text-primary shrink-0">Interviewer:</span>
                      <span className="text-foreground">{d.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Compliance / Proctoring Log Drawer (When Toggled) */}
            {showComplianceDrawer && (
              <div className="flex flex-col gap-2 rounded-xl border border-rose-500/40 bg-card/90 p-3 backdrop-blur-md shadow-md max-h-48 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-border/60 pb-1.5 font-mono text-xs">
                  <span className="font-bold text-rose-300 flex items-center gap-1.5">
                    <ShieldAlert className="size-3 text-rose-400" /> Real-Time Integrity & Proctoring Audit Log
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowComplianceDrawer(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
                <div className="flex flex-col gap-1 font-mono text-xs">
                  {proctoringLog.map((log, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">[{log.timestamp}]</span>
                      <span
                        className={`font-bold uppercase text-[9px] px-1 rounded ${
                          log.type === "strike" ? "bg-rose-900/80 text-rose-200" : log.type === "warning" ? "bg-amber-900/80 text-amber-200" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {log.type}
                      </span>
                      <span className="text-foreground">{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Main Split: Problem Spec (Left) & Live Editor (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 flex-1 items-start">
              {/* LEFT COLUMN: Problem Details, Current Tier Objective & Constraints */}
              <div className="lg:col-span-5 flex flex-col gap-3 rounded-xl border border-border/80 bg-card/75 p-4 backdrop-blur-sm max-h-[720px] overflow-y-auto">
                {/* Active Tier Objective Banner */}
                <div className="flex flex-col gap-1.5 rounded-lg border border-primary/40 bg-primary/10 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-extrabold text-primary uppercase tracking-wider">
                      Current Task: Tier {currentTier} ({problem.tiers[currentTier].name})
                    </span>
                    <span className="rounded bg-primary/20 px-1.5 py-0.2 font-mono text-[9px] font-bold text-primary">
                      Target {problem.tiers[currentTier].complexityTag}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-foreground mt-0.5">
                    {problem.tiers[currentTier].objective}
                  </p>
                </div>

                {/* Problem Description */}
                <div className="flex flex-col gap-2">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Problem Statement
                  </span>
                  <p className="text-xs text-foreground whitespace-pre-line leading-relaxed font-sans">
                    {problem.description}
                  </p>
                </div>

                {/* Examples */}
                <div className="flex flex-col gap-2">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Examples
                  </span>
                  <div className="flex flex-col gap-2">
                    {problem.examples.map((ex, i) => (
                      <div key={i} className="rounded-lg border border-border/60 bg-muted/20 p-2.5 font-mono text-xs flex flex-col gap-1">
                        <div>
                          <strong className="text-primary">Input:</strong> {ex.input}
                        </div>
                        <div>
                          <strong className="text-emerald-400">Output:</strong> {ex.output}
                        </div>
                        {ex.explanation && (
                          <div className="text-[11px] text-muted-foreground">
                            <strong>Explanation:</strong> {ex.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Constraints */}
                <div className="flex flex-col gap-1.5">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Constraints
                  </span>
                  <ul className="flex flex-col gap-1 font-mono text-xs text-muted-foreground list-disc pl-4">
                    {problem.constraints.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* RIGHT COLUMN: Code Editor, Silent Observer Stats & Submission Controls */}
              <div className="lg:col-span-7 flex flex-col gap-3">
                {/* Real-Time Microphone Listener & Spoken Inquiry Dock */}
                <div className="rounded-xl border border-cyan-500/40 bg-card/85 p-3 backdrop-blur-md shadow-sm flex flex-col gap-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="relative flex size-2.5">
                        <span
                          className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                            isMuted ? "bg-rose-400" : audioLevel > 15 ? "bg-emerald-400" : "bg-cyan-400"
                          } opacity-75`}
                        />
                        <span
                          className={`relative inline-flex rounded-full size-2.5 ${
                            isMuted ? "bg-rose-500" : audioLevel > 15 ? "bg-emerald-500" : "bg-cyan-500"
                          }`}
                        />
                      </span>
                      <span className="font-mono text-xs font-bold text-foreground flex items-center gap-1.5">
                        {isMuted ? (
                          <MicOff className="size-3.5 text-rose-400" />
                        ) : (
                          <Mic className={`size-3.5 ${audioLevel > 15 ? "text-emerald-400" : "text-cyan-400"}`} />
                        )}
                        <span>Live Mic Channel:</span>
                        <span
                          className={`font-semibold ${
                            isMuted
                              ? "text-rose-400 font-bold"
                              : isAiSpeaking
                                ? "text-cyan-300"
                                : audioLevel > 15
                                  ? "text-emerald-400 font-bold"
                                  : "text-cyan-300"
                          }`}
                        >
                          {isMuted
                            ? "Microphone Muted"
                            : isAiSpeaking
                              ? "AI Interviewer Speaking..."
                              : audioLevel > 15
                                ? "Candidate Speaking... (Recording audio)"
                                : "Live Mic Active (Listening)"}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {/* Unmute / Mute Toggle Button */}
                      <button
                        type="button"
                        onClick={handleToggleMute}
                        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[11px] font-bold transition-all shadow-xs cursor-pointer ${
                          isMuted
                            ? "border-rose-500/70 bg-rose-950/70 text-rose-200 ring-1 ring-rose-500/50 hover:bg-rose-900/80"
                            : "border-border/70 bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary"
                        }`}
                      >
                        {isMuted ? (
                          <>
                            <MicOff className="size-3 text-rose-400" />
                            <span>Unmute Mic</span>
                          </>
                        ) : (
                          <>
                            <Mic className="size-3 text-emerald-400" />
                            <span>Mute Mic</span>
                          </>
                        )}
                      </button>

                      {/* Mic Sensitivity Gauge & Status */}
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <span className="text-muted-foreground">Volume:</span>
                        <div className="w-16 h-2 rounded-full bg-black/50 overflow-hidden border border-border/70">
                          <div
                            className={`h-full transition-all duration-75 ${
                              isMuted
                                ? "bg-rose-500/30"
                                : audioLevel > 50
                                  ? "bg-emerald-400"
                                  : audioLevel > 15
                                    ? "bg-cyan-400"
                                    : "bg-muted-foreground/40"
                            }`}
                            style={{ width: `${isMuted ? 0 : Math.max(4, audioLevel)}%` }}
                          />
                        </div>
                        <span className={`font-bold ${isMuted ? "text-rose-400" : audioLevel > 15 ? "text-emerald-400" : "text-muted-foreground"}`}>
                          {isMuted ? "Muted" : `${audioLevel}%`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Real-Time Candidate Spoken Speech Recognition Banner */}
                  {candidateSpeechTranscript && (
                    <div className="rounded-lg bg-cyan-950/40 border border-cyan-500/50 px-3 py-2 text-xs font-mono flex items-center justify-between gap-2 animate-in fade-in">
                      <div className="flex items-center gap-2 text-cyan-200">
                        <Radio className="size-3.5 text-cyan-400 animate-pulse shrink-0" />
                        <span>
                          <strong>Hearing you:</strong> &ldquo;{candidateSpeechTranscript}&rdquo;
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleCandidateVoiceQuestion(candidateSpeechTranscript)}
                        disabled={isProcessingQuestion || isAiSpeaking}
                        className="h-6 px-2 text-[10px] font-mono bg-cyan-600 hover:bg-cyan-500 text-white"
                      >
                        Ask Now
                      </Button>
                    </div>
                  )}

                  {/* Last Spoken Q&A Exchange Toast */}
                  {lastInterviewerAnswer && !candidateSpeechTranscript && (
                    <div className="rounded-lg bg-card/90 border border-border/70 p-2.5 text-xs font-mono flex flex-col gap-1">
                      {lastCandidateQuestion && (
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <span className="text-primary font-bold">You asked:</span> &ldquo;{lastCandidateQuestion}&rdquo;
                        </div>
                      )}
                      <div className="text-xs text-foreground flex items-start gap-1.5">
                        <Volume2 className="size-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-cyan-300">Interviewer:</strong> {lastInterviewerAnswer}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Quick Socratic Question Chips */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[10px] text-muted-foreground">Quick Inquiries:</span>
                    <button
                      type="button"
                      onClick={() => handleCandidateVoiceQuestion("Are the input numbers sorted?")}
                      className="rounded-md border border-border/70 bg-secondary/50 px-2 py-0.5 font-mono text-[10px] text-muted-foreground hover:text-foreground hover:border-cyan-500/50 transition-colors cursor-pointer"
                    >
                      ❓ Are numbers sorted?
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCandidateVoiceQuestion("Can input values or target be negative?")}
                      className="rounded-md border border-border/70 bg-secondary/50 px-2 py-0.5 font-mono text-[10px] text-muted-foreground hover:text-foreground hover:border-cyan-500/50 transition-colors cursor-pointer"
                    >
                      ❓ Can values be negative?
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCandidateVoiceQuestion("What should I return as the output format?")}
                      className="rounded-md border border-border/70 bg-secondary/50 px-2 py-0.5 font-mono text-[10px] text-muted-foreground hover:text-foreground hover:border-cyan-500/50 transition-colors cursor-pointer"
                    >
                      ❓ What should I return?
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCandidateVoiceQuestion("What edge cases should I consider?")}
                      className="rounded-md border border-border/70 bg-secondary/50 px-2 py-0.5 font-mono text-[10px] text-muted-foreground hover:text-foreground hover:border-cyan-500/50 transition-colors cursor-pointer"
                    >
                      ❓ What are edge cases?
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCandidateVoiceQuestion("Can I use extra memory for this tier?")}
                      className="rounded-md border border-border/70 bg-secondary/50 px-2 py-0.5 font-mono text-[10px] text-muted-foreground hover:text-foreground hover:border-cyan-500/50 transition-colors cursor-pointer"
                    >
                      ❓ What is space limit?
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCandidateVoiceQuestion("Can you give me a Socratic hint? I am stuck.")}
                      className="rounded-md border border-amber-500/40 bg-amber-950/20 px-2 py-0.5 font-mono text-[10px] text-amber-300 hover:text-amber-200 hover:border-amber-500/80 transition-colors cursor-pointer"
                    >
                      💡 Request Socratic hint
                    </button>
                  </div>

                  {/* Voice / Text Question Input Row */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (typedQuestion.trim()) {
                        handleCandidateVoiceQuestion(typedQuestion.trim());
                        setTypedQuestion("");
                      }
                    }}
                    className="flex items-center gap-1.5 pt-0.5"
                  >
                    <div className="relative flex-1">
                      <Mic className={`absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 ${audioLevel > 15 ? "text-emerald-400" : "text-muted-foreground"}`} />
                      <input
                        type="text"
                        value={typedQuestion}
                        onChange={(e) => setTypedQuestion(e.target.value)}
                        placeholder="Speak into your mic anytime, or type a question to the interviewer..."
                        className="w-full rounded-lg border border-border/70 bg-background/80 pl-8 pr-3 py-1.5 font-mono text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={!typedQuestion.trim() || isProcessingQuestion || isAiSpeaking}
                      size="sm"
                      className="h-8 px-3 font-mono text-xs font-bold gap-1 bg-cyan-600 hover:bg-cyan-500 text-white shrink-0"
                    >
                      <Send className="size-3" /> Ask
                    </Button>
                  </form>
                </div>

                {/* Editor Header: Language selector + Reset Skeleton + Reference Solution + Silent Observer telemetry */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 bg-card/75 p-2.5 backdrop-blur-sm font-mono text-xs">
                  {/* Language Pills & Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1">
                      {(["python", "cpp", "javascript", "typescript"] as const).map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => setLanguage(lang)}
                          className={`rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                            language === lang
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                          }`}
                        >
                          {lang === "python"
                            ? "Python 3"
                            : lang === "cpp"
                              ? "C++ 20"
                              : lang === "javascript"
                                ? "JavaScript"
                                : "TypeScript"}
                        </button>
                      ))}
                    </div>

                    <div className="h-4 w-px bg-border/80 hidden sm:block" />

                    {/* Reset Starter Skeleton Button */}
                    <button
                      type="button"
                      onClick={handleResetSkeleton}
                      title="Reset code editor to starter clean skeleton"
                      className="flex items-center gap-1 rounded-md border border-border/70 bg-card/90 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                    >
                      <RotateCcw className="size-3" />
                      <span>Reset Skeleton</span>
                    </button>

                    {/* Reference Solution Button */}
                    <button
                      type="button"
                      onClick={handleOpenReferenceSolution}
                      title="View canonical reference solution for current tier"
                      className="flex items-center gap-1 rounded-md border border-amber-500/50 bg-amber-950/20 px-2 py-1 text-[11px] font-bold text-amber-300 hover:text-amber-200 hover:border-amber-500/80 transition-colors cursor-pointer"
                    >
                      <Lightbulb className="size-3 text-amber-400" />
                      <span>Reference Solution (Tier {currentTier})</span>
                    </button>
                  </div>

                  {/* Silent Observer Metrics */}
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>Lines: {code.split("\n").length}</span>
                    <span>Keystrokes: {keystrokeCount}</span>
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Eye className="size-3 text-emerald-400" /> Silent Observation Active
                    </span>
                  </div>
                </div>

                {/* Code Textarea with Line Numbers */}
                <div className="relative rounded-xl border border-border/80 bg-[#0d1117] p-3 shadow-inner flex flex-col gap-2 min-h-[440px]">
                  <textarea
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value);
                      setKeystrokeCount((k) => k + 1);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Tab") {
                        e.preventDefault();
                        const start = e.currentTarget.selectionStart;
                        const end = e.currentTarget.selectionEnd;
                        const newCode = code.substring(0, start) + "    " + code.substring(end);
                        setCode(newCode);
                        setTimeout(() => {
                          e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 4;
                        }, 0);
                      }
                    }}
                    placeholder="# Write your solution here..."
                    spellCheck={false}
                    className="w-full flex-1 bg-transparent font-mono text-xs text-slate-100 placeholder:text-muted-foreground focus:outline-none resize-none leading-relaxed min-h-[400px]"
                  />
                </div>

                {/* Interactive Test Runner Console (Test Cases, Execution Diff, Output) */}
                <div className="flex flex-col rounded-xl border border-border/80 bg-card/85 backdrop-blur-md overflow-hidden shadow-sm">
                  {/* Console Tabs & Actions Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-card/90 px-3 py-2">
                    <div className="flex items-center gap-1.5 font-mono text-xs">
                      <button
                        type="button"
                        onClick={() => setActiveConsoleTab("testcases")}
                        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-bold transition-colors cursor-pointer ${
                          activeConsoleTab === "testcases"
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                        }`}
                      >
                        <FileCode2 className="size-3.5" />
                        <span>Test Cases ({problem.tiers[currentTier].testCases.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveConsoleTab("diff")}
                        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-bold transition-colors cursor-pointer ${
                          activeConsoleTab === "diff"
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                        }`}
                      >
                        <Terminal className="size-3.5" />
                        <span>Run Output & Diff</span>
                        {testRunResults && (
                          <span
                            className={`rounded px-1 text-[9px] font-black ${
                              testRunResults.every((r) => r.passed)
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-rose-500/20 text-rose-300"
                            }`}
                          >
                            {testRunResults.filter((r) => r.passed).length}/{testRunResults.length}
                          </span>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        onClick={handleRunTests}
                        disabled={isRunningTests || isEvaluating}
                        size="sm"
                        className="h-7 px-3 font-mono text-xs font-bold gap-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border cursor-pointer shadow-xs"
                      >
                        {isRunningTests ? (
                          <>
                            <span className="size-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                            <span>Running...</span>
                          </>
                        ) : (
                          <>
                            <Play className="size-3 text-primary fill-primary" />
                            <span>Run Code</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Console Body */}
                  <div className="p-3 font-mono text-xs">
                    {/* Tab 1: Test Cases */}
                    {activeConsoleTab === "testcases" && (
                      <div className="flex flex-col gap-3">
                        {/* Test case pills */}
                        <div className="flex flex-wrap items-center gap-2">
                          {problem.tiers[currentTier].testCases.map((tc, idx) => {
                            const res = testRunResults?.find((r) => r.index === idx + 1);
                            const isSelected = selectedTestCaseIndex === idx;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedTestCaseIndex(idx)}
                                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                                  isSelected
                                    ? "border-primary bg-primary/15 text-primary shadow-xs"
                                    : "border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {res ? (
                                  res.passed ? (
                                    <CheckCircle2 className="size-3 text-emerald-400" />
                                  ) : (
                                    <XCircle className="size-3 text-rose-400" />
                                  )
                                ) : (
                                  <span className="size-1.5 rounded-full bg-muted-foreground" />
                                )}
                                <span>Case {idx + 1}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Selected Test Case Detail */}
                        {(() => {
                          const currentCase =
                            problem.tiers[currentTier].testCases[selectedTestCaseIndex] ||
                            problem.tiers[currentTier].testCases[0]!;
                          const runRes = testRunResults?.find((r) => r.index === selectedTestCaseIndex + 1);
                          return (
                            <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-[#0d1117] p-3 text-slate-200">
                              <div className="flex items-center justify-between text-[11px] text-muted-foreground border-b border-border/40 pb-1.5">
                                <span className="font-bold text-foreground">
                                  Case {selectedTestCaseIndex + 1}: {currentCase.description}
                                </span>
                                {runRes && (
                                  <span
                                    className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                                      runRes.passed
                                        ? "bg-emerald-950/70 text-emerald-400 border border-emerald-500/40"
                                        : "bg-rose-950/70 text-rose-400 border border-rose-500/40"
                                    }`}
                                  >
                                    {runRes.passed ? `Passed (${runRes.runtimeMs}ms)` : "Failed"}
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                                <div className="flex flex-col gap-1">
                                  <span className="text-muted-foreground text-[11px]">Input Parameters:</span>
                                  <pre className="rounded bg-black/50 p-2 overflow-x-auto text-cyan-300 font-mono text-[11px] border border-border/40">
                                    {JSON.stringify(currentCase.input, null, 2)}
                                  </pre>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <span className="text-muted-foreground text-[11px]">Expected Return:</span>
                                  <pre className="rounded bg-black/50 p-2 overflow-x-auto text-emerald-300 font-mono text-[11px] border border-border/40">
                                    {JSON.stringify(currentCase.expected, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Tab 2: Diff / Output */}
                    {activeConsoleTab === "diff" && (
                      <div className="flex flex-col gap-3">
                        {testRunResults ? (
                          <div className="flex flex-col gap-2.5">
                            {/* Summary strip */}
                            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                              <span className="font-bold flex items-center gap-1.5">
                                {testRunResults.every((r) => r.passed) ? (
                                  <CheckCircle2 className="size-4 text-emerald-400" />
                                ) : (
                                  <AlertCircle className="size-4 text-rose-400" />
                                )}
                                <span>
                                  {testRunResults.every((r) => r.passed)
                                    ? `All ${testRunResults.length} test cases passed successfully!`
                                    : `${testRunResults.filter((r) => r.passed).length} of ${testRunResults.length} test cases passed.`}
                                </span>
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                Total Runtime: {testRunResults.reduce((sum, r) => sum + (r.runtimeMs || 0), 0)}ms
                              </span>
                            </div>

                            {/* Detailed Results List */}
                            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
                              {testRunResults.map((res) => (
                                <div
                                  key={res.index}
                                  className={`flex flex-col gap-1 rounded-lg border p-2.5 ${
                                    res.passed
                                      ? "border-emerald-500/40 bg-emerald-950/15"
                                      : "border-rose-500/40 bg-rose-950/20"
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-bold flex items-center gap-1.5">
                                      {res.passed ? (
                                        <Check className="size-3 text-emerald-400" />
                                      ) : (
                                        <X className="size-3 text-rose-400" />
                                      )}
                                      <span>Test Case {res.index}: {res.description}</span>
                                    </span>
                                    <span className="text-muted-foreground">{res.runtimeMs}ms</span>
                                  </div>

                                  {res.error ? (
                                    <div className="text-[11px] text-rose-300 bg-rose-950/40 p-1.5 rounded border border-rose-500/30 mt-1">
                                      <strong>Error:</strong> {res.error}
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 font-mono">
                                      <div>
                                        <span className="text-muted-foreground">Expected:</span>{" "}
                                        <span className="text-emerald-300">{JSON.stringify(res.expected)}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Actual:</span>{" "}
                                        <span className={res.passed ? "text-emerald-300" : "text-rose-300 font-bold"}>
                                          {JSON.stringify(res.actual)}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground gap-2">
                            <Terminal className="size-6 opacity-40" />
                            <span>Click <strong>&ldquo;Run Code&rdquo;</strong> to execute your algorithm against Tier {currentTier} test cases.</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {validationError && (
                  <div className="rounded-lg bg-rose-950/40 border border-rose-500/50 p-2.5 font-mono text-xs text-rose-200 flex items-center gap-2">
                    <AlertTriangle className="size-4 shrink-0 text-rose-400" />
                    <span>{validationError}</span>
                  </div>
                )}

                {/* Bottom Actions: Run Code + Submit Tier Solution + Socratic Hint Request */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleRequestHint}
                    className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-card/80 hover:bg-card px-3 py-1.5 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors shadow-xs cursor-pointer"
                  >
                    <HelpCircle className="size-3.5 text-amber-400" />
                    <span>Request Socratic Hint ({hintsUsed} used)</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={handleRunTests}
                      disabled={isRunningTests || isEvaluating}
                      variant="outline"
                      className="font-mono text-xs font-bold gap-1.5 border-border cursor-pointer shadow-xs"
                    >
                      {isRunningTests ? (
                        <>
                          <span className="size-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                          <span>Running...</span>
                        </>
                      ) : (
                        <>
                          <Play className="size-3 text-primary fill-primary" />
                          <span>Run Code</span>
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={handleSubmitTier}
                      disabled={isEvaluating || isRunningTests}
                      className="font-mono text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 disabled:opacity-50 cursor-pointer"
                    >
                      {isEvaluating ? (
                        <>
                          <span className="size-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          <span>Validating Solution...</span>
                        </>
                      ) : (
                        <>
                          <Check className="size-4" />
                          <span>Submit Solution for Tier {currentTier} ({problem.tiers[currentTier].name})</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* FLOATING WEBCAM & AUDIO METER VIEWPORT (BOTTOM-RIGHT) */}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-1.5 select-none pointer-events-auto">
              {/* Live Candidate Speech Popover if speaking */}
              {candidateSpeechTranscript && (
                <div className="max-w-[200px] rounded-lg bg-card/95 border border-cyan-500/60 p-2 shadow-xl font-mono text-[10px] text-cyan-200 animate-in fade-in slide-in-from-bottom-2 backdrop-blur-md">
                  <div className="flex items-center gap-1 font-bold text-cyan-400 mb-0.5">
                    <Radio className="size-3 animate-pulse" /> Hearing Voice:
                  </div>
                  <p className="line-clamp-2 italic">&ldquo;{candidateSpeechTranscript}&rdquo;</p>
                </div>
              )}

              <div className="relative size-36 sm:size-48 rounded-xl border-2 border-emerald-500/80 bg-black overflow-hidden shadow-2xl shadow-black/80 ring-2 ring-emerald-500/30">
                <video
                  ref={floatingVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover -scale-x-100"
                />
                {/* Recording Tag */}
                <div className="absolute top-2 left-2 flex items-center gap-1 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[8px] font-black text-rose-400 border border-rose-500/40">
                  <span className="size-1.5 rounded-full bg-rose-500 animate-ping" />
                  REC • PROCTOR
                </div>

                {/* Candidate Mic / Activity Controls (Top Right) */}
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  {isAiSpeaking && (
                    <div className="flex items-center gap-1 rounded bg-cyan-950/90 px-1.5 py-0.5 font-mono text-[8px] font-bold text-cyan-300 border border-cyan-500/50 animate-pulse">
                      <Volume2 className="size-2.5 text-cyan-400" />
                      AI TALKING
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleToggleMute}
                    title={isMuted ? "Click to Unmute Microphone" : "Click to Mute Microphone"}
                    className={`flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[8px] font-bold border transition-colors shadow-md cursor-pointer ${
                      isMuted
                        ? "bg-rose-950/95 text-rose-300 border-rose-500/70 hover:bg-rose-900"
                        : audioLevel > 15
                          ? "bg-emerald-950/90 text-emerald-300 border-emerald-500/70 animate-pulse"
                          : "bg-black/80 text-cyan-300 border-cyan-500/40 hover:bg-black/95"
                    }`}
                  >
                    {isMuted ? (
                      <>
                        <MicOff className="size-2.5 text-rose-400" />
                        <span>UNMUTE</span>
                      </>
                    ) : audioLevel > 15 ? (
                      <>
                        <Mic className="size-2.5 text-emerald-400" />
                        <span>TALKING</span>
                      </>
                    ) : (
                      <>
                        <Mic className="size-2.5 text-cyan-400" />
                        <span>MUTE</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Live Mic Level Bar with % readout */}
                <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-0.5 bg-black/80 p-1 rounded-md border border-white/10 backdrop-blur-xs">
                  <div className="flex items-center justify-between text-[8px] font-mono text-white/90 px-0.5 drop-shadow">
                    <span className="flex items-center gap-1">
                      {isMuted ? <MicOff className="size-2.5 text-rose-400" /> : <Mic className="size-2.5 text-emerald-400" />}
                      <span>MIC</span>
                    </span>
                    <span className={`font-bold ${isMuted ? "text-rose-400" : audioLevel > 15 ? "text-emerald-400" : "text-white/80"}`}>
                      {isMuted ? "MUTED" : `${audioLevel}%`}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/80 overflow-hidden border border-white/20">
                    <div
                      className={`h-full transition-all duration-75 ${
                        isMuted
                          ? "bg-rose-500/20"
                          : audioLevel > 50
                            ? "bg-emerald-400"
                            : audioLevel > 15
                              ? "bg-cyan-400"
                              : "bg-slate-500"
                      }`}
                      style={{ width: `${isMuted ? 0 : Math.max(5, audioLevel)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PHASE 3: FINAL EXECUTIVE SCORECARD                                      */}
        {/* ========================================================================= */}
        {phase === "scorecard" && (
          <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full py-6">
            {/* Header Badge & Verdict */}
            {isDisqualified ? (
              <div className="flex flex-col items-center gap-3 text-center rounded-2xl border-2 border-rose-500/60 bg-rose-950/30 p-6 backdrop-blur-md shadow-xl">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-500/20 border border-rose-500/50 text-rose-400 shadow-lg shadow-rose-500/20">
                  <ShieldAlert className="size-8" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-xs font-black uppercase tracking-widest text-rose-400">
                    Proctoring Compliance Violation (3 Strikes Accumulated)
                  </span>
                  <h1 className="text-3xl font-black text-foreground font-display">
                    Candidate Disqualified
                  </h1>
                  <p className="text-sm text-rose-200/90 max-w-lg mx-auto font-mono mt-1">
                    The live interview was terminated due to accumulating 3 proctoring strikes (tab switching, window blur, or exiting fullscreen). A compliance penalty has been logged.
                  </p>
                </div>
                {ratingUpdate && (
                  <div className="inline-flex items-center gap-2 rounded-xl bg-rose-900/60 border border-rose-500/50 px-4 py-1.5 font-mono text-xs font-bold text-rose-200">
                    <span>Severe Penalty:</span>
                    <span className="text-rose-300 font-black">{ratingUpdate.ratingDelta} pts</span>
                    <span className="opacity-60">•</span>
                    <span>New Rating: {ratingUpdate.newRating} / 100</span>
                  </div>
                )}
              </div>
            ) : isForfeited ? (
              <div className="flex flex-col items-center gap-3 text-center rounded-2xl border-2 border-rose-500/60 bg-rose-950/30 p-6 backdrop-blur-md shadow-xl">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-500/20 border border-rose-500/50 text-rose-400 shadow-lg shadow-rose-500/20">
                  <LogOut className="size-8" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-xs font-black uppercase tracking-widest text-rose-400">
                    Interview Forfeited by Candidate
                  </span>
                  <h1 className="text-3xl font-black text-foreground font-display">
                    Candidate Conceded Session
                  </h1>
                  <p className="text-sm text-rose-200/90 max-w-lg mx-auto font-mono mt-1">
                    Candidate terminated the session before completing solutions. In real FAANG rounds, walking away early without passing code is an immediate Strong No Hire.
                  </p>
                </div>
                {ratingUpdate && (
                  <div className="inline-flex items-center gap-2 rounded-xl bg-rose-900/60 border border-rose-500/50 px-4 py-1.5 font-mono text-xs font-bold text-rose-200">
                    <span>Forfeit Penalty:</span>
                    <span className="text-rose-300 font-black">{ratingUpdate.ratingDelta} pts</span>
                    <span className="opacity-60">•</span>
                    <span>New Rating: {ratingUpdate.newRating} / 100</span>
                  </div>
                )}
              </div>
            ) : scorecard.tiersPassed === 0 || scorecard.composite < 3.5 ? (
              <div className="flex flex-col items-center gap-3 text-center rounded-2xl border-2 border-rose-500/60 bg-rose-950/30 p-6 backdrop-blur-md shadow-xl">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-500/20 border border-rose-500/50 text-rose-400 shadow-lg shadow-rose-500/20">
                  <XCircle className="size-8" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-xs font-black uppercase tracking-widest text-rose-400">
                    Technical Assessment Failed
                  </span>
                  <h1 className="text-3xl font-black text-foreground font-display">
                    Zero Solutions Accepted
                  </h1>
                  <p className="text-sm text-rose-200/90 max-w-lg mx-auto font-mono mt-1">
                    Failed to deliver a working algorithm for Tier 1. In FAANG technical screens, failure to implement a working baseline is an automatic Strong No Hire.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                  <span className="rounded-full bg-rose-950/60 border border-rose-500/50 px-3 py-1 font-mono text-xs font-black text-rose-300">
                    {scorecard.verdict} ({scorecard.composite} / 10.0)
                  </span>
                  {ratingUpdate && (
                    <span className="rounded-full bg-rose-900/50 border border-rose-500/50 px-3 py-1 font-mono text-xs font-black text-rose-300">
                      {ratingUpdate.ratingDelta} pts → {ratingUpdate.newRating}/100 Rating
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/20">
                  <Award className="size-7" />
                </div>
                <span className="font-mono text-xs font-extrabold uppercase tracking-widest text-emerald-400">
                  Technical Interview Complete
                </span>
                <h1 className="text-3xl font-black text-foreground font-display">
                  Executive Interview Performance Scorecard
                </h1>
                <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                  <span className="font-mono text-sm text-muted-foreground">Candidate Outcome:</span>
                  <span
                    className={`rounded-full px-3 py-0.5 font-mono text-xs font-black border ${
                      scorecard.composite >= 8.5
                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                        : scorecard.composite >= 7.0
                          ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                          : "bg-amber-500/20 border-amber-500/50 text-amber-300"
                    }`}
                  >
                    {scorecard.verdict} ({scorecard.composite} / 10.0)
                  </span>
                  {ratingUpdate && (
                    <span
                      className={`rounded-full px-3 py-0.5 font-mono text-xs font-black border ${
                        ratingUpdate.ratingDelta >= 0
                          ? "bg-primary/20 border-primary/50 text-primary"
                          : "bg-rose-950/50 border-rose-500/50 text-rose-300"
                      }`}
                    >
                      {ratingUpdate.ratingDelta >= 0 ? `+${ratingUpdate.ratingDelta}` : ratingUpdate.ratingDelta} pts → {ratingUpdate.newRating}/100 Rating
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Score Grid: 3 Pillars (Delivery, Craft, Integrity) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Pillar 1: Delivery & Confidence */}
              <div
                className={`flex flex-col gap-1.5 rounded-2xl border p-4 backdrop-blur-md ${
                  scorecard.confidenceScore <= 3.5
                    ? "border-rose-500/50 bg-rose-950/25"
                    : scorecard.confidenceScore < 7.5
                      ? "border-amber-500/50 bg-amber-950/25"
                      : "border-border/80 bg-card/75"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    1. Delivery &amp; Confidence
                  </span>
                  <span
                    className={`font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                      scorecard.confidenceScore <= 3.5
                        ? "bg-rose-950/60 border-rose-500/50 text-rose-300"
                        : scorecard.confidenceScore < 7.5
                          ? "bg-amber-950/60 border-amber-500/50 text-amber-300"
                          : "bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
                    }`}
                  >
                    {scorecard.confidenceVerdict}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-black text-foreground font-display">{scorecard.confidenceScore}</span>
                  <span className="font-mono text-xs text-muted-foreground">/ 10</span>
                </div>
                <p className="font-mono text-[11px] text-muted-foreground mt-1">
                  {speakingSeconds === 0
                    ? "Zero verbal communication detected. Candidate mic remained muted/silent throughout."
                    : `${speakingSeconds}s vocalized with ${candidateSpokenUtterances.length} technical queries.`}
                </p>
              </div>

              {/* Pillar 2: Algorithmic Craft */}
              <div
                className={`flex flex-col gap-1.5 rounded-2xl border p-4 backdrop-blur-md ${
                  scorecard.craftScore === 0.0
                    ? "border-rose-500/50 bg-rose-950/25"
                    : scorecard.craftScore < 7.5
                      ? "border-amber-500/50 bg-amber-950/25"
                      : "border-border/80 bg-card/75"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    2. Algorithmic Craft
                  </span>
                  <span
                    className={`font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                      scorecard.craftScore === 0.0
                        ? "bg-rose-950/60 border-rose-500/50 text-rose-300"
                        : scorecard.craftScore < 7.5
                          ? "bg-amber-950/60 border-amber-500/50 text-amber-300"
                          : "bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
                    }`}
                  >
                    {scorecard.craftVerdict}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-black text-foreground font-display">{scorecard.craftScore}</span>
                  <span className="font-mono text-xs text-muted-foreground">/ 10</span>
                </div>
                <p className="font-mono text-[11px] text-muted-foreground mt-1">
                  {completedTiers.length === 0
                    ? "Completed 0 of 3 progression tiers. No working solution submitted."
                    : completedTiers.length === 1
                      ? `Completed Tier 1 (Brute Force) only. Failed to optimize (${hintsUsed} hint${hintsUsed === 1 ? "" : "s"} used).`
                      : completedTiers.length === 2
                        ? `Completed Tiers 1 & 2. Missed optimal Tier 3 complexity (${hintsUsed} hint${hintsUsed === 1 ? "" : "s"} used).`
                        : `Completed all 3 progression tiers from Brute Force to Optimal (${hintsUsed} hint${hintsUsed === 1 ? "" : "s"} used).`}
                </p>
              </div>

              {/* Pillar 3: Proctoring & Integrity */}
              <div
                className={`flex flex-col gap-1.5 rounded-2xl border p-4 backdrop-blur-md ${
                  scorecard.integrityScore <= 5.0
                    ? "border-rose-500/50 bg-rose-950/25"
                    : scorecard.integrityScore < 9.0
                      ? "border-amber-500/50 bg-amber-950/25"
                      : "border-border/80 bg-card/75"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    3. Proctoring &amp; Integrity
                  </span>
                  <span
                    className={`font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                      scorecard.integrityScore <= 5.0
                        ? "bg-rose-950/60 border-rose-500/50 text-rose-300"
                        : scorecard.integrityScore < 9.0
                          ? "bg-amber-950/60 border-amber-500/50 text-amber-300"
                          : "bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
                    }`}
                  >
                    {scorecard.integrityVerdict}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-black text-foreground font-display">{scorecard.integrityScore}</span>
                  <span className="font-mono text-xs text-muted-foreground">/ 10</span>
                </div>
                <p className="font-mono text-[11px] text-muted-foreground mt-1">
                  {strikes === 0 ? "Flawless compliance. 0 window switches or blurs." : `${strikes} proctoring warning/strike penalty applied.`}
                </p>
              </div>
            </div>

            {/* FAANG HIRING COMMITTEE DEBRIEF & BRUTAL CRITIQUE */}
            <div className="rounded-2xl border-2 border-rose-500/40 bg-card/90 p-5 backdrop-blur-md shadow-xl flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400">
                    <FileWarning className="size-4.5" />
                  </div>
                  <div>
                    <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                      FAANG Hiring Committee Debrief &amp; Unfiltered Critique
                    </h3>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      Simulated Staff/Senior Interviewer calibration packet submitted to the hiring bar raiser.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 font-mono text-[10px] font-black border ${
                      scorecard.committeeConsensus.includes("REJECT")
                        ? "bg-rose-950/60 border-rose-500/60 text-rose-300"
                        : scorecard.committeeConsensus.includes("STRONG HIRE")
                          ? "bg-emerald-950/60 border-emerald-500/60 text-emerald-300"
                          : "bg-amber-950/60 border-amber-500/60 text-amber-300"
                    }`}
                  >
                    Consensus: {scorecard.committeeConsensus}
                  </span>
                  <span className="rounded-full bg-muted/40 border border-border/60 px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
                    {scorecard.levelCalibration}
                  </span>
                </div>
              </div>

              {/* Unvarnished Packet Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 font-mono text-xs">
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Code2 className="size-3.5 text-primary" /> Technical Problem-Solving Packet
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {scorecard.craftCritique}
                  </p>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Mic className="size-3.5 text-cyan-400" /> Think-Out-Loud Communication Packet
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {scorecard.confidenceCritique}
                  </p>
                </div>
              </div>

              {/* Identified Red Flags (No Sugarcoating) */}
              {(speakingSeconds === 0 || completedTiers.length === 0 || referenceSolutionsViewedCount > 0 || strikes > 0 || isDisqualified || isForfeited) && (
                <div className="rounded-xl border border-rose-500/50 bg-rose-950/20 p-3.5 flex flex-col gap-2 font-mono text-xs">
                  <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5 text-rose-400" /> Critical Red Flags Detected During Observation
                  </span>
                  <ul className="flex flex-col gap-1 text-[11px] text-rose-200/90 list-disc list-inside">
                    {speakingSeconds === 0 && (
                      <li>
                        <strong>Microphone Mute / Complete Silence:</strong> Candidate did not verbalize thoughts or explain code. Instant failure at Google/Meta.
                      </li>
                    )}
                    {completedTiers.length === 0 && (
                      <li>
                        <strong>No Executable Solution Delivered:</strong> Failed to validate even Tier 1 brute-force test cases.
                      </li>
                    )}
                    {referenceSolutionsViewedCount > 0 && (
                      <li>
                        <strong>Reference Answer Manual Consulted ({referenceSolutionsViewedCount}x):</strong> Looked at canonical solutions during live solving (-{ (referenceSolutionsViewedCount * 3).toFixed(1) } pts).
                      </li>
                    )}
                    {strikes > 0 && (
                      <li>
                        <strong>Proctoring Window Focus Lost ({strikes}/3):</strong> Tab switching or viewport blur recorded.
                      </li>
                    )}
                    {isForfeited && (
                      <li>
                        <strong>Interview Abandonment:</strong> Voluntarily terminated without attempting optimal resolution.
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Prescribed Remediation Drills */}
              <div className="rounded-xl border border-border/60 bg-muted/15 p-3.5 flex flex-col gap-1.5 font-mono text-xs">
                <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">
                  Mandatory Training Drills Before Real FAANG Onsites
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                  <div className="rounded-lg border border-border/50 bg-background/50 p-2">
                    <strong className="text-foreground block mb-0.5">1. Verbalize Invariants</strong>
                    Explain time/space trade-offs out loud before typing a single line of code.
                  </div>
                  <div className="rounded-lg border border-border/50 bg-background/50 p-2">
                    <strong className="text-foreground block mb-0.5">2. Strict Independence</strong>
                    Never open solutions or hints during practice; build independent derivation stamina.
                  </div>
                  <div className="rounded-lg border border-border/50 bg-background/50 p-2">
                    <strong className="text-foreground block mb-0.5">3. 8-Minute Baseline</strong>
                    Always write an initial brute-force routine within 8 minutes so you never score zero.
                  </div>
                </div>
              </div>
            </div>

            {/* Candidate Speech Communication & Voice Confidence Breakdown */}
            <div className="rounded-2xl border border-border/80 bg-card/75 p-5 backdrop-blur-md flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                    <Mic className="size-4" />
                  </div>
                  <div>
                    <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                      Candidate Speech Communication &amp; Voice Analysis
                    </h3>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      Real-time microphone telemetry, verbal question asking, and speech cadence under proctoring.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-black border ${
                      speakingSeconds === 0
                        ? "bg-rose-950/60 border-rose-500/60 text-rose-300"
                        : scorecard.confidenceScore >= 8.5
                          ? "bg-emerald-950/50 border-emerald-500/50 text-emerald-300"
                          : scorecard.confidenceScore >= 6.0
                            ? "bg-cyan-950/50 border-cyan-500/50 text-cyan-300"
                            : "bg-rose-950/50 border-rose-500/50 text-rose-300"
                    }`}
                  >
                    {speakingSeconds === 0
                      ? "Silent / Muted (0.5 / 10)"
                      : scorecard.confidenceScore >= 8.5
                        ? "High Speech Confidence"
                        : scorecard.confidenceScore >= 6.0
                          ? "Clear & Steady Communicator"
                          : "Severe Speech Deficit"}
                  </span>
                </div>
              </div>

              {/* Voice Telemetry Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3 flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground uppercase">Speaking Duration</span>
                  <span className={`text-base font-bold ${speakingSeconds === 0 ? "text-rose-400" : "text-foreground"}`}>{speakingSeconds}s</span>
                  <span className="text-[9px] text-muted-foreground">Verbal explanation time</span>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3 flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground uppercase">Inquiries Voiced</span>
                  <span className="text-base font-bold text-cyan-300">{candidateSpokenUtterances.length}</span>
                  <span className="text-[9px] text-muted-foreground">Technical doubts asked</span>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3 flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground uppercase">Confidence Score</span>
                  <span className={`text-base font-bold ${scorecard.confidenceScore <= 3.5 ? "text-rose-400" : "text-emerald-400"}`}>{scorecard.confidenceScore} / 10</span>
                  <span className="text-[9px] text-muted-foreground">Cadence &amp; delivery</span>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3 flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground uppercase">Reference Consults</span>
                  <span className={`text-base font-bold ${referenceSolutionsViewedCount > 0 ? "text-rose-400" : "text-emerald-400"}`}>{referenceSolutionsViewedCount}</span>
                  <span className="text-[9px] text-muted-foreground">Solution views used</span>
                </div>
              </div>

              {/* Audio Recording Replay Player */}
              {recordedAudioUrl ? (
                <div className="rounded-xl border border-cyan-500/40 bg-cyan-950/20 p-3.5 flex flex-col gap-2">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="font-bold text-cyan-200 flex items-center gap-1.5">
                      <Volume2 className="size-4 text-cyan-400" /> Session Candidate Audio Recording Replay
                    </span>
                    <span className="text-[10px] text-cyan-400/80 font-mono">Recorded Live via Mic</span>
                  </div>
                  <audio controls src={recordedAudioUrl} className="w-full h-9 rounded-md outline-none" />
                  <span className="text-[10px] font-mono text-muted-foreground">
                    Your microphone audio was recorded during the interview session to evaluate speech cadence, thought articulation, and verbal problem walkthroughs.
                  </span>
                </div>
              ) : (
                <div className="rounded-xl border border-border/60 bg-muted/15 p-3 font-mono text-xs text-muted-foreground flex items-center gap-2">
                  <Info className="size-4 text-muted-foreground shrink-0" />
                  <span>No recorded audio stream available for this session (candidate microphone was muted or recorder did not capture audio).</span>
                </div>
              )}

              {/* Spoken Doubts & Real-Time Answers Transcript */}
              {candidateSpokenUtterances.length > 0 && (
                <div className="flex flex-col gap-2 border-t border-border/60 pt-3 font-mono text-xs">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <Radio className="size-3.5 text-primary" />
                    Spoken Technical Doubts &amp; Real-Time Interviewer Answers ({candidateSpokenUtterances.length})
                  </span>
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                    {candidateSpokenUtterances.map((utt, i) => (
                      <div key={i} className="rounded-lg border border-border/60 bg-card/60 p-2.5 flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span className="font-bold text-primary">Inquiry #{i + 1}</span>
                          <span>{utt.time}</span>
                        </div>
                        <p className="text-foreground italic font-sans">&ldquo;{utt.text}&rdquo;</p>
                        {utt.answer && (
                          <div className="mt-1 pt-1 border-t border-border/40 text-[11px] text-cyan-300 flex items-start gap-1.5">
                            <Volume2 className="size-3 text-cyan-400 shrink-0 mt-0.5" />
                            <span>
                              <strong>Interviewer:</strong> {utt.answer}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tier Progression Timeline Breakdown */}
            <div className="rounded-2xl border border-border/80 bg-card/75 p-5 backdrop-blur-md flex flex-col gap-3">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                3-Tier Solution Progression Timeline
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                {([1, 2, 3] as const).map((tNum) => {
                  const tSpec = problem.tiers[tNum];
                  const duration = tierDurations[tNum] || 0;
                  const isPassed = completedTiers.includes(tNum);
                  const isCurrentFailed =
                    (!isPassed && currentTier === tNum) || (!isPassed && tNum === 1 && completedTiers.length === 0);
                  const isLocked = !isPassed && !isCurrentFailed;

                  return (
                    <div
                      key={tNum}
                      className={`rounded-xl border p-3 flex flex-col gap-1.5 transition-all ${
                        isPassed
                          ? "border-emerald-500/40 bg-emerald-950/20"
                          : isCurrentFailed
                            ? "border-rose-500/50 bg-rose-950/25"
                            : "border-border/60 bg-muted/10 opacity-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-bold ${isPassed ? "text-emerald-300" : isCurrentFailed ? "text-rose-300" : "text-muted-foreground"}`}>
                          Tier {tNum}: {tSpec.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{isPassed ? `${duration}s` : "0s"}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">Target: {tSpec.complexityTag}</span>
                      <span
                        className={`text-[10px] font-bold flex items-center gap-1 mt-1 ${
                          isPassed ? "text-emerald-400" : isCurrentFailed ? "text-rose-400" : "text-muted-foreground"
                        }`}
                      >
                        {isPassed ? (
                          <>
                            <CheckCircle2 className="size-3" /> Successfully Validated
                          </>
                        ) : isCurrentFailed ? (
                          <>
                            <XCircle className="size-3" /> Failed / Not Solved
                          </>
                        ) : (
                          <>
                            <Lock className="size-3" /> Unreached (Locked)
                          </>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Button
                onClick={() => {
                  setPhase("pre-check");
                  setIsDisqualified(false);
                  setIsForfeited(false);
                  setCompletedTiers([]);
                  setCurrentTier(1);
                  setHintsUsed(0);
                  setReferenceSolutionsViewedCount(0);
                  setCandidateSpokenUtterances([]);
                  setSpeakingSeconds(0);
                  setStrikes(0);
                  setRatingUpdate(null);
                  setTestRunResults(null);
                  hasSavedSessionRef.current = false;
                  handleRandomizeProblem();
                }}
                className="font-mono text-xs font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2 cursor-pointer"
              >
                <RotateCcw className="size-4" /> Practice Another Random Question
              </Button>

              <Link
                to="/dashboard"
                className="rounded-lg border border-border/80 bg-card/80 hover:bg-secondary px-5 py-2 font-mono text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FORFEIT / CONCEDE CONFIRMATION MODAL                                    */}
        {/* ========================================================================= */}
        {showForfeitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-md rounded-2xl border-2 border-rose-500/60 bg-card p-6 shadow-2xl flex flex-col gap-4">
              <div className="flex items-center gap-3 border-b border-border/70 pb-3">
                <div className="size-10 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
                  <AlertOctagon className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base">Concede / Forfeit Interview?</h3>
                  <span className="font-mono text-xs text-rose-400 font-semibold">Strict FAANG Penalty Warning</span>
                </div>
              </div>
              <p className="font-mono text-xs text-muted-foreground leading-relaxed">
                Are you sure you want to concede this session early? In real technical screens, walking away without delivering working solutions results in an immediate <strong className="text-rose-400">STRONG NO HIRE</strong> and an unhedged <strong className="text-rose-400">-22 pt rating deduction</strong>.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForfeitModal(false)}
                  className="font-mono text-xs cursor-pointer"
                >
                  Cancel &amp; Continue Coding
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmForfeit}
                  className="font-mono text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
                >
                  Confirm Forfeiture
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* REFERENCE SOLUTION MODAL (Tier-Specific Canonical Implementation)       */}
        {/* ========================================================================= */}
        {showReferenceSolutionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl rounded-2xl border border-border/80 bg-card p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-border/70 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center">
                    <Lightbulb className="size-4 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                      Reference Solution — Tier {currentTier} ({problem.tiers[currentTier].name})
                    </h3>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {problem.title} • Target: {problem.tiers[currentTier].complexityTag}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReferenceSolutionModal(false)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Consultation Info */}
              <div className="rounded-lg bg-amber-950/30 border border-amber-500/40 p-3 font-mono text-xs text-amber-200 flex items-start gap-2">
                <AlertCircle className="size-4 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <strong>Canonical Reference Solution:</strong> Inspect the recommended algorithm structure and invariants for Tier {currentTier}. Note: Viewing the reference solution is logged for the final evaluation scorecard.
                </div>
              </div>

              {/* Reference Code Viewer */}
              <div className="relative flex-1 overflow-y-auto rounded-xl border border-border/80 bg-[#0d1117] p-4 font-mono text-xs text-slate-100">
                <pre className="overflow-x-auto whitespace-pre leading-relaxed">
                  <code>{problem.tiers[currentTier].referenceSolution?.[language]}</code>
                </pre>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-border/70">
                <span className="font-mono text-xs text-muted-foreground">
                  Language: <strong className="text-foreground capitalize">{language}</strong>
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyReference}
                    className="font-mono text-xs gap-1.5 border-border cursor-pointer"
                  >
                    {copiedReference ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                    {copiedReference ? "Copied!" : "Copy Code"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setShowReferenceSolutionModal(false)}
                    className="font-mono text-xs bg-primary text-primary-foreground cursor-pointer"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
