/**
 * TaskCompletionManager
 *
 * Tracks the end-to-end lifecycle and status of AI-generated pseudocode tasks.
 * Prevents runaway pagination loops (infinite loops caused by false `is_complete: false`),
 * persists pending and live execution statuses to Firebase / local storage, and allows
 * users to manually force-complete a generation to immediately inspect collected steps.
 */

import { auth } from "./firebase";
import { saveTaskStatusRecord, getTaskStatusRecord, type TaskRecordData } from "./firestore-service";
import type { VizStep } from "./problems";

export type { TaskRecordData };

export type TaskStatus =
  | "idle"
  | "pending"
  | "generating"
  | "completed"
  | "force_completed"
  | "failed"
  | "cancelled";

export interface TaskInitParams {
  problemSlug: string;
  datasetId: string;
  maxLoops?: number;
  totalExpectedSteps?: number;
  pseudocode?: string;
  taskId?: string;
}

export interface ProgressUpdateParams {
  loopCount: number;
  newSteps: VizStep[];
  accumulatedSteps: VizStep[];
  totalExpectedSteps?: number;
  codeLines?: string[];
  pseudocode?: string;
  isCompleteFlag?: boolean;
}

type TaskListener = (record: TaskRecordData) => void;

class TaskCompletionManager {
  private memoryTasks = new Map<string, TaskRecordData>();
  private listeners = new Map<string, Set<TaskListener>>();
  private abortControllers = new Map<string, AbortController>();

  /**
   * Helper to get current Firebase User ID or a guest fallback ID.
   */
  private getEffectiveUserId(): string {
    return auth.currentUser?.uid || "guest-developer";
  }

  /**
   * Save task to localStorage as resilient offline/immediate cache.
   */
  private saveToLocal(record: TaskRecordData) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(`dsaviz_task_${record.taskId}`, JSON.stringify(record));
    } catch {
      // Ignore storage quota or SSR errors
    }
  }

  /**
   * Retrieve from localStorage fallback.
   */
  private getFromLocal(taskId: string): TaskRecordData | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(`dsaviz_task_${taskId}`);
      return raw ? (JSON.parse(raw) as TaskRecordData) : null;
    } catch {
      return null;
    }
  }

  /**
   * Notify all listeners subscribed to a specific taskId.
   */
  private notify(record: TaskRecordData) {
    const subs = this.listeners.get(record.taskId);
    if (subs) {
      subs.forEach((cb) => {
        try {
          cb(record);
        } catch (err) {
          console.error("TaskCompletionManager listener error:", err);
        }
      });
    }
  }

  /**
   * Persist record across memory, localStorage, and Firebase Firestore.
   */
  private async persistRecord(record: TaskRecordData): Promise<void> {
    record.updatedAt = new Date().toISOString();
    this.memoryTasks.set(record.taskId, record);
    this.saveToLocal(record);
    this.notify(record);

    const userId = this.getEffectiveUserId();
    if (userId) {
      try {
        await saveTaskStatusRecord(userId, record);
      } catch (err) {
        console.warn(`Failed to persist task ${record.taskId} to Firebase:`, err);
      }
    }
  }

  /**
   * Evaluates whether the generated steps physically indicate algorithmic completion.
   * This breaks the infinite loop if the model forgot to emit `is_complete: true`.
   */
  public detectTerminalCondition(
    steps: VizStep[],
    codeLines?: string[],
    pseudocode?: string,
  ): { isTerminal: boolean; reason?: string } {
    if (!steps || steps.length === 0) {
      return { isTerminal: false };
    }

    const lastStep = steps[steps.length - 1];
    if (!lastStep) return { isTerminal: false };

    // 1. Invariant Drain Check: Queue or Worklist is empty (after initially being populated)
    // We check if the last step explicitly shows an empty queue, but ONLY if previous steps had items
    if (Array.isArray(lastStep.queue) && lastStep.queue.length === 0) {
      const hadItemsBefore = steps.some(s => Array.isArray(s.queue) && s.queue.length > 0);
      if (hadItemsBefore) {
        return { isTerminal: true, reason: "Queue drained completely (BFS/Level-Order completion)." };
      }
    }
    if (Array.isArray(lastStep.stack) && lastStep.stack.length === 0) {
      const hadItemsBefore = steps.some(s => Array.isArray(s.stack) && s.stack.length > 0);
      if (hadItemsBefore) {
        return { isTerminal: true, reason: "Stack drained completely (DFS/Traversal completion)." };
      }
    }

    // 2. Traversal pointer bounds (two pointers collision)
    if (typeof lastStep.left === "number" && typeof lastStep.right === "number") {
      if (lastStep.left >= lastStep.right && pseudocode?.includes("while left < right")) {
        return {
          isTerminal: true,
          reason: `Pointers crossed (left=${lastStep.left} >= right=${lastStep.right}) for while left < right`,
        };
      }
    }

    // 3. Line index matches the absolute final return line (Structural Terminal Line)
    // We only rely on this if it's explicitly returning or hitting the absolute last code boundary,
    // avoiding false positives on internal early-returns (like guard clauses).
    if (codeLines && codeLines.length > 0 && typeof lastStep.line === "number") {
       const isFinalLine = lastStep.line >= codeLines.length - 1;
       if (isFinalLine) {
         return {
           isTerminal: true,
           reason: `Reached the final absolute line of the code snippet.`,
         };
       }
    }

    return { isTerminal: false };
  }

  /**
   * Starts a new task, transitions it to 'pending', creates an AbortController,
   * and persists the initial record to Firebase Firestore.
   */
  public async startTask(params: TaskInitParams): Promise<TaskRecordData> {
    const taskId =
      params.taskId ||
      `task_${params.problemSlug}_${params.datasetId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const controller = new AbortController();
    this.abortControllers.set(taskId, controller);

    const now = new Date().toISOString();
    const record: TaskRecordData = {
      taskId,
      problemSlug: params.problemSlug,
      datasetId: params.datasetId,
      status: "pending",
      loopCount: 0,
      maxLoops: params.maxLoops || 10,
      stepCount: 0,
      totalExpectedSteps: params.totalExpectedSteps,
      createdAt: now,
      updatedAt: now,
    };

    await this.persistRecord(record);
    return record;
  }

  /**
   * Sets the expected total number of steps predicted by the AI on the first execution of Stage 3.
   * Persists the record to Firebase Firestore.
   */
  public async setTotalExpectedSteps(
    taskId: string,
    totalExpectedSteps: number,
  ): Promise<TaskRecordData | null> {
    const record = this.getTask(taskId);
    if (!record) return null;
    record.totalExpectedSteps = totalExpectedSteps;
    await this.persistRecord(record);
    return record;
  }

  /**
   * Marks a task as actively 'generating'.
   */
  public async setGenerating(taskId: string): Promise<TaskRecordData | null> {
    const record = this.getTask(taskId);
    if (!record) return null;
    if (record.status === "force_completed" || record.status === "cancelled") {
      return record;
    }

    record.status = "generating";
    await this.persistRecord(record);
    return record;
  }

  /**
   * Records chunk generation progress, checks for terminal condition or stagnating loops,
   * and indicates if the client pagination loop should stop immediately.
   */
  public async updateProgress(
    taskId: string,
    params: ProgressUpdateParams,
  ): Promise<{ record: TaskRecordData; shouldStop: boolean }> {
    const record = this.getTask(taskId);
    if (!record) {
      throw new Error(`Task ${taskId} does not exist.`);
    }

    // If already force-completed or cancelled by user, signal immediate stop
    if (record.status === "force_completed" || record.status === "cancelled") {
      return { record, shouldStop: true };
    }

    record.loopCount = params.loopCount;
    record.stepCount = params.accumulatedSteps.length;
    if (params.totalExpectedSteps !== undefined && params.totalExpectedSteps > 0) {
      record.totalExpectedSteps = params.totalExpectedSteps;
    }

    const lastStep = params.accumulatedSteps[params.accumulatedSteps.length - 1];
    if (lastStep) {
      record.lastStepLine = lastStep.line;
      record.lastStepDesc = lastStep.desc?.slice(0, 500);
    }

    // Check physical termination conditions
    const terminalCheck = this.detectTerminalCondition(
      params.accumulatedSteps,
      params.codeLines,
      params.pseudocode,
    );

    record.isTerminalLine = terminalCheck.isTerminal;

    // Zero-delta stagnation check (e.g. 0 new steps returned in this batch)
    const isStagnant = params.loopCount > 1 && params.newSteps.length === 0;

    const modelMarkedComplete = params.isCompleteFlag === true;

    if (modelMarkedComplete || terminalCheck.isTerminal || isStagnant) {
      record.status = "completed";
      await this.persistRecord(record);
      return { record, shouldStop: true };
    }

    // Max loop bound hit
    if (params.loopCount >= record.maxLoops) {
      record.status = "completed";
      record.forceCompletedReason = `Reached maximum generation limit (${record.maxLoops} batches).`;
      await this.persistRecord(record);
      return { record, shouldStop: true };
    }

    // Still legitimately progressing
    record.status = "generating";
    await this.persistRecord(record);
    return { record, shouldStop: false };
  }

  /**
   * Allows the user to force a manual status update if the agent enters an infinite loop.
   * Immediately updates state to 'force_completed', aborts ongoing network calls,
   * and persists this manual override to Firebase.
   */
  public async forceComplete(taskId: string, reason = "Manual user override (stopped infinite loop)"): Promise<TaskRecordData> {
    const record = this.getTask(taskId);
    const now = new Date().toISOString();

    const updatedRecord: TaskRecordData = record
      ? {
          ...record,
          status: "force_completed",
          forceCompletedReason: reason,
          updatedAt: now,
        }
      : {
          taskId,
          problemSlug: "unknown",
          datasetId: "unknown",
          status: "force_completed",
          loopCount: 1,
          maxLoops: 10,
          stepCount: 0,
          forceCompletedReason: reason,
          createdAt: now,
          updatedAt: now,
        };

    // Abort ongoing network requests
    const controller = this.abortControllers.get(taskId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(taskId);
    }

    await this.persistRecord(updatedRecord);
    return updatedRecord;
  }

  /**
   * Marks task as completed successfully.
   */
  public async markCompleted(taskId: string, finalStepCount?: number): Promise<TaskRecordData | null> {
    const record = this.getTask(taskId);
    if (!record) return null;

    record.status = "completed";
    if (typeof finalStepCount === "number") {
      record.stepCount = finalStepCount;
    }

    this.abortControllers.delete(taskId);
    await this.persistRecord(record);
    return record;
  }

  /**
   * Marks task as failed with error reason.
   */
  public async markFailed(taskId: string, error: string): Promise<TaskRecordData | null> {
    const record = this.getTask(taskId);
    if (!record) return null;

    record.status = "failed";
    record.error = error.slice(0, 1000);

    this.abortControllers.delete(taskId);
    await this.persistRecord(record);
    return record;
  }

  /**
   * Cancels a task upon user action.
   */
  public async cancelTask(taskId: string): Promise<TaskRecordData | null> {
    const record = this.getTask(taskId);
    if (!record) return null;

    record.status = "cancelled";
    const controller = this.abortControllers.get(taskId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(taskId);
    }

    await this.persistRecord(record);
    return record;
  }

  /**
   * Returns current in-memory task or checks localStorage fallback.
   */
  public getTask(taskId: string): TaskRecordData | null {
    if (this.memoryTasks.has(taskId)) {
      return this.memoryTasks.get(taskId)!;
    }
    const local = this.getFromLocal(taskId);
    if (local) {
      this.memoryTasks.set(taskId, local);
      return local;
    }
    return null;
  }

  /**
   * Fetches task record from Firestore with fallback.
   */
  public async fetchTaskFromDatabase(taskId: string): Promise<TaskRecordData | null> {
    const cached = this.getTask(taskId);
    if (cached) return cached;

    const userId = this.getEffectiveUserId();
    if (userId) {
      const remote = await getTaskStatusRecord(userId, taskId);
      if (remote) {
        this.memoryTasks.set(taskId, remote);
        this.saveToLocal(remote);
        return remote;
      }
    }
    return null;
  }

  /**
   * Subscribes to real-time status changes for a task.
   */
  public subscribe(taskId: string, callback: TaskListener): () => void {
    if (!this.listeners.has(taskId)) {
      this.listeners.set(taskId, new Set());
    }
    const set = this.listeners.get(taskId)!;
    set.add(callback);

    // Call immediately if task exists
    const existing = this.getTask(taskId);
    if (existing) {
      try {
        callback(existing);
      } catch (err) {
        console.error("Initial subscriber error:", err);
      }
    }

    return () => {
      set.delete(callback);
      if (set.size === 0) {
        this.listeners.delete(taskId);
      }
    };
  }

  /**
   * Gets AbortSignal for the task to pass to fetch / API calls.
   */
  public getAbortSignal(taskId: string): AbortSignal | undefined {
    return this.abortControllers.get(taskId)?.signal;
  }

  /**
   * Checks if task was force completed.
   */
  public isForceCompleted(taskId: string): boolean {
    const task = this.getTask(taskId);
    return task?.status === "force_completed";
  }
}

export const taskCompletionManager = new TaskCompletionManager();
export { TaskCompletionManager };
