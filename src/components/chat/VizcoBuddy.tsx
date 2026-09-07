import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "motion/react";
import { Sparkles, X, MessageSquare, Lightbulb, Compass, Code2 } from "lucide-react";
import { useChat } from "@/context/ChatContext";
import { VizcoBuddyAvatar, type VizcoMood } from "@/components/brand/VizcoBuddyAvatar";

export function VizcoBuddy() {
  const { isOpen, openChat, activeContext } = useChat();
  const [isHovered, setIsHovered] = useState(false);
  const [bubbleDismissed, setBubbleDismissed] = useState(false);
  const [mood, setMood] = useState<VizcoMood>("idle");
  const [hasInteracted, setHasInteracted] = useState(false);

  // Position tracking for mouse follow in 3D
  const buddyRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 120, damping: 14 });
  const springY = useSpring(mouseY, { stiffness: 120, damping: 14 });

  // Track dragging to prevent click trigger on drag
  const dragStartPos = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  // Calculate 3D tilt towards mouse position
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!buddyRef.current || isOpen) return;
      const rect = buddyRef.current.getBoundingClientRect();
      const buddyCenterX = rect.left + rect.width / 2;
      const buddyCenterY = rect.top + rect.height / 2;

      const diffX = e.clientX - buddyCenterX;
      const diffY = e.clientY - buddyCenterY;
      const distance = Math.hypot(diffX, diffY);

      if (distance < 500) {
        // Tilt towards cursor, clamped to gentle angles
        const tiltY = Math.max(-18, Math.min(18, (diffX / 500) * 22));
        const tiltX = Math.max(-15, Math.min(15, (-diffY / 500) * 18));
        mouseX.set(tiltY);
        mouseY.set(tiltX);
      } else {
        mouseX.set(0);
        mouseY.set(0);
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isOpen, mouseX, mouseY]);

  // Context-aware dynamic speech bubble text
  const getContextualBubble = () => {
    if (activeContext?.problemTitle) {
      if (activeContext.currentStep !== undefined) {
        return {
          title: "Step " + (activeContext.currentStep + 1),
          desc: "Ask about this transition!",
          icon: Lightbulb,
          prompt: "Can you explain what happens in Step " + (activeContext.currentStep + 1) + " without giving away the solution?",
        };
      }
      return {
        title: activeContext.problemTitle,
        desc: "Need a Socratic hint?",
        icon: Sparkles,
        prompt: "Can you give me a gentle Socratic hint for " + activeContext.problemTitle + "?",
      };
    }

    if (activeContext?.route?.includes("/compiler")) {
      return {
        title: "C++ Sandbox",
        desc: "Ask me to analyze your code!",
        icon: Code2,
        prompt: "Can you inspect my C++ code for edge cases and syntax traps?",
      };
    }

    if (activeContext?.route?.includes("/dashboard")) {
      return {
        title: "Your Journey",
        desc: "Ask me for recommendations!",
        icon: Compass,
        prompt: "Based on my progress, what problem archetype should I practice next?",
      };
    }

    return {
      title: "Vizco Buddy",
      desc: "Floating with you! Click me.",
      icon: Sparkles,
      prompt: "Hi Vizco Buddy! How can you help me master DSA?",
    };
  };

  const bubbleData = getContextualBubble();

  // Reset bubble dismissed on major route or problem change
  useEffect(() => {
    setBubbleDismissed(false);
  }, [activeContext?.problemSlug, activeContext?.route]);

  // Dynamic mood shifts based on interactions
  useEffect(() => {
    if (isHovered) {
      setMood("happy");
    } else if (activeContext?.currentStep !== undefined) {
      setMood("curious");
    } else {
      setMood("idle");
    }
  }, [isHovered, activeContext?.currentStep]);

  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    isDragging.current = false;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const dist = Math.hypot(e.clientX - dragStartPos.current.x, e.clientY - dragStartPos.current.y);
    if (dist < 6 && !isDragging.current) {
      // Clean click: Open Chatbox in clouds
      setHasInteracted(true);
      openChat();
    }
  };

  if (isOpen) return null;

  return (
    <div
      ref={buddyRef}
      className="fixed bottom-6 right-6 z-40 select-none pointer-events-none"
      style={{ touchAction: "none" }}
    >
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.15}
        onDragStart={() => {
          isDragging.current = true;
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        className="relative pointer-events-auto cursor-grab active:cursor-grabbing group flex flex-col items-center"
        initial={{ scale: 0, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        {/* Floating Context Cloud Speech Bubble */}
        <AnimatePresence>
          {!bubbleDismissed && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.9 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="absolute bottom-full mb-3 right-0 sm:-right-4 flex items-center gap-2 rounded-2xl border border-primary/30 bg-card/95 px-3 py-2 text-foreground shadow-xl shadow-black/25 backdrop-blur-xl transition-all hover:border-primary/60 cursor-pointer min-w-[210px] max-w-[270px]"
              onClick={(e) => {
                e.stopPropagation();
                openChat({ customPrompt: bubbleData.prompt });
              }}
            >
              {/* Cloud puff decorative curve */}
              <div className="absolute -bottom-1.5 right-8 size-3 rotate-45 border-r border-b border-primary/30 bg-card/95" />

              <div className="relative flex size-7 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/25">
                <bubbleData.icon className="size-3.5" />
                <span className="absolute -top-0.5 -right-0.5 flex size-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
                </span>
              </div>

              <div className="flex flex-col text-left flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs truncate">{bubbleData.title}</span>
                  <span className="rounded bg-primary/20 px-1 py-0.2 font-mono text-[8px] font-extrabold text-primary">
                    AI
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground truncate">{bubbleData.desc}</span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setBubbleDismissed(true);
                }}
                className="shrink-0 p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors"
                title="Dismiss hint"
              >
                <X className="size-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic 3D Floating Buddy Capsule */}
        <motion.div
          style={{
            rotateX: springY,
            rotateY: springX,
            transformStyle: "preserve-3d",
          }}
          className="relative flex flex-col items-center justify-center filter drop-shadow-[0_12px_28px_rgba(0,0,0,0.3)] transition-transform duration-150"
        >
          {/* Ambient Radiant Theme Halo */}
          <div
            className="absolute -inset-2 rounded-full opacity-50 dark:opacity-75 blur-xl pointer-events-none animate-pulse"
            style={{
              background: "radial-gradient(circle, var(--primary) 0%, var(--accent) 45%, transparent 75%)",
            }}
          />

          {/* Mini Atmospheric Cloud Base that floats under Vizco */}
          <motion.div
            animate={{
              scaleX: [1, 0.86, 1, 0.9, 1],
              opacity: [0.55, 0.25, 0.55, 0.35, 0.55],
              y: [0, 4, 0, 2, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -bottom-3 z-0 w-16 h-4 rounded-full bg-primary/30 dark:bg-primary/45 blur-[3px] pointer-events-none"
          />

          {/* 3D Buddy Avatar Body */}
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.94 }}
            className="relative z-10 w-16 h-16 sm:w-18 sm:h-18 flex items-center justify-center p-1 cursor-pointer"
          >
            <VizcoBuddyAvatar
              size="md"
              mood={mood}
              showCloudBase={true}
              showHalo={false}
              interactive={false}
              className="w-full h-full"
            />
          </motion.div>

          {/* Tiny Status Chip beneath Buddy */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0.85 }}
            className="mt-1 flex items-center gap-1 rounded-full border border-primary/30 bg-card/90 px-2.5 py-0.5 text-[9px] font-bold tracking-wider text-foreground shadow-md backdrop-blur-md uppercase"
          >
            <span className="relative flex size-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full size-1.5 bg-emerald-500"></span>
            </span>
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-extrabold">
              Vizco Buddy
            </span>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
