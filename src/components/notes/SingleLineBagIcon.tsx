import React from "react";

export interface SingleLineBagIconProps {
  className?: string;
  size?: number | string;
  strokeWidth?: number;
}

/**
 * Minimalist Single-Line Bag Icon.
 * Features a pure stroke-based aesthetic (no fills or emojis) matching modern design systems.
 */
export const SingleLineBagIcon: React.FC<SingleLineBagIconProps> = ({
  className = "size-5",
  size = 20,
  strokeWidth = 1.75,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Top Handle / Strap */}
      <path d="M9 6.5V4.5C9 3.67 9.67 3 10.5 3H13.5C14.33 3 15 3.67 15 4.5V6.5" />
      {/* Main Bag Silhouette */}
      <rect x="3.5" y="6.5" width="17" height="14.5" rx="2.5" />
      {/* Bag Flap Divider */}
      <path d="M3.5 11.5H20.5" />
      {/* Flap Buckle / Lock Detail */}
      <path d="M10 11.5V14C10 14.55 10.45 15 11 15H13C13.55 15 14 14.55 14 14V11.5" />
      {/* Subtle Bottom Reinforcement Line */}
      <line x1="7" y1="18.5" x2="17" y2="18.5" opacity="0.4" />
    </svg>
  );
};

export default SingleLineBagIcon;
