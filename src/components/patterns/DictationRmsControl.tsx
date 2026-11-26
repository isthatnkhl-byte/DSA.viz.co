import React, { useEffect, useState } from "react";
import { Mic, MicOff } from "lucide-react";

interface DictationRmsBarsProps {
  active: boolean;
  subscribeVolume: (listener: (vol: number) => void) => () => void;
}

const BAR_WEIGHTS = [0.45, 0.72, 1, 0.85, 0.6];

const DictationRmsBars: React.FC<DictationRmsBarsProps> = ({
  active,
  subscribeVolume,
}) => {
  const [volume, setVolume] = useState(0);

  useEffect(() => {
    if (!active) {
      setVolume(0);
      return;
    }
    return subscribeVolume((v) => setVolume(v));
  }, [active, subscribeVolume]);

  if (!active) return null;

  return (
    <span
      aria-label={`Voice input level ${volume}%`}
      className="inline-flex items-end gap-[2px] h-3.5 px-1"
    >
      {BAR_WEIGHTS.map((weight, idx) => {
        const pct = Math.max(18, Math.min(100, Math.round(volume * weight)));
        return (
          <span
            key={idx}
            style={{ height: `${pct}%` }}
            className="w-[2.5px] bg-emerald-400 transition-[height] duration-75"
          />
        );
      })}
    </span>
  );
};

interface DictationRmsControlProps {
  targetId: string;
  activeTarget: string | null;
  interimText?: string;
  error?: string | null;
  disabled?: boolean;
  compact?: boolean;
  onToggle: (targetId: string) => void;
  subscribeVolume: (listener: (vol: number) => void) => () => void;
}

export const DictationRmsControl: React.FC<DictationRmsControlProps> = ({
  targetId,
  activeTarget,
  interimText,
  error,
  disabled = false,
  compact = false,
  onToggle,
  subscribeVolume,
}) => {
  const isActive = activeTarget === targetId;

  return (
    <div className="inline-flex items-center gap-1.5 max-w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onToggle(targetId)}
        title={isActive ? "Stop voice dictation" : "Dictate response with voice"}
        className={`inline-flex items-center gap-1.5 border font-mono text-[10px] font-bold uppercase tracking-[0.1em] transition-colors cursor-pointer disabled:opacity-40 ${
          compact ? "p-2" : "px-2.5 py-1"
        } ${
          isActive
            ? "border-emerald-500 bg-emerald-500/15 text-emerald-400"
            : "border-border bg-card text-muted-foreground hover:border-primary hover:text-primary"
        }`}
      >
        {isActive ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
        {!compact && <span>{isActive ? "Listening" : "Dictate"}</span>}
        <DictationRmsBars active={isActive} subscribeVolume={subscribeVolume} />
      </button>

      {isActive && interimText && !compact && (
        <span className="font-mono text-[10px] text-emerald-400/90 italic truncate max-w-[200px]">
          &ldquo;{interimText}&rdquo;
        </span>
      )}
      {error && !compact && !isActive && (
        <span className="font-mono text-[10px] text-rose-500 truncate max-w-[220px]">
          {error}
        </span>
      )}
    </div>
  );
};
