import { useEffect, useRef, useState } from "react";

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const auraRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isTextTarget, setIsTextTarget] = useState(false);

  const isHoveringRef = useRef(false);
  const isTextTargetRef = useRef(false);
  const isVisibleRef = useRef(false);

  // High performance tracking state
  const mousePos = useRef({ x: -100, y: -100 });
  const auraPos = useRef({ x: -100, y: -100 });
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // Check if device supports hover and fine pointer
    if (
      typeof window === "undefined" ||
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ) {
      return;
    }

    // Add class to document to safely suppress native cursor and avoid double-cursor artifact
    document.documentElement.classList.add("has-custom-cursor");

    let rafId: number | null = null;
    let lastTarget: EventTarget | null = null;

    // Fluid secondary aura interpolation (cozy ambient glow that floats gently behind)
    // Automatically sleeps when the aura catches up to the pointer so idle pages use 0% CPU/GPU
    const animateAura = () => {
      const targetX = mousePos.current.x;
      const targetY = mousePos.current.y;
      const dx = targetX - auraPos.current.x;
      const dy = targetY - auraPos.current.y;

      if (Math.abs(dx) < 0.15 && Math.abs(dy) < 0.15) {
        auraPos.current.x = targetX;
        auraPos.current.y = targetY;
        if (auraRef.current) {
          auraRef.current.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
        }
        rafId = null;
        return;
      }

      // Silky lerp (0.32 gives an organic, responsive trailing feel)
      auraPos.current.x += dx * 0.32;
      auraPos.current.y += dy * 0.32;

      if (auraRef.current) {
        auraRef.current.style.transform = `translate3d(${auraPos.current.x}px, ${auraPos.current.y}px, 0)`;
      }

      rafId = requestAnimationFrame(animateAura);
    };

    // ZERO-LATENCY Direct Mouse Tracking
    const onPointerMove = (e: PointerEvent) => {
      const x = e.clientX;
      const y = e.clientY;

      // Instant 0ms synchronous update to primary cursor
      if (cursorRef.current) {
        // Calculate horizontal sweep velocity for subtle dynamic aerodynamic tilt
        const vx = x - lastPos.current.x;
        const tilt = Math.max(-16, Math.min(16, vx * 0.5));
        lastPos.current.x = x;
        lastPos.current.y = y;

        cursorRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${tilt}deg)`;
      }

      mousePos.current.x = x;
      mousePos.current.y = y;

      if (!isVisibleRef.current) {
        isVisibleRef.current = true;
        setIsVisible(true);
        auraPos.current.x = x;
        auraPos.current.y = y;
      }

      if (rafId === null) {
        rafId = requestAnimationFrame(animateAura);
      }

      // Check element under cursor for rich contextual feedback only when target element changes
      if (e.target !== lastTarget) {
        lastTarget = e.target;
        const target = e.target as HTMLElement | null;
        if (target && typeof target.closest === "function") {
          const isClickable = !!target.closest(
            "a, button, [role='button'], select, label, .cursor-pointer, [data-interactive='true']"
          );
          const isTextInput = !!target.closest(
            "input, textarea, [contenteditable='true'], .monaco-editor, pre code"
          );

          if (isClickable !== isHoveringRef.current) {
            isHoveringRef.current = isClickable;
            setIsHovering(isClickable);
          }

          if (isTextInput !== isTextTargetRef.current) {
            isTextTargetRef.current = isTextInput;
            setIsTextTarget(isTextInput);
          }
        }
      }
    };

    const onMouseLeave = () => {
      isVisibleRef.current = false;
      setIsVisible(false);
    };

    const onMouseEnter = () => {
      isVisibleRef.current = true;
      setIsVisible(true);
    };

    const onMouseDown = () => setIsClicking(true);
    const onMouseUp = () => setIsClicking(false);

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("mouseleave", onMouseLeave, { passive: true });
    document.addEventListener("mouseenter", onMouseEnter, { passive: true });
    window.addEventListener("mousedown", onMouseDown, { passive: true });
    window.addEventListener("mouseup", onMouseUp, { passive: true });

    return () => {
      document.documentElement.classList.remove("has-custom-cursor");
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mouseenter", onMouseEnter);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  if (typeof window !== "undefined" && !window.matchMedia("(hover: hover)").matches) {
    return null;
  }

  return (
    <>
      {/* 1. Trailing Ambient Cozy Glow Orb (Fluid soft halo) */}
      <div
        ref={auraRef}
        aria-hidden="true"
        className={`pointer-events-none fixed left-0 top-0 z-[99998] -ml-8 -mt-8 size-16 rounded-full transition-opacity duration-150 ${
          isVisible && !isTextTarget ? "opacity-100" : "opacity-0"
        }`}
        style={{
          willChange: "transform",
        }}
      >
        <div
          className={`h-full w-full rounded-full transition-all duration-300 ${
            isHovering
              ? "scale-140 bg-gradient-to-tr from-primary/35 via-accent/30 to-emerald-400/30 blur-xl"
              : isClicking
              ? "scale-90 bg-primary/45 blur-lg"
              : "scale-100 bg-gradient-to-br from-primary/20 via-accent/15 to-transparent blur-md"
          }`}
        />
      </div>

      {/* 2. Zero-Lag Primary Cursor with Animated </> Logo */}
      <div
        ref={cursorRef}
        aria-hidden="true"
        className={`pointer-events-none fixed left-0 top-0 z-[99999] flex items-center justify-center -ml-4 -mt-4 size-8 transition-opacity duration-100 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        style={{
          willChange: "transform",
        }}
      >
        {isTextTarget ? (
          /* Text selection / Code editing precision mode */
          <div className="flex h-5 w-1 items-center justify-center rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.9)] animate-pulse" />
        ) : (
          /* Animated </> Developer Badge Logo */
          <div
            className={`relative flex items-center justify-center font-mono font-black select-none tracking-tighter transition-all duration-150 ${
              isClicking
                ? "scale-75 brightness-125"
                : isHovering
                ? "scale-120 drop-shadow-[0_0_14px_rgba(var(--primary),0.9)]"
                : "scale-100 drop-shadow-[0_0_6px_rgba(var(--primary),0.45)]"
            }`}
          >
            {/* Click Impact Pulse Ring */}
            {isClicking && (
              <span className="absolute -inset-2.5 rounded-full border-2 border-primary animate-ping pointer-events-none" />
            )}

            {/* Hover Orbit Ring */}
            {isHovering && (
              <span className="absolute -inset-2 rounded-full border border-primary/40 bg-primary/15 animate-spin pointer-events-none duration-1000" />
            )}

            {/* Left Bracket < */}
            <span
              className={`inline-block text-primary transition-all duration-200 font-extrabold ${
                isHovering ? "-translate-x-1.5 text-accent scale-110" : "translate-x-0"
              }`}
              style={{ fontSize: isHovering ? "18px" : "15px" }}
            >
              &lt;
            </span>

            {/* Center Animated Slash / */}
            <span
              className={`inline-block mx-[1px] transition-all duration-200 font-black ${
                isHovering
                  ? "text-primary-foreground bg-primary px-1.5 py-0.5 rounded-md text-[11px] shadow-sm rotate-12 scale-115"
                  : "text-accent text-[13px] animate-pulse"
              }`}
            >
              /
            </span>

            {/* Right Bracket > */}
            <span
              className={`inline-block text-primary transition-all duration-200 font-extrabold ${
                isHovering ? "translate-x-1.5 text-accent scale-110" : "translate-x-0"
              }`}
              style={{ fontSize: isHovering ? "18px" : "15px" }}
            >
              &gt;
            </span>
          </div>
        )}
      </div>
    </>
  );
}


