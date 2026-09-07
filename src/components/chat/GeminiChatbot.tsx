import React from "react";
import { VizcoCloudChatbox } from "./VizcoCloudChatbox";

export { VizcoCloudChatbox };

/**
 * Backward-compatible wrapper for GeminiChatbot, rendering the cloud-themed VizcoCloudChatbox
 */
export function GeminiChatbot() {
  return <VizcoCloudChatbox />;
}
