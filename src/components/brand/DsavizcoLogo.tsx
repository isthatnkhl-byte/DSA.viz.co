import React, { useState } from 'react';
import { motion } from 'motion/react';

export interface DsavizcoLogoProps {
  className?: string;
  interactive?: boolean;
  showShadow?: boolean;
  showGradient?: boolean;
  color?: string;
}

export function DsavizcoLogo({
  className = "w-10 h-10",
  interactive = true,
  showShadow = true,
}: DsavizcoLogoProps) {
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  // Shared timing schedule for synchronized head, eyes, and movement
  const syncTimes = [0, 0.25, 0.28, 0.48, 0.52, 0.72, 0.75, 0.78, 0.95, 1];

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 24; // -12 to 12 deg
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -24; // -12 to 12 deg
    setMouseOffset({ x, y });
  };

  const handleMouseLeave = () => {
    setMouseOffset({ x: 0, y: 0 });
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center [perspective:1000px]">
      <svg 
        viewBox="0 0 100 110" 
        className={className} 
        xmlns="http://www.w3.org/2000/svg"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Dynamic 3D Ground Pixel Shadow (Wider for stretched body) */}
        {showShadow && (
          <motion.ellipse
            cx="50"
            cy="100"
            rx="42"
            ry="7"
            fill="currentColor"
            opacity="0.18"
            animate={interactive ? {
              rx: [44, 32, 44, 35, 44],
              opacity: [0.22, 0.1, 0.22, 0.14, 0.22]
            } : undefined}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="text-primary/50 dark:text-primary/70 filter blur-[2px]"
          />
        )}

        {/* 3D Floating & Tilting Mascot Group */}
        <motion.g
          animate={interactive ? { 
            y: [0, -8, 0, -5, 0],
            rotateX: [8 + mouseOffset.y, -8 + mouseOffset.y, 8 + mouseOffset.y],
            rotateY: [-12 + mouseOffset.x, 12 + mouseOffset.x, -12 + mouseOffset.x],
            rotateZ: [0, -3.5, 3.5, -1.5, 0],
          } : undefined}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ transformOrigin: "50% 50%", transformStyle: "preserve-3d" }}
        >
          {/* ================= 3D CAST SHADOW LAYER (Back 3D Depth) ================= */}
          <g transform="translate(3.5, 4.5)" opacity="0.25">
            {/* Left Ear `<` stretched far left to -X */}
            <path d="M 22 33 L 5 50 L 26 67" fill="none" stroke="#000000" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Right Ear `>` stretched far right to +X */}
            <path d="M 78 33 L 95 50 L 74 67" fill="none" stroke="#000000" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Integrated Slash `/` */}
            <line x1="31" y1="90" x2="69" y2="10" stroke="#000000" strokeWidth="7" strokeLinecap="round" />
            {/* Horizontally Stretched Head Trapezoid */}
            <polygon points="22,33 78,33 74,67 26,67" fill="#000000" />
          </g>

          {/* ================= 3D MID EXTRUSION LAYER ================= */}
          <g transform="translate(1.8, 2.2)" opacity="0.45">
            <path d="M 22 33 L 5 50 L 26 67" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/70" />
            <path d="M 78 33 L 95 50 L 74 67" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/70" />
            <line x1="31" y1="90" x2="69" y2="10" stroke="currentColor" strokeWidth="6.5" strokeLinecap="round" className="text-primary/70" />
            <polygon points="22,33 78,33 74,67 26,67" fill="currentColor" className="text-primary/70" />
          </g>

          {/* ================= MAIN FRONT BODY (Horizontally Stretched) ================= */}
          {/* Left Ear `<` attached at corners and stretching far left */}
          <path 
            d="M 22 33 L 5 50 L 26 67" 
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Right Ear `>` attached at corners and stretching far right */}
          <path 
            d="M 78 33 L 95 50 L 74 67" 
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Integrated Slash `/` extending through head seamlessly */}
          <line 
            x1="31" 
            y1="90" 
            x2="69" 
            y2="10" 
            stroke="currentColor" 
            strokeWidth="6.5" 
            strokeLinecap="round" 
          />

          {/* Head Trapezoid - Wide X-Axis Stretch */}
          <polygon 
            points="22,33 78,33 74,67 26,67" 
            fill="currentColor" 
          />

          {/* ================= SOLID WHITE ANIMATED EYES ================= */}
          <motion.g
            animate={interactive ? {
              x: [0, 0, -2.5, -2.5, 2.5, 2.5, 0, 0, 0, 0],
              scaleY: [1, 1, 1, 1, 1, 1, 0.1, 1, 1, 1],
            } : undefined}
            transition={{
              duration: 8,
              repeat: Infinity,
              times: syncTimes
            }}
            style={{ transformOrigin: '50% 50%' }}
          >
            {/* Bright Solid White Pill Eyes in Wide Face */}
            <rect x="39.5" y="44" width="5.5" height="12" rx="2.75" fill="#ffffff" />
            <rect x="55" y="44" width="5.5" height="12" rx="2.75" fill="#ffffff" />
          </motion.g>
        </motion.g>
      </svg>
    </div>
  );
}
