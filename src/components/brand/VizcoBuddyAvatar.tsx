import React, { useState } from "react";
import { motion } from "motion/react";

export type VizcoMood = "idle" | "thinking" | "happy" | "waving" | "curious";

interface VizcoBuddyAvatarProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  mood?: VizcoMood;
  showCloudBase?: boolean;
  showHalo?: boolean;
  interactive?: boolean;
}

export function VizcoBuddyAvatar({
  className = "",
  size = "md",
  mood = "idle",
  showCloudBase = true,
  showHalo = true,
  interactive = true,
}: VizcoBuddyAvatarProps) {
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-14 h-14",
    lg: "w-20 h-20",
    xl: "w-28 h-28",
  }[size];

  const syncTimes = [0, 0.25, 0.28, 0.48, 0.52, 0.72, 0.75, 0.78, 0.95, 1];

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -20;
    setMouseOffset({ x, y });
  };

  const handleMouseLeave = () => {
    setMouseOffset({ x: 0, y: 0 });
  };

  const getEyeAnimation = () => {
    switch (mood) {
      case "thinking":
        return {
          x: [0, 2.5, 2.5, 0],
          y: [-1, -3, -3, -1],
          scaleY: [1, 1, 0.2, 1],
        };
      case "happy":
        return {
          y: [-1, -2, -1],
          scaleY: [0.6, 0.4, 0.6],
          scaleX: [1.2, 1.3, 1.2],
        };
      case "curious":
        return {
          x: [-2, 2, -1, 0],
          y: [0, -2, 0],
          scaleY: [1.1, 1.1, 0.2, 1.1],
        };
      case "idle":
      default:
        return {
          x: [0, 0, -2.5, -2.5, 2.5, 2.5, 0, 0, 0, 0],
          scaleY: [1, 1, 1, 1, 1, 1, 0.1, 1, 1, 1],
        };
    }
  };

  return (
    <div
      className={`relative flex items-center justify-center [perspective:1000px] select-none ${className}`}
    >
      {showHalo && (
        <div
          className="absolute -inset-1 rounded-full opacity-60 dark:opacity-80 blur-lg pointer-events-none transition-all duration-500"
          style={{
            background: "radial-gradient(circle, var(--primary) 0%, var(--accent) 50%, transparent 80%)",
          }}
        />
      )}

      <svg
        viewBox="0 0 100 115"
        className={`${sizeClasses} relative z-10 filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.25)]`}
        xmlns="http://www.w3.org/2000/svg"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {showCloudBase && (
          <g className="pointer-events-none">
            <motion.ellipse
              cx="50"
              cy="104"
              rx="38"
              ry="6"
              fill="currentColor"
              className="text-foreground/20 dark:text-primary/40 filter blur-[2px]"
              animate={{
                rx: [40, 30, 40, 32, 40],
                opacity: [0.35, 0.15, 0.35, 0.2, 0.35],
              }}
              transition={{
                duration: 4.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            <motion.g
              animate={{
                y: [0, -3, 0, -2, 0],
                scaleX: [1, 0.95, 1, 0.97, 1],
              }}
              transition={{
                duration: 4.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{ transformOrigin: "50% 100%" }}
            >
              <ellipse
                cx="50"
                cy="98"
                rx="28"
                ry="7.5"
                fill="currentColor"
                className="text-card dark:text-card/90"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <ellipse
                cx="35"
                cy="96"
                rx="15"
                ry="6.5"
                fill="currentColor"
                className="text-card/95"
              />
              <ellipse
                cx="65"
                cy="96"
                rx="15"
                ry="6.5"
                fill="currentColor"
                className="text-card/95"
              />
              <path
                d="M 22 98 C 22 92, 34 91, 38 94 C 42 90, 58 90, 62 94 C 66 91, 78 92, 78 98"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                className="text-primary/40"
              />
            </motion.g>
          </g>
        )}

        <motion.g
          animate={{
            y: [0, -7, 0, -4, 0],
            rotateX: [6 + mouseOffset.y, -6 + mouseOffset.y, 6 + mouseOffset.y],
            rotateY: [-10 + mouseOffset.x, 10 + mouseOffset.x, -10 + mouseOffset.x],
            rotateZ: [0, -2.5, 2.5, -1, 0],
          }}
          transition={{
            duration: 4.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ transformOrigin: "50% 50%", transformStyle: "preserve-3d" }}
        >
          <g transform="translate(3.2, 4.2)" opacity="0.22">
            <path
              d="M 22 33 L 5 50 L 26 67"
              fill="none"
              stroke="#000000"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 78 33 L 95 50 L 74 67"
              fill="none"
              stroke="#000000"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line
              x1="31"
              y1="90"
              x2="69"
              y2="10"
              stroke="#000000"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <polygon points="22,33 78,33 74,67 26,67" fill="#000000" />
          </g>

          <g transform="translate(1.6, 2)" opacity="0.5">
            <path
              d="M 22 33 L 5 50 L 26 67"
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary/70"
            />
            <path
              d="M 78 33 L 95 50 L 74 67"
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary/70"
            />
            <line
              x1="31"
              y1="90"
              x2="69"
              y2="10"
              stroke="currentColor"
              strokeWidth="6.5"
              strokeLinecap="round"
              className="text-primary/70"
            />
            <polygon
              points="22,33 78,33 74,67 26,67"
              fill="currentColor"
              className="text-primary/70"
            />
          </g>

          <path
            d="M 22 33 L 5 50 L 26 67"
            fill="none"
            stroke="currentColor"
            strokeWidth="5.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          />

          <path
            d="M 78 33 L 95 50 L 74 67"
            fill="none"
            stroke="currentColor"
            strokeWidth="5.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          />

          <line
            x1="31"
            y1="90"
            x2="69"
            y2="10"
            stroke="currentColor"
            strokeWidth="6.8"
            strokeLinecap="round"
            className="text-primary"
          />

          <polygon
            points="22,33 78,33 74,67 26,67"
            fill="currentColor"
            className="text-primary"
          />

          <polygon
            points="23,35 77,35 73,38 27,38"
            fill="#ffffff"
            opacity="0.3"
          />

          <motion.g
            animate={getEyeAnimation()}
            transition={{
              duration: mood === "idle" ? 7 : 3,
              repeat: Infinity,
              times: mood === "idle" ? syncTimes : undefined,
            }}
            style={{ transformOrigin: "50% 50%" }}
          >
            <rect
              x="39.5"
              y="44"
              width="5.5"
              height="12"
              rx="2.75"
              fill="#ffffff"
              className="filter drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]"
            />
            <rect
              x="55"
              y="44"
              width="5.5"
              height="12"
              rx="2.75"
              fill="#ffffff"
              className="filter drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]"
            />
          </motion.g>

          <motion.circle
            cx="69"
            cy="10"
            r="2"
            fill="#ffffff"
            animate={{
              scale: [0.8, 1.4, 0.8],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </motion.g>
      </svg>
    </div>
  );
}
