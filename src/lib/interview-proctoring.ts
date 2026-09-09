/**
 * Anti-Cheat & Live Proctoring Engine
 * Enforces:
 * - Fullscreen mode enforcement
 * - Tab-switch & window visibility change monitoring
 * - Window blur & focus loss detection
 * - External paste interception & telemetry
 * - DevTools shortcut guard (F12, Inspect shortcuts)
 * - 3-Strike Warning System & Audit Log
 */

export interface ProctoringEvent {
  id: string;
  timestamp: string;
  type: "tab_switch" | "fullscreen_exit" | "window_blur" | "clipboard_paste" | "devtools_attempt" | "camera_status";
  severity: "info" | "warning" | "strike";
  description: string;
  strikeCount: number;
}

export interface ProctoringState {
  isActive: boolean;
  strikes: number;
  maxStrikes: number;
  isFullscreen: boolean;
  isCameraActive: boolean;
  events: ProctoringEvent[];
  tabSwitchCount: number;
  blurCount: number;
  pasteCount: number;
  integrityScore: number; // 0 to 10
  pendingStrikeModal: {
    isOpen: boolean;
    strikeNumber: number;
    reason: string;
    isTerminated: boolean;
  } | null;
}

export class InterviewProctoringEngine {
  private strikes: number = 0;
  private readonly maxStrikes: number = 3;
  private isFullscreen: boolean = false;
  private isCameraActive: boolean = false;
  private events: ProctoringEvent[] = [];
  private tabSwitchCount: number = 0;
  private blurCount: number = 0;
  private pasteCount: number = 0;
  private isActive: boolean = false;
  private pendingStrikeModal: {
    isOpen: boolean;
    strikeNumber: number;
    reason: string;
    isTerminated: boolean;
  } | null = null;

  private onStateChangeCallback?: (state: ProctoringState) => void;
  private onStrikeTriggeredCallback?: (strikeNumber: number, reason: string) => void;
  private onAutoTerminateCallback?: (reason: string) => void;

  constructor(
    onStateChange?: (state: ProctoringState) => void,
    onStrikeTriggered?: (strikeNumber: number, reason: string) => void,
    onAutoTerminate?: (reason: string) => void
  ) {
    this.onStateChangeCallback = onStateChange;
    this.onStrikeTriggeredCallback = onStrikeTriggered;
    this.onAutoTerminateCallback = onAutoTerminate;
  }

  public getState(): ProctoringState {
    // Deduct 2.5 points per strike from 10
    const integrity = Math.max(1.0, Math.round((10 - this.strikes * 2.5 - this.blurCount * 0.2 - this.pasteCount * 0.5) * 10) / 10);
    return {
      isActive: this.isActive,
      strikes: this.strikes,
      maxStrikes: this.maxStrikes,
      isFullscreen: this.isFullscreen,
      isCameraActive: this.isCameraActive,
      events: [...this.events],
      tabSwitchCount: this.tabSwitchCount,
      blurCount: this.blurCount,
      pasteCount: this.pasteCount,
      integrityScore: integrity,
      pendingStrikeModal: this.pendingStrikeModal,
    };
  }

  private notify() {
    this.onStateChangeCallback?.(this.getState());
  }

  public acknowledgeStrike() {
    this.pendingStrikeModal = null;
    this.notify();
  }

  private addEvent(
    type: ProctoringEvent["type"],
    severity: ProctoringEvent["severity"],
    description: string,
    addsStrike: boolean = false
  ) {
    if (addsStrike) {
      this.strikes = Math.min(this.maxStrikes, this.strikes + 1);
      const isTerminated = this.strikes >= this.maxStrikes;
      
      this.pendingStrikeModal = {
        isOpen: true,
        strikeNumber: this.strikes,
        reason: description,
        isTerminated,
      };

      this.onStrikeTriggeredCallback?.(this.strikes, description);

      if (isTerminated) {
        this.onAutoTerminateCallback?.(`Maximum strikes limit (${this.maxStrikes}) reached: ${description}`);
      }
    }

    const newEvent: ProctoringEvent = {
      id: "proc-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toLocaleTimeString(),
      type,
      severity: addsStrike ? "strike" : severity,
      description,
      strikeCount: this.strikes,
    };

    this.events.unshift(newEvent);
    if (this.events.length > 50) {
      this.events.pop();
    }
    this.notify();
  }

  public async startProctoring(elementToFullscreen?: HTMLElement): Promise<boolean> {
    if (typeof window === "undefined") return false;

    this.isActive = true;
    this.strikes = 0;
    this.events = [];
    this.tabSwitchCount = 0;
    this.blurCount = 0;
    this.pasteCount = 0;

    // 1. Request Fullscreen
    try {
      const target = elementToFullscreen || document.documentElement;
      if (target.requestFullscreen) {
        await target.requestFullscreen();
        this.isFullscreen = true;
      }
    } catch (e) {
      console.warn("Fullscreen request not permitted or cancelled:", e);
    }

    this.addEvent("camera_status", "info", "Live Proctoring activated. Fullscreen & Anti-Cheat enabled.");

    // Bind event listeners
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    window.addEventListener("blur", this.handleWindowBlur);
    document.addEventListener("fullscreenchange", this.handleFullscreenChange);
    window.addEventListener("paste", this.handlePaste, true);
    window.addEventListener("keydown", this.handleKeyDown, true);

    this.notify();
    return true;
  }

  public setCameraStatus(active: boolean) {
    this.isCameraActive = active;
    if (!active && this.isActive) {
      this.addEvent("camera_status", "warning", "Camera feed was interrupted or disabled.");
    }
    this.notify();
  }

  public recordCameraViolation(description: string) {
    if (!this.isActive) return;
    this.addEvent("camera_status", "warning", `AI Camera: ${description}`);
  }

  private handleVisibilityChange = () => {
    if (!this.isActive) return;
    if (document.visibilityState === "hidden") {
      this.tabSwitchCount++;
      this.addEvent(
        "tab_switch",
        "strike",
        `Proctoring Violation: Tab switch or browser minimization detected! (#${this.tabSwitchCount})`,
        true
      );
    } else if (document.visibilityState === "visible") {
      // Automatic Revert: Re-request fullscreen immediately upon focus return
      try {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } catch {}
      this.notify();
    }
  };

  private handleWindowBlur = () => {
    if (!this.isActive) return;
    this.blurCount++;
    if (this.blurCount > 1) {
      this.addEvent(
        "window_blur",
        "warning",
        `Focus Alert: Cursor or focus moved outside the live interview window.`
      );
    }
  };

  private handleFullscreenChange = () => {
    if (!this.isActive) return;
    const isFull = !!document.fullscreenElement;
    this.isFullscreen = isFull;
    if (!isFull) {
      this.addEvent(
        "fullscreen_exit",
        "strike",
        "Proctoring Alert: Candidate exited full-screen mode.",
        true
      );
    }
    this.notify();
  };

  private handlePaste = (e: ClipboardEvent) => {
    if (!this.isActive) return;
    const pastedData = e.clipboardData?.getData("text") || "";
    // If user pastes more than 60 characters from clipboard, log warning
    if (pastedData.length > 60) {
      this.pasteCount++;
      this.addEvent(
        "clipboard_paste",
        "warning",
        `External Paste: Candidate pasted a block of ${pastedData.length} characters into the editor.`
      );
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.isActive) return;

    // Block F12, Ctrl+Shift+I / Cmd+Opt+I, Ctrl+U
    const isDevTools =
      e.key === "F12" ||
      ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "C" || e.key === "c" || e.key === "J" || e.key === "j")) ||
      ((e.ctrlKey || e.metaKey) && (e.key === "u" || e.key === "U"));

    if (isDevTools) {
      e.preventDefault();
      e.stopPropagation();
      this.addEvent("devtools_attempt", "warning", "Security notice: Developer tools shortcut intercepted.");
    }
  };

  public stopProctoring() {
    this.isActive = false;
    if (typeof window === "undefined") return;

    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    window.removeEventListener("blur", this.handleWindowBlur);
    document.removeEventListener("fullscreenchange", this.handleFullscreenChange);
    window.removeEventListener("paste", this.handlePaste, true);
    window.removeEventListener("keydown", this.handleKeyDown, true);

    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }

    this.notify();
  }
}
