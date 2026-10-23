import React from "react";
import { Loader2 } from "lucide-react";

export function RouteLoadingFallback({
  title = "Loading page...",
  description = "Preparing visualizer & interactive workbench...",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-3 px-4 py-20 text-center animate-in fade-in duration-300"
    >
      <div className="relative flex items-center justify-center">
        <div className="size-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        <Loader2 className="absolute size-4 text-primary animate-pulse" />
      </div>
      <h2 className="text-base font-semibold text-foreground tracking-tight">{title}</h2>
      {description && (
        <p className="text-xs text-muted-foreground max-w-sm">{description}</p>
      )}
    </div>
  );
}
