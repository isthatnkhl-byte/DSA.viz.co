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
  private isInterrupted: boolean = false;
  private rate: number = 0.95; // Steady, calm interview pacing
  private pitch: number = 1.0;
  private interSentencePauseMs: number = 200; // Natural breathing pause

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
    if (!voices || voices.length === 0) return;

    // Prioritize natural neural English voices
    const preferred =
      voices.find((v) => v.lang.startsWith("en") && (v.name.includes("Google US English") || v.name.includes("Google") || v.name.includes("Natural"))) ||
      voices.find((v) => v.lang.startsWith("en") && (v.name.includes("Jenny") || v.name.includes("Guy") || v.name.includes("Aria"))) ||
      voices.find((v) => v.lang.startsWith("en") && (v.name.includes("Samantha") || v.name.includes("Daniel"))) ||
      voices.find((v) => v.lang.startsWith("en-US")) ||
      voices.find((v) => v.lang.startsWith("en")) ||
      voices[0];
    this.selectedVoice = preferred || null;
  }

  public getAvailableVoices(): { name: string; lang: string; uri: string; isNeural: boolean }[] {
    if (!this.synth) return [];
    const voices = this.synth.getVoices();
    return voices
      .filter((v) => v.lang.startsWith("en"))
      .map((v) => ({
        name: v.name,
        lang: v.lang,
        uri: v.voiceURI,
        isNeural: v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Online"),
      }));
  }

  public setVoiceByURI(uri: string) {
    if (!this.synth) return;
    const voice = this.synth.getVoices().find((v) => v.voiceURI === uri);
    if (voice) {
      this.selectedVoice = voice;
    }
  }

  public setPacing(rate: number, pitch: number = 1.0) {
    this.rate = Math.max(0.7, Math.min(1.3, rate));
    this.pitch = Math.max(0.8, Math.min(1.2, pitch));
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.synth) {
      this.isInterrupted = true;
      this.synth.cancel();
    }
  }

  public async speak(
    text: string,
    options?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    }
  ): Promise<void> {
    if (this.isMuted || !this.synth || !text) {
      options?.onEnd?.();
      return;
    }

    this.stop();
    this.isInterrupted = false;

    // Clean up markdown markers or code blocks for humanlike speech
    const cleaned = text
      .replace(/```[\s\S]*?```/g, "Code block provided in editor.")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/#+\s+/g, "")
      .replace(/O\(([^)]+)\)/g, "Big O of $1")
      .trim();

    if (!cleaned) {
      options?.onEnd?.();
      return;
    }

    // Natural sentence chunking (split by sentences for humanlike breathing pauses)
    const sentences = cleaned
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    options?.onStart?.();

    for (let i = 0; i < sentences.length; i++) {
      if (this.isInterrupted || this.isMuted) break;
      const sentence = sentences[i]!;

      await new Promise<void>((resolve) => {
        if (!this.synth || this.isInterrupted || this.isMuted) {
          resolve();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(sentence);
        if (this.selectedVoice) {
          utterance.voice = this.selectedVoice;
        }
        utterance.rate = this.rate; // 0.95
        utterance.pitch = this.pitch; // 1.0

        utterance.onend = () => {
          resolve();
        };

        utterance.onerror = (e) => {
          options?.onError?.(e);
          resolve();
        };

        this.currentUtterance = utterance;
        this.synth.speak(utterance);
      });

      // Insert subtle natural inter-sentence pause if there are remaining sentences
      if (i < sentences.length - 1 && !this.isInterrupted && !this.isMuted) {
        await new Promise((r) => setTimeout(r, this.interSentencePauseMs));
      }
    }

    this.currentUtterance = null;
    options?.onEnd?.();
  }

  public stop() {
    this.isInterrupted = true;
    if (this.synth) {
      this.synth.cancel();
    }
  }

  public isSpeaking(): boolean {
    return !!this.synth?.speaking;
  }
}

export type SpeechRecognitionStatus = "listening" | "paused" | "unsupported" | "error";

export async function listMediaDevices(): Promise<{
  microphones: MediaDeviceInfo[];
  cameras: MediaDeviceInfo[];
}> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
    return { microphones: [], cameras: [] };
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return {
      microphones: devices.filter((d) => d.kind === "audioinput"),
      cameras: devices.filter((d) => d.kind === "videoinput"),
    };
  } catch {
    return { microphones: [], cameras: [] };
  }
}

export class CandidateAudioTracker {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private animationFrameId: number | null = null;

  // High Quality Audio Retention
  private mediaRecorder: MediaRecorder | null = null;
  private recordedAudioChunks: Blob[] = [];
  private sessionAudioBlob: Blob | null = null;
  private sessionAudioUrl: string | null = null;

  // Telemetry metrics
  private volumeReadings: number[] = [];
  private speechSegments: number = 0;
  private silenceSegments: number = 0;
  private totalSpeakingFrames: number = 0;
  private totalSilenceFrames: number = 0;
  private hesitationEvents: number = 0;
  private sessionStartTime: number = Date.now();
  private wasSpeaking: boolean = false;

  // Throttling for UI volume meter (prevents 60fps React re-render storms)
  private lastEmittedVolume: number = 0;
  private lastVolumeEmitTime: number = 0;

  // Speech Recognition (Candidate thoughts)
  private recognition: any = null;
  private transcriptLines: string[] = [];
  private currentInterimText: string = "";
  private fillerWordsFound: string[] = [];
  private isListening: boolean = false;
  private isMicMuted: boolean = false;
  private isTtsSpeaking: boolean = false;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private recognitionStatus: SpeechRecognitionStatus = "paused";

  // Callbacks
  public onVolumeUpdate?: (volumePct: number) => void;
  public onTranscriptUpdate?: (latestText: string, fullTranscript: string, isFinal?: boolean) => void;
  public onInterimUpdate?: (interimText: string) => void;
  public onFinalSegment?: (finalSegment: string, fullTranscript: string) => void;
  public onRecognitionStatusChange?: (status: SpeechRecognitionStatus, message?: string) => void;

  public async startTracking(mediaStream: MediaStream): Promise<boolean> {
    try {
      this.stopTracking();
      this.stream = mediaStream;
      this.sessionStartTime = Date.now();
      this.recordedAudioChunks = [];
      this.sessionAudioBlob = null;
      this.sessionAudioUrl = null;
      this.currentInterimText = "";

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return false;

      this.audioContext = new AudioCtx();
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.65;

      this.microphone = this.audioContext.createMediaStreamSource(mediaStream);
      this.microphone.connect(this.analyser);

      this.monitorLoop();
      this.initSpeechRecognition();
      this.initMediaRecorder(mediaStream);

      return true;
    } catch (err) {
      console.warn("CandidateAudioTracker error initializing:", err);
      return false;
    }
  }

  public setMicMuted(muted: boolean) {
    this.isMicMuted = muted;
    if (this.stream) {
      this.stream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
    if (muted) {
      this.currentInterimText = "";
      this.onInterimUpdate?.("");
      this.onVolumeUpdate?.(0);
      this.updateRecognitionStatus("paused", "Microphone muted");
      if (this.recognition) {
        try {
          this.recognition.abort();
        } catch {
          // ignore
        }
      }
    } else if (this.isListening && !this.isTtsSpeaking) {
      this.safeStartRecognition();
    }
  }

  public getMicMuted(): boolean {
    return this.isMicMuted;
  }

  /**
   * Suppresses speech recognition while the AI Interviewer TTS is speaking aloud
   * so the microphone does not transcribe the interviewer's own voice.
   */
  public setTtsSpeaking(speaking: boolean) {
    if (this.isTtsSpeaking === speaking) return;
    this.isTtsSpeaking = speaking;

    if (speaking) {
      this.currentInterimText = "";
      this.onInterimUpdate?.("");
      if (this.recognition) {
        try {
          this.recognition.abort();
        } catch {
          // ignore
        }
      }
    } else if (this.isListening && !this.isMicMuted) {
      this.safeStartRecognition();
    }
  }

  /**
   * If the user clicks "Send Spoken Thought" before SpeechRecognition marks the current
   * phrase as final, flush the pending interim phrase as a final segment immediately.
   */
  public flushInterimAsFinal(): string {
    const pending = this.currentInterimText.trim();
    if (!pending) return "";
    this.currentInterimText = "";
    this.onInterimUpdate?.("");
    this.transcriptLines.push(pending);
    this.auditFillerWords(pending);
    const fullText = this.transcriptLines.join(" ");
    this.onFinalSegment?.(pending, fullText);
    this.onTranscriptUpdate?.(pending, fullText, true);
    return pending;
  }

  private updateRecognitionStatus(status: SpeechRecognitionStatus, message?: string) {
    this.recognitionStatus = status;
    this.onRecognitionStatusChange?.(status, message);
  }

  private safeStartRecognition() {
    if (!this.recognition || !this.isListening || this.isMicMuted || this.isTtsSpeaking) return;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    this.restartTimer = setTimeout(() => {
      if (!this.recognition || !this.isListening || this.isMicMuted || this.isTtsSpeaking) return;
      try {
        this.recognition.start();
        this.updateRecognitionStatus("listening");
      } catch {
        // Already started or transitioning
      }
    }, 180);
  }

  private initMediaRecorder(stream: MediaStream) {
    if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return;

    try {
      // Pick best supported audio mime type
      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ];
      const selectedMime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || "";

      const options: MediaRecorderOptions = {
        audioBitsPerSecond: 128000, // High quality 128kbps Opus
      };
      if (selectedMime) {
        options.mimeType = selectedMime;
      }

      this.mediaRecorder = new MediaRecorder(stream, options);
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedAudioChunks.push(event.data);
        }
      };

      // Collect audio every 1000ms
      this.mediaRecorder.start(1000);
    } catch (e) {
      console.warn("MediaRecorder could not be initialized:", e);
    }
  }

  private monitorLoop = () => {
    if (!this.analyser) return;

    if (this.isMicMuted) {
      if (this.lastEmittedVolume !== 0) {
        this.lastEmittedVolume = 0;
        this.onVolumeUpdate?.(0);
      }
      this.animationFrameId = requestAnimationFrame(this.monitorLoop);
      return;
    }

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i]!;
    }
    const average = sum / dataArray.length;
    // Scale to percentage (0 - 100)
    const volumePct = Math.min(100, Math.round((average / 110) * 100));

    this.volumeReadings.push(volumePct);
    if (this.volumeReadings.length > 500) {
      this.volumeReadings.shift();
    }

    // Active speech detection threshold (ignore while TTS is speaking)
    const isSpeakingNow = !this.isTtsSpeaking && volumePct > 10;
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
        this.hesitationEvents++;
      }
      this.wasSpeaking = false;
    }

    // Throttle React state callback to ~12fps and only when volume changes meaningfully
    const now = performance.now();
    if (
      now - this.lastVolumeEmitTime >= 80 &&
      (Math.abs(volumePct - this.lastEmittedVolume) >= 2 ||
        (volumePct === 0 && this.lastEmittedVolume !== 0))
    ) {
      this.lastEmittedVolume = volumePct;
      this.lastVolumeEmitTime = now;
      this.onVolumeUpdate?.(volumePct);
    }

    this.animationFrameId = requestAnimationFrame(this.monitorLoop);
  };

  private initSpeechRecognition() {
    if (typeof window === "undefined") return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      this.updateRecognitionStatus(
        "unsupported",
        "Browser SpeechRecognition API not available (use Chrome or Edge for live voice transcription)."
      );
      return;
    }

    try {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      this.recognition.lang = "en-US";

      this.recognition.onstart = () => {
        if (!this.isMicMuted && !this.isTtsSpeaking) {
          this.updateRecognitionStatus("listening");
        }
      };

      this.recognition.onresult = (event: any) => {
        // Ignore mic pickup while muted or while AI interviewer is speaking aloud
        if (this.isMicMuted || this.isTtsSpeaking) return;

        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript + " ";
          } else {
            interim += transcript;
          }
        }

        const cleanedInterim = interim.trim();
        const cleanedFinal = final.trim();

        this.currentInterimText = cleanedInterim;
        this.onInterimUpdate?.(cleanedInterim);

        if (cleanedFinal) {
          this.transcriptLines.push(cleanedFinal);
          this.auditFillerWords(cleanedFinal);
          const fullText = this.transcriptLines.join(" ");
          this.onFinalSegment?.(cleanedFinal, fullText);
          this.onTranscriptUpdate?.(cleanedFinal, fullText, true);
        } else if (cleanedInterim) {
          const fullText = [...this.transcriptLines, cleanedInterim].join(" ");
          this.onTranscriptUpdate?.(cleanedInterim, fullText, false);
        }
      };

      this.recognition.onerror = (event: any) => {
        const errCode = event?.error || "";
        if (errCode === "not-allowed" || errCode === "service-not-allowed") {
          this.updateRecognitionStatus("error", "Microphone speech recognition permission denied.");
          return;
        }
        // "no-speech" and "aborted" are normal during quiet coding intervals; onend will restart
      };

      this.recognition.onend = () => {
        if (this.isListening && !this.isMicMuted && !this.isTtsSpeaking) {
          this.safeStartRecognition();
        }
      };

      this.isListening = true;
      this.safeStartRecognition();
    } catch {
      this.updateRecognitionStatus("error", "Speech recognition could not be initialized.");
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

  public getInterimTranscript(): string {
    return this.currentInterimText;
  }

  public getRecognitionStatus(): SpeechRecognitionStatus {
    return this.recognitionStatus;
  }

  public getRecordedAudioBlob(): Blob | null {
    if (this.sessionAudioBlob) return this.sessionAudioBlob;
    if (this.recordedAudioChunks.length > 0) {
      const type = this.mediaRecorder?.mimeType || "audio/webm";
      this.sessionAudioBlob = new Blob(this.recordedAudioChunks, { type });
      return this.sessionAudioBlob;
    }
    return null;
  }

  public getRecordedAudioUrl(): string | null {
    if (this.sessionAudioUrl) return this.sessionAudioUrl;
    const blob = this.getRecordedAudioBlob();
    if (blob) {
      this.sessionAudioUrl = URL.createObjectURL(blob);
      return this.sessionAudioUrl;
    }
    return null;
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

    // 1. Vocal steadiness score
    const activeVols = this.volumeReadings.filter((v) => v > 10);
    let steadiness = 8.5;
    if (activeVols.length > 20) {
      const avg = activeVols.reduce((a, b) => a + b, 0) / activeVols.length;
      const variance = activeVols.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / activeVols.length;
      const stdDev = Math.sqrt(variance);
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
      if (wpm >= 90 && wpm <= 145) {
        fluency = 9.2;
      } else if (wpm < 50) {
        fluency = 7.5;
      } else if (wpm > 175) {
        fluency = 8.0;
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
    this.currentInterimText = "";
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.recognition) {
      try {
        this.recognition.onend = null;
        this.recognition.stop();
      } catch {
        // Ignored
      }
      this.recognition = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
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

