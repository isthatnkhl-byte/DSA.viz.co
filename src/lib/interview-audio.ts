/**
 * Interview Audio Engine
 * - Web Speech Synthesis for spoken AI interviewer voice
 * - Web Audio API AnalyserNode for real-time candidate vocal energy & volume meter
 * - SpeechRecognition (WebKit / Web Standard) for live candidate reasoning transcript
 * - Confidence & Delivery score calculator (0 - 10)
 */

export interface ConfidenceReport {
  overallConfidenceScore: number; // 0 to 10
  vocalSteadinessScore: number; // 0 to 10
  fluencyScore: number; // 0 to 10
  articulationScore: number; // 0 to 10
  totalSpokenSeconds: number;
  totalWordsSpoken: number;
  wordsPerMinute: number;
  fillerWordCount: number;
  fillerWordsDetected: string[];
  hesitationPauses: number;
  feedbackSummary: string;
}

export class InterviewSpeechSynthesizer {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.synth = window.speechSynthesis;
      this.initVoice();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.initVoice();
      }
    }
  }

  private initVoice() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    // Prioritize natural English voices
    const preferred =
      voices.find((v) => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha") || v.name.includes("Daniel"))) ||
      voices.find((v) => v.lang.startsWith("en-US")) ||
      voices.find((v) => v.lang.startsWith("en")) ||
      voices[0];
    this.selectedVoice = preferred || null;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.synth) {
      this.synth.cancel();
    }
  }

  public speak(
    text: string,
    options?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    }
  ): Promise<void> {
    return new Promise((resolve) => {
      if (this.isMuted || !this.synth || !text) {
        options?.onEnd?.();
        resolve();
        return;
      }

      this.synth.cancel();

      // Clean up markdown markers or code blocks for speech
      const cleaned = text
        .replace(/```[\s\S]*?```/g, "Code block provided in editor.")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/#+\s+/g, "")
        .replace(/O\(([^)]+)\)/g, "Big O of $1")
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleaned);
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        options?.onStart?.();
      };

      utterance.onend = () => {
        options?.onEnd?.();
        resolve();
      };

      utterance.onerror = (e) => {
        options?.onError?.(e);
        options?.onEnd?.();
        resolve();
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    });
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  public isSpeaking(): boolean {
    return !!this.synth?.speaking;
  }
}

export class CandidateAudioTracker {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private animationFrameId: number | null = null;

  // Telemetry metrics
  private volumeReadings: number[] = [];
  private speechSegments: number = 0;
  private silenceSegments: number = 0;
  private totalSpeakingFrames: number = 0;
  private totalSilenceFrames: number = 0;
  private hesitationEvents: number = 0;
  private sessionStartTime: number = Date.now();
  private wasSpeaking: boolean = false;

  // Speech Recognition (Candidate thoughts)
  private recognition: any = null;
  private transcriptLines: string[] = [];
  private fillerWordsFound: string[] = [];
  private isListening: boolean = false;

  // Callbacks
  public onVolumeUpdate?: (volumePct: number) => void;
  public onTranscriptUpdate?: (latestText: string, fullTranscript: string) => void;

  public async startTracking(mediaStream: MediaStream): Promise<boolean> {
    try {
      this.stream = mediaStream;
      this.sessionStartTime = Date.now();

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return false;

      this.audioContext = new AudioCtx();
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.6;

      this.microphone = this.audioContext.createMediaStreamSource(mediaStream);
      this.microphone.connect(this.analyser);

      this.monitorLoop();
      this.initSpeechRecognition();

      return true;
    } catch (err) {
      console.warn("CandidateAudioTracker error initializing:", err);
      return false;
    }
  }

  private monitorLoop = () => {
    if (!this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i]!;
    }
    const average = sum / dataArray.length;
    // Scale to percentage (0 - 100)
    const volumePct = Math.min(100, Math.round((average / 128) * 100));

    this.volumeReadings.push(volumePct);
    if (this.volumeReadings.length > 500) {
      this.volumeReadings.shift();
    }

    // Active speech detection threshold
    const isSpeakingNow = volumePct > 12;
    if (isSpeakingNow) {
      this.totalSpeakingFrames++;
      if (!this.wasSpeaking) {
        this.speechSegments++;
      }
      this.wasSpeaking = true;
    } else {
      this.totalSilenceFrames++;
      if (this.wasSpeaking) {
        this.silenceSegments++;
        // If pause is quick after speech, could be a hesitation
        this.hesitationEvents++;
      }
      this.wasSpeaking = false;
    }

    this.onVolumeUpdate?.(volumePct);
    this.animationFrameId = requestAnimationFrame(this.monitorLoop);
  };

  private initSpeechRecognition() {
    if (typeof window === "undefined") return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = "en-US";

      this.recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        if (final) {
          this.transcriptLines.push(final.trim());
          this.auditFillerWords(final);
          const fullText = this.transcriptLines.join(" ");
          this.onTranscriptUpdate?.(final, fullText);
        } else if (interim) {
          const fullText = [...this.transcriptLines, interim].join(" ");
          this.onTranscriptUpdate?.(interim, fullText);
        }
      };

      this.recognition.onerror = (e: any) => {
        // Ignored or continuous retry
      };

      this.recognition.onend = () => {
        if (this.isListening) {
          try {
            this.recognition.start();
          } catch {
            // Ignored
          }
        }
      };

      this.isListening = true;
      this.recognition.start();
    } catch {
      // Speech recognition not available or denied
    }
  }

  private auditFillerWords(text: string) {
    const fillerPatterns = ["um", "uh", "uhm", "like", "you know", "basically", "literally", "actually", "sort of", "kind of"];
    const lower = text.toLowerCase();
    for (const f of fillerPatterns) {
      const regex = new RegExp(`\\b${f}\\b`, "g");
      const matches = lower.match(regex);
      if (matches) {
        for (let i = 0; i < matches.length; i++) {
          this.fillerWordsFound.push(f);
        }
      }
    }
  }

  public getLiveTranscript(): string {
    return this.transcriptLines.join(" ");
  }

  public calculateReport(): ConfidenceReport {
    const totalFrames = Math.max(1, this.totalSpeakingFrames + this.totalSilenceFrames);
    const spokenRatio = this.totalSpeakingFrames / totalFrames;
    const totalSeconds = Math.max(1, Math.round((Date.now() - this.sessionStartTime) / 1000));
    const spokenSeconds = Math.round(totalSeconds * spokenRatio);

    const fullTranscript = this.transcriptLines.join(" ");
    const words = fullTranscript.split(/\s+/).filter((w) => w.length > 0);
    const wordCount = words.length;
    const minutes = Math.max(0.2, totalSeconds / 60);
    const wpm = Math.round(wordCount / minutes);

    // 1. Vocal steadiness score (variance of active volume)
    const activeVols = this.volumeReadings.filter((v) => v > 10);
    let steadiness = 8.5;
    if (activeVols.length > 20) {
      const avg = activeVols.reduce((a, b) => a + b, 0) / activeVols.length;
      const variance = activeVols.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / activeVols.length;
      const stdDev = Math.sqrt(variance);
      // If stdDev is between 8 and 22, it's natural speech. If too high, volatile; if too low, robotic.
      if (stdDev >= 8 && stdDev <= 22) {
        steadiness = 9.0;
      } else if (stdDev > 30) {
        steadiness = 7.0;
      } else {
        steadiness = 8.0;
      }
    }

    // 2. Fluency & pacing score
    let fluency = 8.5;
    if (wordCount > 15) {
      // Natural interview verbal cadence is 80 - 150 WPM
      if (wpm >= 90 && wpm <= 145) {
        fluency = 9.2;
      } else if (wpm < 50) {
        fluency = 7.5; // Very hesitant
      } else if (wpm > 175) {
        fluency = 8.0; // Rushed
      }
    }

    // 3. Articulation score based on filler words
    let articulation = 9.0;
    const fillerDensity = wordCount > 0 ? (this.fillerWordsFound.length / wordCount) : 0;
    if (fillerDensity > 0.12) {
      articulation = 6.8;
    } else if (fillerDensity > 0.06) {
      articulation = 7.8;
    } else if (fillerDensity > 0.02) {
      articulation = 8.5;
    } else {
      articulation = 9.4;
    }

    // Overall Confidence weighted formula
    const overall = Math.round(((steadiness * 0.35 + fluency * 0.35 + articulation * 0.30) * 10)) / 10;

    let feedbackSummary = "Excellent, composed presentation. Steady vocal tone and articulate thought explanation throughout the solution tiers.";
    if (overall < 7.5) {
      feedbackSummary = "Good effort. Try to reduce filler pauses ('um', 'like') and verbalize your invariant steps with steady pacing.";
    } else if (overall < 8.8) {
      feedbackSummary = "Strong communication. Articulated edge cases and logic progression clearly with solid executive presence.";
    }

    return {
      overallConfidenceScore: Math.min(10, Math.max(1, overall)),
      vocalSteadinessScore: Math.round(steadiness * 10) / 10,
      fluencyScore: Math.round(fluency * 10) / 10,
      articulationScore: Math.round(articulation * 10) / 10,
      totalSpokenSeconds: spokenSeconds,
      totalWordsSpoken: wordCount,
      wordsPerMinute: wpm,
      fillerWordCount: this.fillerWordsFound.length,
      fillerWordsDetected: Array.from(new Set(this.fillerWordsFound)),
      hesitationPauses: this.hesitationEvents,
      feedbackSummary,
    };
  }

  public stopTracking() {
    this.isListening = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignored
      }
    }
    if (this.audioContext && this.audioContext.state !== "closed") {
      try {
        this.audioContext.close();
      } catch {
        // Ignored
      }
    }
  }
}
