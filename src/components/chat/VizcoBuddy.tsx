import React, { useState, useEffect, useRef } from "react";
import { AiWord } from "@/components/brand/AiWord";
import { motion, AnimatePresence, useMotionValue, useSpring } from "motion/react";
import { X, MessageSquare, Lightbulb, Compass, Code2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useChat } from "@/context/ChatContext";
import { useAuth } from "@/hooks/useAuth";
import { VizcoBuddyAvatar, type VizcoMood } from "@/components/brand/VizcoBuddyAvatar";

export function VizcoBuddy() {
  const { isOpen, openChat, activeContext } = useChat();
  const { user } = useAuth();
  const navigate = useNavigate();
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
          prompt: "Can you explain what happens in Step " + (activeContext.currentStep + 1) + " and why the pointers or state changed?",
        };
      }
      return {
        title: activeContext.problemTitle,
        desc: "Ask about this problem!",
        icon: AiWord,
        prompt: "Can you explain the optimal approach, intuition, and edge cases for " + activeContext.problemTitle + "?",
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
      desc: "Ready to help! Click to chat.",
      icon: AiWord,
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
      if (!user) {
        toast.info("Sign in with Google to chat with Vizco Buddy.");
        navigate({ to: "/auth" });
        return;
      }
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
                if (!user) {
                  toast.info("Sign in with Google to chat with Vizco Buddy.");
                  navigate({ to: "/auth" });
                  return;
                }
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
                title="Dismiss hint" aria-label="Dismiss hint"
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
          className="relative flex flex-col items-center justify-center filter drop-shadow-[0_12px_28px_rgba(0,0,0,0.35)] transition-transform duration-150"
        >
          {/* Ambient Radiant Theme Halo */}
          <div
            className="absolute -inset-3 rounded-full opacity-60 dark:opacity-80 blur-xl pointer-events-none animate-pulse"
            style={{
              background: "radial-gradient(circle, var(--primary) 0%, var(--accent) 45%, transparent 75%)",
            }}
          />

          {/* Floating Minecraft Voxel Spark Particles (Experience & Amethyst Dust) */}
          <div className="absolute -inset-4 pointer-events-none overflow-visible">
            {/* Spark 1 */}
            <motion.div
              animate={{
                y: [0, -16, 0],
                x: [0, -4, 0],
                opacity: [0.2, 0.9, 0.2],
                rotate: [0, 45, 90],
              }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1 left-2 size-2 bg-purple-400 border border-black/80 rotate-45 shadow-xs"
            />
            {/* Spark 2 */}
            <motion.div
              animate={{
                y: [0, -18, 0],
                x: [0, 5, 0],
                opacity: [0.3, 1, 0.3],
                rotate: [0, -45, -90],
              }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
              className="absolute top-3 right-1 size-1.5 bg-cyan-400 border border-black/80 rotate-45 shadow-xs"
            />
            {/* Spark 3 (Emerald) */}
            <motion.div
              animate={{
                y: [0, -14, 0],
                opacity: [0.2, 0.85, 0.2],
                rotate: [0, 30, 60],
              }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
              className="absolute bottom-6 right-3 size-1.5 bg-emerald-400 border border-black/80 shadow-xs"
            />
          </div>

          {/* 3D Buddy Avatar Body */}
          <motion.div
            whileHover={{ scale: 1.12, y: -2 }}
            whileTap={{ scale: 0.94 }}
            className="relative z-10 w-18 h-18 sm:w-22 sm:h-22 flex items-center justify-center p-1 cursor-pointer"
          >
            <VizcoBuddyAvatar
              size="lg"
              mood={mood}
              showCloudBase={true}
              showHalo={false}
              interactive={false}
              className="w-full h-full"
            />
          </motion.div>

          {/* Minecraft Pixel Status Chip beneath Buddy */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0.9 }}
            className="mt-0.5 flex items-center gap-1.5 rounded-full border border-primary/40 bg-card/95 px-2.5 py-0.5 text-[9px] font-extrabold tracking-widest text-foreground shadow-md backdrop-blur-md uppercase"
            style={{ fontFamily: "'Silkscreen', 'Press Start 2P', monospace" }}
          >
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
            </span>
            <span className="bg-gradient-to-r from-primary via-indigo-400 to-accent bg-clip-text text-transparent font-black">
              VIZCO
            </span>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
