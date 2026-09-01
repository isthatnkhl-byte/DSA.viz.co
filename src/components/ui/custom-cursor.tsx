import { useEffect, useRef, useState } from "react";

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const isHoveringRef = useRef(false);
  const isVisibleRef = useRef(false);

  useEffect(() => {
    // Check if device supports hover
    if (typeof window === "undefined" || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return;
    }

    let rafId: number | null = null;
    let pendingX = 0;
    let pendingY = 0;

    const updatePosition = () => {
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${pendingX}px, ${pendingY}px, 0)`;
      }
      rafId = null;
    };

    const onMouseMove = (e: MouseEvent) => {
      pendingX = e.clientX;
      pendingY = e.clientY;

      if (!isVisibleRef.current) {
        isVisibleRef.current = true;
        setIsVisible(true);
      }

      if (!rafId) {
        rafId = requestAnimationFrame(updatePosition);
      }

      // Check if hovering over clickable elements using fast selector matching (no getComputedStyle)
      const target = e.target as HTMLElement | null;
      if (target) {
        const isClickable = !!(
          target.closest("a, button, [role='button'], input, select, label, .cursor-pointer")
        );
        if (isClickable !== isHoveringRef.current) {
          isHoveringRef.current = isClickable;
          setIsHovering(isClickable);
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

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mouseleave", onMouseLeave, { passive: true });
    document.addEventListener("mouseenter", onMouseEnter, { passive: true });
    window.addEventListener("mousedown", onMouseDown, { passive: true });
    window.addEventListener("mouseup", onMouseUp, { passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMouseMove);
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
    <div
      ref={cursorRef}
      className={`pointer-events-none fixed left-0 top-0 z-[99999] flex items-center justify-center -ml-4 -mt-4 size-8 transition-opacity duration-150 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      style={{
        willChange: "transform",
      }}
    >
      <div
        className={`flex items-center justify-center font-mono font-black text-primary transition-transform duration-150 ease-out
          ${isClicking ? "scale-75" : "scale-100"}
          ${isHovering ? "text-xl text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.8)]" : "text-lg"}
        `}
      >
        &lt;\&gt;
      </div>
    </div>
  );
}

