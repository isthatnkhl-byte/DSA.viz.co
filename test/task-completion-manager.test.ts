import test from "node:test";
import assert from "node:assert/strict";
import { taskCompletionManager, TaskCompletionManager } from "../src/lib/task-completion-manager.ts";
import type { VizStep } from "../src/lib/problems.ts";

test("TaskCompletionManager: startTask initializes task with 'pending' status", async () => {
  const manager = new TaskCompletionManager();
  const task = await manager.startTask({
    problemSlug: "trapping-rain-water",
    datasetId: "dataset_1",
    maxLoops: 5,
  });

  assert.equal(task.status, "pending");
  assert.equal(task.problemSlug, "trapping-rain-water");
  assert.equal(task.datasetId, "dataset_1");
  assert.equal(task.loopCount, 0);
  assert.equal(task.maxLoops, 5);

  const fetched = manager.getTask(task.taskId);
  assert.ok(fetched);
  assert.equal(fetched?.status, "pending");
});

test("TaskCompletionManager: updateProgress tracks loops and detects physical completion", async () => {
  const manager = new TaskCompletionManager();
  const task = await manager.startTask({
    problemSlug: "two-sum",
    datasetId: "dataset_1",
    maxLoops: 10,
  });

  const step1: VizStep = {
    line: 0,
    desc: "Initialize lookup map",
    array: [2, 7, 11, 15],
  };

  const p1 = await manager.updateProgress(task.taskId, {
    loopCount: 1,
    newSteps: [step1],
    accumulatedSteps: [step1],
    codeLines: ["seen = {}", "for i, num in enumerate(nums):", "    return [seen[complement], i]"],
    isCompleteFlag: false,
  });

  assert.equal(p1.shouldStop, false);
  assert.equal(p1.record.status, "generating");
  assert.equal(p1.record.loopCount, 1);

  // Terminal step where description indicates return
  const step2: VizStep = {
    line: 2,
    desc: "Target complement found! Returning indices [0, 1].",
    array: [2, 7, 11, 15],
  };

  const p2 = await manager.updateProgress(task.taskId, {
    loopCount: 2,
    newSteps: [step2],
    accumulatedSteps: [step1, step2],
    codeLines: ["seen = {}", "for i, num in enumerate(nums):", "    return [seen[complement], i]"],
    isCompleteFlag: false, // Model erroneously marked false!
  });

  // Even though model marked false, TaskCompletionManager detects physical termination!
  assert.equal(p2.shouldStop, true);
  assert.equal(p2.record.status, "completed");
  assert.equal(p2.record.isTerminalLine, true);
});

test("TaskCompletionManager: forceComplete allows user to manually break infinite loop", async () => {
  const manager = new TaskCompletionManager();
  const task = await manager.startTask({
    problemSlug: "trapping-rain-water",
    datasetId: "dataset_1",
    maxLoops: 10,
  });

  await manager.setGenerating(task.taskId);
  let current = manager.getTask(task.taskId);
  assert.equal(current?.status, "generating");

  // User hits "Force Complete / Stop Loop" button in UI
  const forceResult = await manager.forceComplete(task.taskId, "User manually terminated infinite loop");

  assert.equal(forceResult.status, "force_completed");
  assert.equal(forceResult.forceCompletedReason, "User manually terminated infinite loop");
  assert.equal(manager.isForceCompleted(task.taskId), true);

  // Subsequent progress attempts are stopped immediately
  const p = await manager.updateProgress(task.taskId, {
    loopCount: 5,
    newSteps: [],
    accumulatedSteps: [],
  });

  assert.equal(p.shouldStop, true);
  assert.equal(p.record.status, "force_completed");
});

test("TaskCompletionManager: detects terminal pointer bounds (two-pointers while left < right)", () => {
  const manager = new TaskCompletionManager();
  const step: VizStep = {
    line: 8,
    desc: "Left and right pointers meet",
    left: 4,
    right: 4,
    array: [1, 2, 3, 4],
  };

  const check = manager.detectTerminalCondition(
    [step],
    ["while left < right:", "    left += 1", "return ans"],
    "while left < right:\n    left += 1\nreturn ans",
  );

  assert.equal(check.isTerminal, true);
});
