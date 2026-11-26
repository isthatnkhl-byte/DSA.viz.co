import { useCallback, useEffect, useRef, useState } from "react";
import {
  CandidateAudioTracker,
  type SpeechRecognitionStatus,
} from "@/lib/interview-audio";

export interface DictationTranscriptCallback {
  (targetId: string, chunk: string): void;
}

interface TargetInterimState {
  targetId: string | null;
  interim: string;
}

/**
 * Target-owned voice dictation controller shared between Master Patterns fields
 * (e.g. "verbal" reasoning textarea and "side:<segmentId>" helper composer).
 *
 * Isolates ~60ms RMS meter emissions behind a ref-backed listener subscription so
 * host editors (including Monaco) do not re-render on audio animation frames.
 */
export function usePatternDictation(
  onAppendFinalText: DictationTranscriptCallback,
) {
  const [activeTarget, setActiveTarget] = useState<string | null>(null);
  const [status, setStatus] = useState<SpeechRecognitionStatus>("paused");
  const [error, setError] = useState<string | null>(null);
  const [interimState, setInterimState] = useState<TargetInterimState>({
    targetId: null,
    interim: "",
  });

  const trackerRef = useRef<CandidateAudioTracker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const activeTargetRef = useRef<string | null>(null);
  const onAppendRef = useRef(onAppendFinalText);
  const volumeListenersRef = useRef<Set<(vol: number) => void>>(new Set());
  const currentVolumeRef = useRef(0);
  const lastEmitAtRef = useRef(0);

  onAppendRef.current = onAppendFinalText;

  const notifyVolume = useCallback((vol: number, force = false) => {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (!force && now - lastEmitAtRef.current < 60) return;
    lastEmitAtRef.current = now;
    currentVolumeRef.current = vol;
    volumeListenersRef.current.forEach((fn) => fn(vol));
  }, []);

  const subscribeVolume = useCallback((listener: (vol: number) => void) => {
    volumeListenersRef.current.add(listener);
    listener(currentVolumeRef.current);
    return () => {
      volumeListenersRef.current.delete(listener);
    };
  }, []);

  const stopResourcesOnly = useCallback(() => {
    if (trackerRef.current) {
      try {
        trackerRef.current.stopTracking();
      } catch {
        // Ignore teardown noise
      }
      trackerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore track stop errors
        }
      });
      streamRef.current = null;
    }
    activeTargetRef.current = null;
    setActiveTarget(null);
    setInterimState({ targetId: null, interim: "" });
    setStatus("paused");
    notifyVolume(0, true);
  }, [notifyVolume]);

  const flushAndStop = useCallback(
    (expectedTargetId?: string): string => {
      const currentTarget = activeTargetRef.current;
      if (!currentTarget) return "";
      if (expectedTargetId && currentTarget !== expectedTargetId) return "";

      let flushed = "";
      if (trackerRef.current) {
        try {
          flushed = trackerRef.current.flushInterimAsFinal().trim();
        } catch {
          flushed = "";
        }
      }
      // Also capture anything still in React interim if SpeechRecognition already emitted final
      if (flushed) {
        onAppendRef.current(currentTarget, flushed);
      }
      stopResourcesOnly();
      return flushed;
    },
    [stopResourcesOnly],
  );

  const startTarget = useCallback(
    async (targetId: string) => {
      setError(null);
      if (activeTargetRef.current && activeTargetRef.current !== targetId) {
        flushAndStop();
      } else if (activeTargetRef.current === targetId) {
        flushAndStop();
        return;
      }

      if (
        typeof window === "undefined" ||
        !navigator?.mediaDevices?.getUserMedia
      ) {
        setStatus("unsupported");
        setError("Microphone API is unavailable in this browser.");
        return;
      }

      const SpeechRec =
        (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
          .SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: unknown })
          .webkitSpeechRecognition;
      if (!SpeechRec) {
        setStatus("unsupported");
        setError("Speech dictation requires Chrome or Edge Web Speech API.");
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        setStatus("error");
        setError(
          (err as Error)?.message || "Microphone access was denied or blocked.",
        );
        return;
      }

      const tracker = new CandidateAudioTracker();
      tracker.onVolumeUpdate = (vol) => {
        notifyVolume(vol);
      };
      tracker.onInterimUpdate = (interim) => {
        if (activeTargetRef.current === targetId) {
          setInterimState({ targetId, interim });
        }
      };
      tracker.onFinalSegment = (segment) => {
        const cleaned = segment.trim();
        if (cleaned && activeTargetRef.current === targetId) {
          onAppendRef.current(targetId, cleaned);
          setInterimState({ targetId, interim: "" });
        }
      };
      tracker.onRecognitionStatusChange = (nextStatus, msg) => {
        setStatus(nextStatus);
        if (nextStatus === "error" || nextStatus === "unsupported") {
          setError(msg || "Dictation error.");
        }
      };

      streamRef.current = stream;
      trackerRef.current = tracker;
      activeTargetRef.current = targetId;
      setActiveTarget(targetId);
      setInterimState({ targetId, interim: "" });

      const started = await tracker.startTracking(stream);
      if (!started) {
        setStatus("error");
        setError("Could not initialize audio meter.");
        stopResourcesOnly();
      } else {
        setStatus("listening");
      }
    },
    [flushAndStop, notifyVolume, stopResourcesOnly],
  );

  const toggleTarget = useCallback(
    async (targetId: string) => {
      if (activeTargetRef.current === targetId) {
        flushAndStop(targetId);
      } else {
        await startTarget(targetId);
      }
    },
    [flushAndStop, startTarget],
  );

  useEffect(() => {
    return () => {
      stopResourcesOnly();
    };
  }, [stopResourcesOnly]);

  return {
    activeTarget,
    status,
    error,
    interimFor: (targetId: string) =>
      interimState.targetId === targetId ? interimState.interim : "",
    toggleTarget,
    flushAndStop,
    subscribeVolume,
  };
}
