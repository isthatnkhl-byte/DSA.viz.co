import { useState, useMemo } from "react";
import { Calendar, Flame } from "lucide-react";

export function LeetCodeHeatmap({
  calendar,
  streak = 0,
  totalActiveDays = 0,
}: {
  calendar: Record<string, number>;
  streak?: number;
  totalActiveDays?: number;
}) {
  const [hoveredCell, setHoveredCell] = useState<any | null>(null);

  // Generate 52 weeks (7 days x 52 weeks) ending today
  const { weeks, totalSubmissionsYear, maxDaily } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: { date: Date; dateStr: string; timestampSec: number; count: number }[] = [];
    const totalDays = 52 * 7;

    let totalSubmissions = 0;
    let max = 0;

    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const timestampSec = Math.floor(d.getTime() / 1000);
      const dateStr = d.toISOString().split("T")[0] as string;

      // LeetCode calendar maps UNIX timestamp (seconds) to count
      // Also check exact timestamp or nearest within day
      let count = calendar[String(timestampSec)] || 0;
      if (!count) {
        // Search matching day in calendar keys
        for (const [k, v] of Object.entries(calendar)) {
          const keyNum = Number(k);
          if (Math.abs(keyNum - timestampSec) < 43200) {
            count = Number(v) || 0;
            break;
          }
        }
      }

      totalSubmissions += count;
      if (count > max) max = count;

      days.push({ date: d, dateStr, timestampSec, count });
    }

    const weekList: (typeof days)[] = [];
    for (let w = 0; w < 52; w++) {
      weekList.push(days.slice(w * 7, (w + 1) * 7));
    }

    return {
      weeks: weekList,
      totalSubmissionsYear: totalSubmissions,
      maxDaily: max,
    };
  }, [calendar]);

  function getIntensityClass(count: number) {
    if (count === 0) return "bg-muted/30 border-transparent hover:border-border";
    if (count <= 2) return "bg-emerald-500/40 border-emerald-500/50";
    if (count <= 5) return "bg-emerald-500/70 border-emerald-400";
    if (count <= 9) return "bg-emerald-400 border-emerald-300 shadow-xs shadow-emerald-400/40";
    return "bg-emerald-300 border-emerald-200 shadow-sm shadow-emerald-300/60";
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-background/60 p-4 shadow-sm backdrop-blur-sm relative">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2.5">
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-primary" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
            Submission Activity Heatmap (Past 12 Months)
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="text-muted-foreground">
            Total: <strong className="text-primary">{totalSubmissionsYear}</strong>
          </span>
          <span className="text-muted-foreground">
            Active: <strong className="text-emerald-400">{totalActiveDays}</strong> days
          </span>
          <span className="flex items-center gap-1 font-bold text-orange-400">
            <Flame className="size-3.5 fill-orange-400 text-orange-400" />
            <span>{streak} Day Streak</span>
          </span>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex gap-1 min-w-[620px] py-1">
          {weeks.map((week, wIdx) => (
            <div key={`w-${wIdx}`} className="flex flex-col gap-1">
              {week.map((day) => (
                <div
                  key={day.dateStr}
                  onMouseEnter={() => setHoveredCell(day)}
                  onMouseLeave={() => setHoveredCell(null)}
                  className={`size-[11px] rounded-[2px] border cursor-pointer transition-colors ${getIntensityClass(
                    day.count,
                  )}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {hoveredCell && (
        <div className="absolute -top-8 right-0 rounded-md border border-border/50 bg-popover/90 backdrop-blur-md px-2 py-1 text-xs font-mono shadow-md z-50 text-popover-foreground">
          <span className="font-bold text-emerald-400">{hoveredCell.count}</span> submissions on {hoveredCell.dateStr}
        </div>
      )}
    </div>
  );
}
