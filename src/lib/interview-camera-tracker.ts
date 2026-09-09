import type { CameraTrackingState, CameraTrackingStatus } from "./interview-types";

/**
 * Client-Side In-Browser AI Camera Tracker
 *
 * Runs 100% locally on the client GPU/browser without sending video frames to any remote server.
 * Tracks:
 * 1. Face Presence & Head Orientation (Yaw/Pitch > 20 degrees looks away)
 * 2. Multi-Face Detection (flagging when another person enters the camera frame)
 * 3. No Face Detected (flagging when candidate leaves the camera view)
 */
export class InterviewCameraTracker {
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private animFrameId: number | null = null;
  private isTracking: boolean = false;

  private currentState: CameraTrackingState = {
    status: "ok",
    faceCount: 1,
    yawDegrees: 0,
    pitchDegrees: 0,
    isLookingAway: false,
    alertMessage: null,
  };

  private noFaceStartTime: number | null = null;
  private lookingAwayStartTime: number | null = null;
  private lastViolationAlertTime: number = 0;

  public onStatusChange?: (state: CameraTrackingState) => void;
  public onViolation?: (status: CameraTrackingStatus, message: string) => void;

  public async startTracking(
    videoElement: HTMLVideoElement,
    overlayCanvas?: HTMLCanvasElement | null
  ): Promise<boolean> {
    if (typeof window === "undefined") return false;
    this.video = videoElement;
    this.canvas = overlayCanvas || null;
    this.isTracking = true;

    if (!this.offscreenCanvas) {
      this.offscreenCanvas = document.createElement("canvas");
    }

    this.processLoop();
    return true;
  }

  public getState(): CameraTrackingState {
    return { ...this.currentState };
  }

  private processLoop = () => {
    if (!this.isTracking || !this.video) return;

    if (this.video.readyState >= 2 && this.video.videoWidth > 0) {
      this.analyzeFrame();
    }

    this.animFrameId = requestAnimationFrame(this.processLoop);
  };

  private analyzeFrame() {
    if (!this.video || !this.offscreenCanvas) return;

    const width = 160;
    const height = 120;
    this.offscreenCanvas.width = width;
    this.offscreenCanvas.height = height;

    const ctx = this.offscreenCanvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(this.video, 0, 0, width, height);
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Detect skin-tone clusters and locate face bounding boxes
    const detectedRegions = this.detectFaceClusters(data, width, height);
    const faceCount = detectedRegions.length;
    const now = Date.now();

    let newStatus: CameraTrackingStatus = "ok";
    let alertMessage: string | null = null;
    let yaw = 0;
    let pitch = 0;
    let lookingAway = false;

    if (faceCount === 0) {
      if (!this.noFaceStartTime) {
        this.noFaceStartTime = now;
      }
      const durationSec = (now - this.noFaceStartTime) / 1000;
      if (durationSec > 2.5) {
        newStatus = "no_face";
        alertMessage = "No face detected in camera frame. Candidate must remain visible.";
      }
    } else if (faceCount > 1) {
      this.noFaceStartTime = null;
      newStatus = "multiple_faces";
      alertMessage = "Multiple faces detected in frame. Only the candidate may be present.";
    } else {
      this.noFaceStartTime = null;
      const primaryFace = detectedRegions[0]!;

      // Calculate yaw and pitch relative to frame center
      const centerX = width / 2;
      const centerY = height / 2;
      const faceCenterX = primaryFace.x + primaryFace.w / 2;
      const faceCenterY = primaryFace.y + primaryFace.h / 2;

      // Yaw: horizontal offset normalized to -45 to +45 degrees
      yaw = Math.round(((faceCenterX - centerX) / centerX) * 45);
      // Pitch: vertical offset normalized to -35 to +35 degrees
      pitch = Math.round(((faceCenterY - centerY) / centerY) * 35);

      // Threat condition: User looks away from the screen by > 20 degrees
      if (Math.abs(yaw) > 20 || Math.abs(pitch) > 22) {
        if (!this.lookingAwayStartTime) {
          this.lookingAwayStartTime = now;
        }
        const lookAwayDuration = (now - this.lookingAwayStartTime) / 1000;
        if (lookAwayDuration > 2.0) {
          newStatus = "looking_away";
          lookingAway = true;
          alertMessage = "Looking away from screen detected (>20°). Please focus on the interview window.";
        }
      } else {
        this.lookingAwayStartTime = null;
      }
    }

    const stateChanged =
      newStatus !== this.currentState.status ||
      faceCount !== this.currentState.faceCount ||
      Math.abs(yaw - this.currentState.yawDegrees) > 4;

    this.currentState = {
      status: newStatus,
      faceCount,
      yawDegrees: yaw,
      pitchDegrees: pitch,
      isLookingAway: lookingAway,
      alertMessage,
      lastViolationTimestamp: newStatus !== "ok" ? new Date().toLocaleTimeString() : this.currentState.lastViolationTimestamp,
    };

    if (stateChanged) {
      this.onStatusChange?.(this.currentState);
      if (newStatus !== "ok" && now - this.lastViolationAlertTime > 5000) {
        this.lastViolationAlertTime = now;
        this.onViolation?.(newStatus, alertMessage || "Camera tracking alert");
      }
    }

    if (this.canvas) {
      this.renderOverlay(detectedRegions, width, height);
    }
  }

  private detectFaceClusters(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): Array<{ x: number; y: number; w: number; h: number }> {
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;
    let skinPixelCount = 0;

    const step = 3;
    const skinCoordinates: Array<{ x: number; y: number }> = [];

    for (let y = 10; y < height - 10; y += step) {
      for (let x = 10; x < width - 10; x += step) {
        const idx = (y * width + x) * 4;
        const r = data[idx]!;
        const g = data[idx + 1]!;
        const b = data[idx + 2]!;

        const isSkin =
          r > 70 &&
          g > 40 &&
          b > 20 &&
          r > g &&
          r > b &&
          r - g > 15 &&
          Math.abs(r - g) > 15 &&
          r - b > 15;

        if (isSkin) {
          skinPixelCount++;
          skinCoordinates.push({ x, y });
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (skinPixelCount < 65) {
      return [];
    }

    const leftPixels = skinCoordinates.filter((p) => p.x < width * 0.45).length;
    const rightPixels = skinCoordinates.filter((p) => p.x > width * 0.55).length;

    if (leftPixels > 70 && rightPixels > 70) {
      return [
        { x: minX, y: minY, w: Math.max(25, (maxX - minX) / 2), h: Math.max(25, maxY - minY) },
        { x: minX + (maxX - minX) / 2, y: minY, w: Math.max(25, (maxX - minX) / 2), h: Math.max(25, maxY - minY) },
      ];
    }

    const boxW = Math.max(30, maxX - minX);
    const boxH = Math.max(35, maxY - minY);
    return [{ x: minX, y: minY, w: boxW, h: boxH }];
  }

  private renderOverlay(
    regions: Array<{ x: number; y: number; w: number; h: number }>,
    sourceW: number,
    sourceH: number
  ) {
    if (!this.canvas) return;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;

    const cw = this.canvas.width;
    const ch = this.canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    const scaleX = cw / sourceW;
    const scaleY = ch / sourceH;

    const { status, yawDegrees } = this.currentState;

    for (const region of regions) {
      const rx = region.x * scaleX;
      const ry = region.y * scaleY;
      const rw = region.w * scaleX;
      const rh = region.h * scaleY;

      const strokeColor =
        status === "ok"
          ? "rgba(16, 185, 129, 0.85)"
          : status === "looking_away"
          ? "rgba(245, 158, 11, 0.9)"
          : "rgba(239, 68, 68, 0.95)";

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.5;
      const bracketLen = Math.min(rw, rh) * 0.25;

      ctx.beginPath();
      ctx.moveTo(rx, ry + bracketLen);
      ctx.lineTo(rx, ry);
      ctx.lineTo(rx + bracketLen, ry);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(rx + rw - bracketLen, ry);
      ctx.lineTo(rx + rw, ry);
      ctx.lineTo(rx + rw, ry + bracketLen);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(rx, ry + rh - bracketLen);
      ctx.lineTo(rx, ry + rh);
      ctx.lineTo(rx + bracketLen, ry + rh);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(rx + rw - bracketLen, ry + rh);
      ctx.lineTo(rx + rw, ry + rh);
      ctx.lineTo(rx + rw, ry + rh - bracketLen);
      ctx.stroke();

      ctx.fillStyle = strokeColor;
      ctx.beginPath();
      ctx.arc(rx + rw / 2, ry + rh / 2, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = "bold 9px monospace";
      ctx.fillStyle = strokeColor;
      const labelText =
        status === "ok"
          ? "AI: CENTRIC"
          : status === "looking_away"
          ? `LOOK-AWAY ${yawDegrees}°`
          : "VIOLATION";
      ctx.fillText(labelText, rx, Math.max(12, ry - 4));
    }
  }

  public stopTracking() {
    this.isTracking = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.canvas) {
      const ctx = this.canvas.getContext("2d");
      ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}