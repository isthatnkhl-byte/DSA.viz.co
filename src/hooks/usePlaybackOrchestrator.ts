import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { VizStep } from "@/types";

export interface PlaybackOrchestratorOptions {
  steps: VizStep[];
  breakpoints?: Set<number>;
  initialSpeed?: number;
  initialLooping?: boolean;
  initialStepIndex?: number;
  baseStepDurationMs?: number;
  onStepChange?: (stepIndex: number) => void;
}

export interface PlaybackOrchestratorState {
  activeStepIndex: number;
  currentStep: number; // ergonomic alias
  totalSteps: number;
  isPlaying: boolean;
  isLooping: boolean;
  isScrubbing: boolean;
  speed: number;
  progressFraction: number;
  progressPct: number;
  currentVizStep: VizStep | null;
  breakpointStepIndices: number[];
  
  // Actions
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  toggleLoop: () => void;
  setSpeed: (speed: number) => void;
  setActiveStepIndex: (index: number) => void;
  jumpToStep: (index: number) => void;
  jumpRelative: (delta: number) => void;
  jumpToFirst: () => void;
  jumpToLast: () => void;
  jumpToLine: (lineIndex: number) => void;
  jumpToNextBreakpoint: () => void;
  jumpToPrevBreakpoint: () => void;
  startScrubbing: () => void;
  scrubTo: (stepIndex: number) => void;
  commitScrub: (finalStepIndex?: number) => void;
  reset: () => void;
}

export function usePlaybackOrchestrator({
  steps,
  breakpoints = new Set<number>(),
  initialSpeed = 1,
  initialLooping = false,
  initialStepIndex = 0,
  baseStepDurationMs = 850,
  onStepChange,
}: PlaybackOrchestratorOptions): PlaybackOrchestratorState {
  const safeSteps = useMemo(() => (Array.isArray(steps) ? steps : []), [steps]);
  const totalSteps = safeSteps.length;

  const [activeStepIndex, setActiveStepIndexInternal] = useState<number>(() =>
    Math.max(0, Math.min(totalSteps > 0 ? totalSteps - 1 : 0, initialStepIndex)),
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(initialLooping);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(initialSpeed);

  // References for high-precision 60 FPS requestAnimationFrame delta loop
  const lastTimeRef = useRef<number | null>(null);
  const accumulatorRef = useRef<number>(0);
  const wasPlayingBeforeScrubRef = useRef<boolean>(false);
  const activeStepIndexRef = useRef<number>(activeStepIndex);
  activeStepIndexRef.current = activeStepIndex;

  // Keep active step clamped within valid boundaries whenever steps array changes
  useEffect(() => {
    setActiveStepIndexInternal((prev) => {
      if (totalSteps === 0) return 0;
      const clamped = Math.max(0, Math.min(totalSteps - 1, prev));
      return clamped;
    });
  }, [totalSteps]);

  const setActiveStepIndex = useCallback(
    (index: number) => {
      if (totalSteps === 0) {
        setActiveStepIndexInternal(0);
        return;
      }
      const clamped = Math.max(0, Math.min(totalSteps - 1, index));
      setActiveStepIndexInternal(clamped);
      onStepChange?.(clamped);
    },
    [totalSteps, onStepChange],
  );

  // Compute step indices that coincide with active breakpoints
  const breakpointStepIndices = useMemo(() => {
    if (breakpoints.size === 0 || totalSteps === 0) return [];
    const indices: number[] = [];
    safeSteps.forEach((s, idx) => {
      if (s?.line !== undefined && breakpoints.has(s.line)) {
        indices.push(idx);
      }
    });
    return indices;
  }, [safeSteps, breakpoints, totalSteps]);

  // High-precision 60 FPS Animation Frame Loop
  useEffect(() => {
    if (!isPlaying || isScrubbing || totalSteps <= 1) {
      lastTimeRef.current = null;
      accumulatorRef.current = 0;
      return;
    }

    let animationFrameId: number;
    const stepDurationMs = Math.max(60, Math.round(baseStepDurationMs / speed));

    const updateLoop = (now: number) => {
      if (lastTimeRef.current !== null) {
        const delta = now - lastTimeRef.current;
        // Cap excessive delta (e.g. tab backgrounding) to 2 steps max
        const cappedDelta = Math.min(delta, stepDurationMs * 2);
        accumulatorRef.current += cappedDelta;

        if (accumulatorRef.current >= stepDurationMs) {
          const stepsToAdvance = Math.floor(accumulatorRef.current / stepDurationMs);
          accumulatorRef.current = accumulatorRef.current % stepDurationMs;

          const currentIdx = activeStepIndexRef.current;
          let targetIdx = currentIdx + stepsToAdvance;

          // Check if any intermediate step hits an active breakpoint
          let hitBreakpoint = false;
          let breakpointHitIndex = -1;

          for (let s = currentIdx + 1; s <= targetIdx && s < totalSteps; s++) {
            const stepObj = safeSteps[s];
            if (stepObj?.line !== undefined && breakpoints.has(stepObj.line)) {
              hitBreakpoint = true;
              breakpointHitIndex = s;
              break;
            }
          }

          if (hitBreakpoint) {
            setActiveStepIndexInternal(breakpointHitIndex);
            onStepChange?.(breakpointHitIndex);
            setIsPlaying(false);
            return;
          }

          if (targetIdx >= totalSteps) {
            if (isLooping) {
              const loopedIdx = 0;
              setActiveStepIndexInternal(loopedIdx);
              onStepChange?.(loopedIdx);
            } else {
              const lastIdx = totalSteps - 1;
              setActiveStepIndexInternal(lastIdx);
              onStepChange?.(lastIdx);
              setIsPlaying(false);
              return;
            }
          } else {
            setActiveStepIndexInternal(targetIdx);
            onStepChange?.(targetIdx);
          }
        }
      }

      lastTimeRef.current = now;
      animationFrameId = requestAnimationFrame(updateLoop);
    };

    animationFrameId = requestAnimationFrame(updateLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      lastTimeRef.current = null;
    };
  }, [
    isPlaying,
    isScrubbing,
    totalSteps,
    speed,
    baseStepDurationMs,
    isLooping,
    breakpoints,
    safeSteps,
    onStepChange,
  ]);

  // Controls
  const play = useCallback(() => {
    if (totalSteps <= 1) return;
    if (activeStepIndex >= totalSteps - 1) {
      setActiveStepIndex(0);
    }
    setIsPlaying(true);
  }, [totalSteps, activeStepIndex, setActiveStepIndex]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const toggleLoop = useCallback(() => {
    setIsLooping((prev) => !prev);
  }, []);

  const jumpToStep = useCallback(
    (index: number) => {
      setActiveStepIndex(index);
    },
    [setActiveStepIndex],
  );

  const jumpRelative = useCallback(
    (delta: number) => {
      setActiveStepIndex(activeStepIndexRef.current + delta);
    },
    [setActiveStepIndex],
  );

  const jumpToFirst = useCallback(() => {
    setActiveStepIndex(0);
  }, [setActiveStepIndex]);

  const jumpToLast = useCallback(() => {
    if (totalSteps > 0) {
      setActiveStepIndex(totalSteps - 1);
    }
  }, [totalSteps, setActiveStepIndex]);

  const jumpToLine = useCallback(
    (lineIndex: number) => {
      if (totalSteps === 0) return;
      const currentIdx = activeStepIndexRef.current;
      // Look forward first
      for (let i = currentIdx + 1; i < totalSteps; i++) {
        if (safeSteps[i]?.line === lineIndex) {
          setActiveStepIndex(i);
          return;
        }
      }
      // Wrap around from beginning
      for (let i = 0; i <= currentIdx; i++) {
        if (safeSteps[i]?.line === lineIndex) {
          setActiveStepIndex(i);
          return;
        }
      }
    },
    [totalSteps, safeSteps, setActiveStepIndex],
  );

  const jumpToNextBreakpoint = useCallback(() => {
    if (totalSteps === 0 || breakpoints.size === 0) return;
    const currentIdx = activeStepIndexRef.current;
    // Search forward
    for (let i = currentIdx + 1; i < totalSteps; i++) {
      const stepObj = safeSteps[i];
      if (stepObj?.line !== undefined && breakpoints.has(stepObj.line)) {
        setActiveStepIndex(i);
        return;
      }
    }
    // Wrap around search
    for (let i = 0; i <= currentIdx; i++) {
      const stepObj = safeSteps[i];
      if (stepObj?.line !== undefined && breakpoints.has(stepObj.line)) {
        setActiveStepIndex(i);
        return;
      }
    }
  }, [totalSteps, breakpoints, safeSteps, setActiveStepIndex]);

  const jumpToPrevBreakpoint = useCallback(() => {
    if (totalSteps === 0 || breakpoints.size === 0) return;
    const currentIdx = activeStepIndexRef.current;
    // Search backward
    for (let i = currentIdx - 1; i >= 0; i--) {
      const stepObj = safeSteps[i];
      if (stepObj?.line !== undefined && breakpoints.has(stepObj.line)) {
        setActiveStepIndex(i);
        return;
      }
    }
    // Wrap around from end
    for (let i = totalSteps - 1; i >= currentIdx; i--) {
      const stepObj = safeSteps[i];
      if (stepObj?.line !== undefined && breakpoints.has(stepObj.line)) {
        setActiveStepIndex(i);
        return;
      }
    }
  }, [totalSteps, breakpoints, safeSteps, setActiveStepIndex]);

  // Progress Bar Scrubbing Handlers
  const startScrubbing = useCallback(() => {
    if (isPlaying) {
      wasPlayingBeforeScrubRef.current = true;
      setIsPlaying(false);
    } else {
      wasPlayingBeforeScrubRef.current = false;
    }
    setIsScrubbing(true);
  }, [isPlaying]);

  const scrubTo = useCallback(
    (stepIndex: number) => {
      setActiveStepIndex(stepIndex);
    },
    [setActiveStepIndex],
  );

  const commitScrub = useCallback(
    (finalStepIndex?: number) => {
      if (typeof finalStepIndex === "number") {
        setActiveStepIndex(finalStepIndex);
      }
      setIsScrubbing(false);
      if (wasPlayingBeforeScrubRef.current) {
        setIsPlaying(true);
        wasPlayingBeforeScrubRef.current = false;
      }
    },
    [setActiveStepIndex],
  );

  const reset = useCallback(() => {
    setIsPlaying(false);
    setActiveStepIndex(0);
    accumulatorRef.current = 0;
    lastTimeRef.current = null;
  }, [setActiveStepIndex]);

  const progressFraction = totalSteps > 1 ? activeStepIndex / (totalSteps - 1) : 1;
  const progressPct = Math.round(progressFraction * 100);
  const currentVizStep = safeSteps[activeStepIndex] ?? null;

  return {
    activeStepIndex,
    currentStep: activeStepIndex,
    totalSteps,
    isPlaying,
    isLooping,
    isScrubbing,
    speed,
    progressFraction,
    progressPct,
    currentVizStep,
    breakpointStepIndices,
    play,
    pause,
    togglePlay,
    toggleLoop,
    setSpeed,
    setActiveStepIndex,
    jumpToStep,
    jumpRelative,
    jumpToFirst,
    jumpToLast,
    jumpToLine,
    jumpToNextBreakpoint,
    jumpToPrevBreakpoint,
    startScrubbing,
    scrubTo,
    commitScrub,
    reset,
  };
}

export default usePlaybackOrchestrator;
