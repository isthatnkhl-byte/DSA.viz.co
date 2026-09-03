import test from "node:test";
import assert from "node:assert/strict";
import type { VizStep } from "../src/types.ts";

// Helper to simulate the orchestrator logic in a headless deterministic environment
function createMockOrchestrator(
  steps: VizStep[],
  breakpoints: Set<number> = new Set(),
  initialLooping = false,
  initialSpeed = 1,
) {
  let activeStepIndex = 0;
  let isPlaying = false;
  let isLooping = initialLooping;
  let isScrubbing = false;
  let speed = initialSpeed;
  let wasPlayingBeforeScrub = false;

  const totalSteps = steps.length;

  const clamp = (idx: number) => {
    if (totalSteps === 0) return 0;
    return Math.max(0, Math.min(totalSteps - 1, idx));
  };

  const breakpointStepIndices = () => {
    if (breakpoints.size === 0 || totalSteps === 0) return [];
    const indices: number[] = [];
    steps.forEach((s, idx) => {
      if (s?.line !== undefined && breakpoints.has(s.line)) {
        indices.push(idx);
      }
    });
    return indices;
  };

  const jumpToStep = (idx: number) => {
    activeStepIndex = clamp(idx);
  };

  const jumpRelative = (delta: number) => {
    activeStepIndex = clamp(activeStepIndex + delta);
  };

  const jumpToFirst = () => {
    activeStepIndex = 0;
  };

  const jumpToLast = () => {
    activeStepIndex = totalSteps > 0 ? totalSteps - 1 : 0;
  };

  const jumpToLine = (lineIdx: number) => {
    if (totalSteps === 0) return;
    for (let i = activeStepIndex + 1; i < totalSteps; i++) {
      if (steps[i]?.line === lineIdx) {
        activeStepIndex = i;
        return;
      }
    }
    for (let i = 0; i <= activeStepIndex; i++) {
      if (steps[i]?.line === lineIdx) {
        activeStepIndex = i;
        return;
      }
    }
  };

  const jumpToNextBreakpoint = () => {
    if (totalSteps === 0 || breakpoints.size === 0) return;
    for (let i = activeStepIndex + 1; i < totalSteps; i++) {
      const s = steps[i];
      if (s?.line !== undefined && breakpoints.has(s.line)) {
        activeStepIndex = i;
        return;
      }
    }
    for (let i = 0; i <= activeStepIndex; i++) {
      const s = steps[i];
      if (s?.line !== undefined && breakpoints.has(s.line)) {
        activeStepIndex = i;
        return;
      }
    }
  };

  const jumpToPrevBreakpoint = () => {
    if (totalSteps === 0 || breakpoints.size === 0) return;
    for (let i = activeStepIndex - 1; i >= 0; i--) {
      const s = steps[i];
      if (s?.line !== undefined && breakpoints.has(s.line)) {
        activeStepIndex = i;
        return;
      }
    }
    for (let i = totalSteps - 1; i >= activeStepIndex; i--) {
      const s = steps[i];
      if (s?.line !== undefined && breakpoints.has(s.line)) {
        activeStepIndex = i;
        return;
      }
    }
  };

  const startScrubbing = () => {
    wasPlayingBeforeScrub = isPlaying;
    isPlaying = false;
    isScrubbing = true;
  };

  const scrubTo = (stepIdx: number) => {
    activeStepIndex = clamp(stepIdx);
  };

  const commitScrub = (finalStepIdx?: number) => {
    if (typeof finalStepIdx === "number") {
      activeStepIndex = clamp(finalStepIdx);
    }
    isScrubbing = false;
    if (wasPlayingBeforeScrub) {
      isPlaying = true;
      wasPlayingBeforeScrub = false;
    }
  };

  const advanceStep = (stepsToAdvance = 1) => {
    if (totalSteps <= 1) return;
    const target = activeStepIndex + stepsToAdvance;

    for (let s = activeStepIndex + 1; s <= target && s < totalSteps; s++) {
      if (steps[s]?.line !== undefined && breakpoints.has(steps[s].line!)) {
        activeStepIndex = s;
        isPlaying = false;
        return;
      }
    }

    if (target >= totalSteps) {
      if (isLooping) {
        activeStepIndex = 0;
      } else {
        activeStepIndex = totalSteps - 1;
        isPlaying = false;
      }
    } else {
      activeStepIndex = target;
    }
  };

  return {
    get activeStepIndex() {
      return activeStepIndex;
    },
    get isPlaying() {
      return isPlaying;
    },
    set isPlaying(val: boolean) {
      isPlaying = val;
    },
    get isLooping() {
      return isLooping;
    },
    set isLooping(val: boolean) {
      isLooping = val;
    },
    get isScrubbing() {
      return isScrubbing;
    },
    get speed() {
      return speed;
    },
    set speed(val: number) {
      speed = val;
    },
    get progressFraction() {
      return totalSteps > 1 ? activeStepIndex / (totalSteps - 1) : 1;
    },
    get progressPct() {
      return Math.round(this.progressFraction * 100);
    },
    breakpointStepIndices,
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
    advanceStep,
  };
}

test("PlaybackOrchestrator - Step boundary safety and clamping", () => {
  const steps: VizStep[] = [
    { desc: "Step 0", line: 1 },
    { desc: "Step 1", line: 2 },
    { desc: "Step 2", line: 3 },
    { desc: "Step 3", line: 4 },
  ];

  const orch = createMockOrchestrator(steps);

  assert.equal(orch.activeStepIndex, 0);
  assert.equal(orch.progressPct, 0);

  // Relative forward jump
  orch.jumpRelative(2);
  assert.equal(orch.activeStepIndex, 2);

  // Jump beyond upper bound
  orch.jumpRelative(10);
  assert.equal(orch.activeStepIndex, 3);
  assert.equal(orch.progressPct, 100);

  // Jump before lower bound
  orch.jumpRelative(-100);
  assert.equal(orch.activeStepIndex, 0);
  assert.equal(orch.progressPct, 0);

  // Jump to first and last
  orch.jumpToLast();
  assert.equal(orch.activeStepIndex, 3);
  orch.jumpToFirst();
  assert.equal(orch.activeStepIndex, 0);
});

test("PlaybackOrchestrator - Breakpoint detection and halting", () => {
  const steps: VizStep[] = [
    { desc: "Init", line: 1 },
    { desc: "Loop 1", line: 2 },
    { desc: "Check 1", line: 3 },
    { desc: "Loop 2", line: 2 },
    { desc: "Check 2", line: 3 },
    { desc: "Finish", line: 5 },
  ];

  const breakpoints = new Set([3]); // Breakpoint on line 3
  const orch = createMockOrchestrator(steps, breakpoints);

  // Verify breakpoint indices
  assert.deepEqual(orch.breakpointStepIndices(), [2, 4]);

  orch.isPlaying = true;
  assert.equal(orch.isPlaying, true);

  // Advance from step 0 to step 1
  orch.advanceStep(1);
  assert.equal(orch.activeStepIndex, 1);
  assert.equal(orch.isPlaying, true);

  // Advance step: should hit breakpoint at step 2 (line 3) and automatically pause
  orch.advanceStep(1);
  assert.equal(orch.activeStepIndex, 2);
  assert.equal(orch.isPlaying, false);

  // Jump to next breakpoint
  orch.jumpToNextBreakpoint();
  assert.equal(orch.activeStepIndex, 4);

  // Wrap around to next breakpoint
  orch.jumpToNextBreakpoint();
  assert.equal(orch.activeStepIndex, 2);

  // Previous breakpoint
  orch.jumpToPrevBreakpoint();
  assert.equal(orch.activeStepIndex, 4);
});

test("PlaybackOrchestrator - Progress bar scrubbing lifecycle", () => {
  const steps: VizStep[] = [
    { desc: "Step 0" },
    { desc: "Step 1" },
    { desc: "Step 2" },
    { desc: "Step 3" },
    { desc: "Step 4" },
  ];

  const orch = createMockOrchestrator(steps);
  orch.isPlaying = true;

  // Start scrubbing while playing: must pause and enter scrubbing mode
  orch.startScrubbing();
  assert.equal(orch.isScrubbing, true);
  assert.equal(orch.isPlaying, false);

  // Live scrub
  orch.scrubTo(3);
  assert.equal(orch.activeStepIndex, 3);
  assert.equal(orch.progressPct, 75);

  // Commit scrubbing: must restore playing state
  orch.commitScrub();
  assert.equal(orch.isScrubbing, false);
  assert.equal(orch.isPlaying, true);
  assert.equal(orch.activeStepIndex, 3);
});

test("PlaybackOrchestrator - Looping rollover vs Non-looping stop", () => {
  const steps: VizStep[] = [{ desc: "Step 0" }, { desc: "Step 1" }, { desc: "Step 2" }];

  // Non-looping
  const orchNonLoop = createMockOrchestrator(steps, new Set(), false);
  orchNonLoop.isPlaying = true;
  orchNonLoop.jumpToStep(2);
  orchNonLoop.advanceStep(1);
  assert.equal(orchNonLoop.activeStepIndex, 2);
  assert.equal(orchNonLoop.isPlaying, false);

  // Looping
  const orchLoop = createMockOrchestrator(steps, new Set(), true);
  orchLoop.isPlaying = true;
  orchLoop.jumpToStep(2);
  orchLoop.advanceStep(1);
  assert.equal(orchLoop.activeStepIndex, 0);
  assert.equal(orchLoop.isPlaying, true);
});

test("PlaybackOrchestrator - Jump to specific line with wrap-around", () => {
  const steps: VizStep[] = [
    { desc: "Line 10", line: 10 },
    { desc: "Line 20", line: 20 },
    { desc: "Line 30", line: 30 },
    { desc: "Line 20 again", line: 20 },
  ];

  const orch = createMockOrchestrator(steps);
  assert.equal(orch.activeStepIndex, 0);

  // Search forward for line 20
  orch.jumpToLine(20);
  assert.equal(orch.activeStepIndex, 1);

  // Search forward again for line 20
  orch.jumpToLine(20);
  assert.equal(orch.activeStepIndex, 3);

  // Search forward for line 10 (wraps around)
  orch.jumpToLine(10);
  assert.equal(orch.activeStepIndex, 0);
});
