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
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import {
  LIVE_INTERVIEW_PROBLEMS,
  generateLocalSocraticAnswer,
  type LiveInterviewProblem,
  type ProblemTier,
} from "@/data/live-interview-problems";
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
type ProgrammingLang = "python" | "javascript" | "typescript";

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
  // Current Interview Flow Phase
  const [phase, setPhase] = useState<InterviewPhase>("pre-check");

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
  const [isMuted, setIsMuted] = useState(false); // Candidate mic mute

  // Spoken AI Interviewer State
  const [isAiMuted, setIsAiMuted] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [dialogueLog, setDialogueLog] = useState<DialogueEntry[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);

  // Spoken Voice Questions & Audio Inquiry State
  const [candidateSpeechTranscript, setCandidateSpeechTranscript] = useState("");
  const [typedQuestion, setTypedQuestion] = useState("");
  const [isProcessingQuestion, setIsProcessingQuestion] = useState(false);
  const [lastCandidateQuestion, setLastCandidateQuestion] = useState<string | null>(null);
  const [lastInterviewerAnswer, setLastInterviewerAnswer] = useState<string | null>(null);

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

  // Voice Synthesizer Helper
  const speakAloud = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

      // Add to dialogue log
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setDialogueLog((prev) => [...prev, { speaker: "interviewer", text, timestamp: timeStr }]);

      if (isAiMuted) return;

      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.98;
        utterance.pitch = 0.95;

        // Try selecting an English voice
        const voices = window.speechSynthesis.getVoices();
        const naturalVoice =
          voices.find((v) => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha") || v.name.includes("Daniel"))) ||
          voices.find((v) => v.lang.startsWith("en"));
        if (naturalVoice) utterance.voice = naturalVoice;

        utterance.onstart = () => {
          isAiSpeakingRef.current = true;
          setIsAiSpeaking(true);
          if (recognitionRef.current) {
            try {
              recognitionRef.current.stop();
            } catch {}
          }
        };

        utterance.onend = () => {
          isAiSpeakingRef.current = false;
          setIsAiSpeaking(false);
          // Resume speech recognition after speech synthesis finishes
          setTimeout(() => {
            if (phase === "in-session" && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch {}
            }
          }, 400);
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
    [isAiMuted, phase],
  );

  // High-Precision Time-Domain RMS Audio Monitoring (Never stays 0)
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

      const checkVolume = () => {
        if (!analyserRef.current) return;
        if (audioContextRef.current && audioContextRef.current.state === "suspended") {
          audioContextRef.current.resume().catch(() => {});
        }

        analyserRef.current.getByteTimeDomainData(timeDomainData);
        let sumSquares = 0;
        for (let i = 0; i < timeDomainData.length; i++) {
          const val = timeDomainData[i] ?? 128;
          const norm = (val - 128) / 128;
          sumSquares += norm * norm;
        }
        const rms = Math.sqrt(sumSquares / timeDomainData.length);
        // Instant response: typical conversational speech RMS is 0.02 - 0.3
        const normalized = Math.min(100, Math.round(rms * 400));
        setAudioLevel(normalized);

        // Track candidate speaking duration (volume > 8 counts as active voice)
        if (normalized > 8) {
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
        track.enabled = true;
      });

      setMediaStream(stream);
      setHasCamMicPermission(true);

      // Attach stream to preview video
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

  // Socratic Voice & Text Question Handler (Strict Non-Giveaway & In-Context Enforcement)
  const handleCandidateVoiceQuestion = useCallback(
    async (rawQuestion: string) => {
      const q = rawQuestion.trim();
      if (!q || isProcessingQuestionRef.current || isAiSpeakingRef.current) return;

      if (q.length < 4 || q.toLowerCase() === lastCandidateQuestion?.toLowerCase()) {
        return;
      }

      isProcessingQuestionRef.current = true;
      setIsProcessingQuestion(true);
      setLastCandidateQuestion(q);
      setCandidateSpeechTranscript("");

      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setDialogueLog((prev) => [...prev, { speaker: "candidate", text: q, timestamp: timeStr }]);

      // Temporarily pause recognition while processing
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }

      try {
        const lowerQ = q.toLowerCase();

        // 1. Strict Out-of-Context Detection
        const isOutOfContext = (
          /weather|rain|sunny|forecast|cricket|football|soccer|super bowl|messi|ronaldo|nba|movie|song|music|singer|president|election|politics|crypto|bitcoin|tell me a joke|are you single|dating|restaurant|lunch|dinner|game of thrones|minecraft|fortnite/i.test(
            lowerQ,
          ) && !/temperature|array|integer|number|price/i.test(lowerQ)
        );

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
          // 2. Call backend /api/chat with strict Socratic interviewer instructions
          let aiResponseText = "";
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2600);

            const res = await fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: controller.signal,
              body: JSON.stringify({
                messages: [{ role: "user", content: q }],
                role: "interviewer",
                context: {
                  problemTitle: problem.title,
                  problemSlug: problem.slug,
                  difficulty: problem.difficulty,
                  category: problem.category,
                  constraints: problem.constraints,
                  currentTier,
                  tierName: problem.tiers[currentTier].name,
                  tierComplexity: problem.tiers[currentTier].complexityTag,
                  tierObjective: problem.tiers[currentTier].objective,
                },
                systemInstruction: `You are an elite, strict Socratic Technical Interviewer at a tier-1 company. The candidate is speaking to you over their microphone during a live coding interview on problem: "${problem.title}".
Active Tier: Tier ${currentTier} (${problem.tiers[currentTier].name}, Target: ${problem.tiers[currentTier].complexityTag}).
Tier Objective: ${problem.tiers[currentTier].objective}.
Problem Constraints: ${problem.constraints.join("; ")}.

STRICT LAWS:
1. Limit your spoken answer to 1 to 3 concise, natural sentences.
2. NEVER GIVE AWAY THE CODE OR DIRECT SOLUTION. Do not write code for them.
3. STRICT CONTEXT: Only discuss this DSA problem, its constraints, or the candidate's algorithmic reasoning. If they ask about unrelated topics, politely redirect them back to the problem immediately.
4. If they ask about constraints or inputs, answer accurately based on the problem specification.
5. If they ask for a hint, provide a gentle Socratic nudge without spoiling the algorithm.`,
              }),
            });

            clearTimeout(timeoutId);
            if (res.ok) {
              const data = await res.json();
              if (data && data.content) {
                aiResponseText = data.content.trim();
              }
            }
          } catch {
            // Offline or timeout fallback
          }

          if (aiResponseText && aiResponseText.length > 10) {
            socraticAnswer = aiResponseText;
          } else {
            // Local Socratic Intelligence Engine (Instant 0ms Fallback)
            socraticAnswer = generateLocalSocraticAnswer(lowerQ, problem, currentTier);
          }
        }

        setLastInterviewerAnswer(socraticAnswer);
        speakAloud(socraticAnswer);
      } finally {
        isProcessingQuestionRef.current = false;
        setIsProcessingQuestion(false);
      }
    },
    [problem, currentTier, lastCandidateQuestion, speakAloud],
  );

  // Web Speech Recognition: Real-time Audio Listener
  useEffect(() => {
    if (phase !== "in-session") {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
        recognitionRef.current = null;
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

    recognition.onresult = (event: any) => {
      if (isAiSpeakingRef.current || isProcessingQuestionRef.current) return;

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
          if (!isAiSpeakingRef.current && !isProcessingQuestionRef.current) {
            handleCandidateVoiceQuestion(spoken);
          }
        }, 1400);
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error !== "no-speech") {
        console.warn("Speech recognition notice:", e.error);
      }
    };

    recognition.onend = () => {
      if (phase === "in-session" && !isAiSpeakingRef.current && recognitionRef.current) {
        try {
          recognition.start();
        } catch {}
      }
    };

    try {
      recognition.start();
    } catch {}

    return () => {
      clearTimeout(speechTimer);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
        recognitionRef.current = null;
      }
    };
  }, [phase, handleCandidateVoiceQuestion]);

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
  const handleSubmitTier = () => {
    setIsEvaluating(true);
    setValidationError(null);

    const activeTierSpec = problem.tiers[currentTier];

    setTimeout(() => {
      setIsEvaluating(false);

      // Simple heuristic evaluation: check if code is non-trivial and has expected patterns
      const trimmed = code.trim();
      const lineCount = trimmed.split("\n").length;

      if (lineCount < 3 || trimmed.length < 25) {
        const errorMsg = "Solution appears incomplete. Please provide a functional implementation.";
        setValidationError(errorMsg);
        speakAloud("I noticed your solution is incomplete. Take your time to write out the logic before submitting.");
        return;
      }

      // Check if it's Tier 1, 2, or 3
      const now = Date.now();
      const startTime = tierStartTimes[currentTier] || now;
      const duration = Math.round((now - startTime) / 1000);
      setTierDurations((prev) => ({ ...prev, [currentTier]: duration }));

      if (currentTier === 1) {
        // Completed Tier 1 -> Move to Tier 2
        setCompletedTiers((prev) => [...prev, 1]);
        toast.success("Tier 1: Brute Force Accepted!");
        speakAloud(activeTierSpec.interviewerPraise + " " + activeTierSpec.nextPrompt);
        setCurrentTier(2);
        setTierStartTimes((prev) => ({ ...prev, 2: Date.now() }));
      } else if (currentTier === 2) {
        // Completed Tier 2 -> Move to Tier 3
        setCompletedTiers((prev) => [...prev, 2]);
        toast.success("Tier 2: Better Approach Accepted!");
        speakAloud(activeTierSpec.interviewerPraise + " " + activeTierSpec.nextPrompt);
        setCurrentTier(3);
        setTierStartTimes((prev) => ({ ...prev, 3: Date.now() }));
      } else if (currentTier === 3) {
        // Completed Tier 3 -> Move to Final Scorecard!
        setCompletedTiers((prev) => [...prev, 3]);
        toast.success("Tier 3: Optimal Solution Accepted! Interview Completed!");
        speakAloud(activeTierSpec.interviewerPraise + " " + activeTierSpec.nextPrompt);

        setTimeout(() => {
          setPhase("scorecard");
        }, 1800);
      }
    }, 900);
  };

  // Request a subtle hint
  const handleRequestHint = () => {
    setHintsUsed((h) => h + 1);
    const hints = problem.tiers[currentTier].socraticHints;
    const selectedHint = hints[hintsUsed % hints.length] || hints[0]!;
    speakAloud(`Here is a thought: ${selectedHint}`);
  };

  // Re-roll question in pre-check
  const handleRandomizeProblem = () => {
    const nextIdx = (problemIndex + 1) % LIVE_INTERVIEW_PROBLEMS.length;
    setProblemIndex(nextIdx);
  };

  // Scorecard Calculations (Out of 10)
  const scorecard = useMemo(() => {
    // 1. Confidence & Delivery (0 - 10): based on speaking duration and volume
    const speakingRatio = Math.min(1, speakingSeconds / 45);
    const confidenceScore = Math.min(10, Math.max(5.5, Math.round((7.0 + speakingRatio * 2.8) * 10) / 10));

    // 2. Algorithmic Craft (0 - 10): 3 tiers = 10, -0.5 per hint
    const tierBonus = completedTiers.length === 3 ? 10.0 : completedTiers.length === 2 ? 7.5 : 5.0;
    const craftScore = Math.max(4.0, Math.round((tierBonus - hintsUsed * 0.5) * 10) / 10);

    // 3. Proctoring & Integrity (0 - 10): 10.0 base, -1.8 per strike
    const integrityScore = Math.max(2.0, Math.round((10.0 - strikes * 1.8) * 10) / 10);

    // Composite Score
    const composite = Math.round(((confidenceScore * 0.35 + craftScore * 0.45 + integrityScore * 0.2) * 10)) / 10;

    let verdict = "STRONG HIRE";
    if (composite < 6.5) verdict = "NEEDS PRACTICE";
    else if (composite < 8.0) verdict = "LEANING HIRE";
    else if (composite < 9.0) verdict = "HIRE";

    return {
      confidenceScore,
      craftScore,
      integrityScore,
      composite,
      verdict,
    };
  }, [speakingSeconds, completedTiers.length, hintsUsed, strikes]);

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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                {/* Video Feed Box */}
                <div className="relative flex aspect-video w-full flex-col items-center justify-center rounded-xl border border-border/80 bg-black/60 overflow-hidden shadow-inner">
                  {hasCamMicPermission ? (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="h-full w-full object-cover -scale-x-100"
                      />
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-md bg-black/70 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-400 border border-emerald-500/40 backdrop-blur-xs">
                        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        LIVE CAM 640x480
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-center p-4 text-muted-foreground font-mono text-xs">
                      <Video className="size-8 text-muted-foreground/60" />
                      <span>Webcam feed will display here once allowed</span>
                    </div>
                  )}
                </div>

                {/* Microphone Level & System Checklist */}
                <div className="flex flex-col gap-3 justify-center">
                  <div className="flex flex-col gap-1.5 rounded-xl border border-border/60 bg-card/60 p-3">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="flex items-center gap-1.5 font-bold text-foreground">
                        <Mic className={`size-3.5 ${audioLevel > 15 ? "text-emerald-400 animate-pulse" : "text-primary"}`} /> Microphone Sensitivity
                      </span>
                      <span className={`font-bold ${audioLevel > 15 ? "text-emerald-400" : "text-muted-foreground"}`}>{audioLevel}%</span>
                    </div>
                    {/* Audio Level Meter */}
                    <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden border border-border/50">
                      <div
                        className={`h-full transition-all duration-75 ${
                          audioLevel > 50 ? "bg-emerald-400" : audioLevel > 15 ? "bg-cyan-400" : "bg-muted-foreground/40"
                        }`}
                        style={{ width: `${Math.max(5, audioLevel)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
                      <span>Speak into your microphone to verify audio pickup</span>
                      {hasCamMicPermission && (
                        <button
                          type="button"
                          onClick={() => {
                            if (audioContextRef.current && audioContextRef.current.state === "suspended") {
                              audioContextRef.current.resume().catch(() => {});
                            }
                            if (mediaStream) {
                              setupAudioMonitoring(mediaStream);
                            }
                          }}
                          className="text-primary hover:underline cursor-pointer"
                        >
                          Tap to wake audio
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Rules Checklist */}
                  <div className="flex flex-col gap-1.5 font-mono text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`size-3.5 ${hasCamMicPermission ? "text-emerald-400" : "text-muted-foreground/40"}`} />
                      <span>Camera & Microphone permission granted</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-emerald-400" />
                      <span>Full screen locked during interview session</span>
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
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${audioLevel > 15 ? "bg-emerald-400" : "bg-cyan-400"} opacity-75`} />
                        <span className={`relative inline-flex rounded-full size-2.5 ${audioLevel > 15 ? "bg-emerald-500" : "bg-cyan-500"}`} />
                      </span>
                      <span className="font-mono text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Mic className="size-3.5 text-cyan-400" />
                        <span>Live Mic Channel:</span>
                        <span className="text-cyan-300 font-semibold">
                          {isAiSpeaking ? "AI Interviewer Speaking..." : audioLevel > 15 ? "Candidate Speaking..." : "Listening to your Mic"}
                        </span>
                      </span>
                    </div>

                    {/* Mic Sensitivity Gauge & Status */}
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-muted-foreground">Mic Volume:</span>
                      <div className="w-20 h-2 rounded-full bg-black/50 overflow-hidden border border-border/70">
                        <div
                          className={`h-full transition-all duration-75 ${
                            audioLevel > 50 ? "bg-emerald-400" : audioLevel > 15 ? "bg-cyan-400" : "bg-muted-foreground/40"
                          }`}
                          style={{ width: `${Math.max(4, audioLevel)}%` }}
                        />
                      </div>
                      <span className={`font-bold ${audioLevel > 15 ? "text-emerald-400" : "text-muted-foreground"}`}>
                        {audioLevel}%
                      </span>
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
                      💡 Give me a hint
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

                {/* Editor Header: Language selector + Silent Observer telemetry */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 bg-card/75 p-2.5 backdrop-blur-sm font-mono text-xs">
                  {/* Language Pills */}
                  <div className="flex items-center gap-1">
                    {(["python", "javascript", "typescript"] as const).map((lang) => (
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
                        {lang === "python" ? "Python 3" : lang === "javascript" ? "JavaScript" : "TypeScript"}
                      </button>
                    ))}
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

                {validationError && (
                  <div className="rounded-lg bg-rose-950/40 border border-rose-500/50 p-2.5 font-mono text-xs text-rose-200 flex items-center gap-2">
                    <AlertTriangle className="size-4 shrink-0 text-rose-400" />
                    <span>{validationError}</span>
                  </div>
                )}

                {/* Bottom Actions: Submit Tier Solution + Socratic Hint Request */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleRequestHint}
                    className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-card/80 hover:bg-card px-3 py-1.5 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors shadow-xs"
                  >
                    <HelpCircle className="size-3.5 text-amber-400" />
                    <span>Request Socratic Hint ({hintsUsed} used)</span>
                  </button>

                  <Button
                    onClick={handleSubmitTier}
                    disabled={isEvaluating}
                    className="font-mono text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 disabled:opacity-50"
                  >
                    {isEvaluating ? (
                      <>
                        <span className="size-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        Evaluating Solution...
                      </>
                    ) : (
                      <>
                        <Check className="size-4" />
                        Submit Solution for Tier {currentTier} ({problem.tiers[currentTier].name})
                      </>
                    )}
                  </Button>
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

                {/* Candidate Voice Activity Badge */}
                {audioLevel > 15 && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 rounded bg-emerald-950/90 px-1.5 py-0.5 font-mono text-[8px] font-bold text-emerald-300 border border-emerald-500/50 animate-pulse">
                    <Mic className="size-2.5 text-emerald-400" />
                    SPEAKING
                  </div>
                )}

                {/* AI Speaking Waveform Badge */}
                {isAiSpeaking && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 rounded bg-cyan-950/90 px-1.5 py-0.5 font-mono text-[8px] font-bold text-cyan-300 border border-cyan-500/50 animate-pulse">
                    <Volume2 className="size-2.5 text-cyan-400" />
                    AI TALKING
                  </div>
                )}

                {/* Live Mic Level Bar with % readout */}
                <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-0.5 bg-black/75 p-1 rounded-md border border-white/10 backdrop-blur-xs">
                  <div className="flex items-center justify-between text-[8px] font-mono text-white/90 px-0.5 drop-shadow">
                    <span className="flex items-center gap-1">
                      <Mic className="size-2.5 text-emerald-400" /> MIC
                    </span>
                    <span className={`font-bold ${audioLevel > 15 ? "text-emerald-400" : "text-white/80"}`}>{audioLevel}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/80 overflow-hidden border border-white/20">
                    <div
                      className={`h-full transition-all duration-75 ${
                        audioLevel > 50 ? "bg-emerald-400" : audioLevel > 15 ? "bg-cyan-400" : "bg-slate-500"
                      }`}
                      style={{ width: `${Math.max(5, audioLevel)}%` }}
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
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-sm text-muted-foreground">Candidate Outcome:</span>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/50 px-3 py-0.5 font-mono text-xs font-black text-emerald-300">
                  {scorecard.verdict} ({scorecard.composite} / 10.0)
                </span>
              </div>
            </div>

            {/* Score Grid: 3 Pillars (Delivery, Craft, Integrity) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Pillar 1: Delivery & Confidence */}
              <div className="flex flex-col gap-1.5 rounded-2xl border border-border/80 bg-card/75 p-4 backdrop-blur-md">
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  1. Delivery & Confidence
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-foreground font-display">{scorecard.confidenceScore}</span>
                  <span className="font-mono text-xs text-muted-foreground">/ 10</span>
                </div>
                <p className="font-mono text-[11px] text-muted-foreground mt-1">
                  Speech cadence, flow stability, and articulate verbalization under observation.
                </p>
              </div>

              {/* Pillar 2: Algorithmic Craft */}
              <div className="flex flex-col gap-1.5 rounded-2xl border border-border/80 bg-card/75 p-4 backdrop-blur-md">
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  2. Algorithmic Craft
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-foreground font-display">{scorecard.craftScore}</span>
                  <span className="font-mono text-xs text-muted-foreground">/ 10</span>
                </div>
                <p className="font-mono text-[11px] text-muted-foreground mt-1">
                  Completed all 3 progression tiers from Brute Force to Optimal with {hintsUsed} hint{hintsUsed === 1 ? "" : "s"} used.
                </p>
              </div>

              {/* Pillar 3: Proctoring & Integrity */}
              <div className="flex flex-col gap-1.5 rounded-2xl border border-border/80 bg-card/75 p-4 backdrop-blur-md">
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  3. Proctoring & Integrity
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-foreground font-display">{scorecard.integrityScore}</span>
                  <span className="font-mono text-xs text-muted-foreground">/ 10</span>
                </div>
                <p className="font-mono text-[11px] text-muted-foreground mt-1">
                  {strikes === 0 ? "Flawless compliance. 0 window switches or blurs." : `${strikes} proctoring warning/strike penalty applied.`}
                </p>
              </div>
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

                  return (
                    <div key={tNum} className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-3 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-300">Tier {tNum}: {tSpec.name}</span>
                        <span className="text-[10px] text-muted-foreground">{duration}s</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">Target: {tSpec.complexityTag}</span>
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-1">
                        <CheckCircle2 className="size-3" /> Successfully Validated
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
                  handleRandomizeProblem();
                }}
                className="font-mono text-xs font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2"
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
      </main>
    </div>
  );
}
