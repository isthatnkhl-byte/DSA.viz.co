import React from "react";
import { VizcoBuddy } from "./VizcoBuddy";

export { VizcoBuddy };

/**
 * Backward-compatible wrapper for GeminiChatTrigger, rendering the 3D floating Vizco Buddy companion
 */
export function GeminiChatTrigger() {
  return <VizcoBuddy />;
}
