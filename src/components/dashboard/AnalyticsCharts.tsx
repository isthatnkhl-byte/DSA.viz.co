import { useMemo } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { type Submission } from "@/lib/submissions.functions";
import { problems } from "@/lib/problems";
import { Flame, Trophy, Calendar } from "lucide-react";

export function AnalyticsCharts({ submissions }: { submissions: Submission[] }) {
  const stats = useMemo(() => {
    // 1. Topic Proficiency
    const topicCounts: Record<string, number> = {};
    const daysSet = new Set<string>();

    submissions.forEach((s) => {
      // Find problem to get topics
      const prob = problems.find((p) => p.slug === s.slug);
      if (prob && prob.topics) {
        prob.topics.forEach((t) => {
          topicCounts[t] = (topicCounts[t] || 0) + 1;
        });
      }
      
      const dateStr = new Date(s.createdAt || s.created_at || "").toISOString().split("T")[0] as string;
      daysSet.add(dateStr);
    });

    const sortedTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([subject, A]) => ({ subject, A }));

    // If no topics yet, add placeholders
    if (sortedTopics.length < 3) {
      ["Array", "String", "Hash Table", "Dynamic Programming", "Math"].forEach(t => {
        if (!sortedTopics.find(x => x.subject === t)) {
          sortedTopics.push({ subject: t, A: 0 });
        }
      });
    }

    // 2. Streaks Calculation
    const sortedDays = Array.from(daysSet).sort();
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const todayStr = new Date().toISOString().split("T")[0] as string;
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split("T")[0] as string;

    for (let i = 0; i < sortedDays.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const d1 = new Date(sortedDays[i - 1] as string);
        const d2 = new Date(sortedDays[i] as string);
        const diffDays = Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }
    
    // Check if current streak is active
    if (sortedDays.includes(todayStr)) {
       // streak is active up to today
       // we need to count backwards from today
       let streak = 0;
       let currDate = new Date();
       while (sortedDays.includes((currDate.toISOString().split("T")[0] as string))) {
          streak++;
          currDate.setDate(currDate.getDate() - 1);
       }
       currentStreak = streak;
    } else if (sortedDays.includes(yesterdayStr)) {
       // streak active up to yesterday
       let streak = 0;
       let currDate = yesterdayDate;
       while (sortedDays.includes((currDate.toISOString().split("T")[0] as string))) {
          streak++;
          currDate.setDate(currDate.getDate() - 1);
       }
       currentStreak = streak;
    } else {
       currentStreak = 0;
    }

    // 3. Heatmap Data (Last 90 days)
    const heatmap = [];
    const heatmapDate = new Date();
    heatmapDate.setDate(heatmapDate.getDate() - 89);
    for (let i = 0; i < 90; i++) {
      const dateStr = heatmapDate.toISOString().split("T")[0] as string;
      const count = submissions.filter(
        (s) => (new Date(s.createdAt || s.created_at || "").toISOString().split("T")[0] as string) === dateStr
      ).length;
      heatmap.push({ date: dateStr, count });
      heatmapDate.setDate(heatmapDate.getDate() + 1);
    }

    return { sortedTopics, currentStreak, longestStreak, heatmap };
  }, [submissions]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {/* Streaks Card */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card/75 p-5 shadow-sm backdrop-blur-sm">
        <h3 className="flex items-center gap-2 font-mono text-sm font-bold uppercase tracking-wider text-muted-foreground">
          <Flame className="size-4 text-orange-500" /> Consistency
        </h3>
        <div className="flex items-center justify-between mt-2">
          <div>
            <p className="text-3xl font-black text-foreground">{stats.currentStreak}</p>
            <p className="text-xs font-mono text-muted-foreground">Current Streak</p>
          </div>
          <div>
            <p className="text-3xl font-black text-foreground">{stats.longestStreak}</p>
            <p className="text-xs font-mono text-muted-foreground">Longest Streak</p>
          </div>
        </div>
      </div>

      {/* Heatmap Card */}
      <div className="md:col-span-2 rounded-2xl border border-border/80 bg-card/75 p-5 shadow-sm backdrop-blur-sm flex flex-col justify-between overflow-hidden">
        <h3 className="flex items-center gap-2 font-mono text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
          <Calendar className="size-4 text-primary" /> Activity Heatmap
        </h3>
        <div className="flex flex-wrap gap-1 md:gap-1.5 h-full items-end">
          {stats.heatmap.map((d, i) => {
            const intensity =
              d.count === 0
                ? "bg-muted/30"
                : d.count < 2
                ? "bg-primary/40"
                : d.count < 4
                ? "bg-primary/70"
                : "bg-primary";
            return (
              <div
                key={i}
                title={`${d.count} submissions on ${d.date}`}
                className={`size-3 md:size-3.5 rounded-sm ${intensity} transition-colors hover:border hover:border-foreground/50 cursor-crosshair`}
              />
            );
          })}
        </div>
      </div>

      {/* Radar Chart Card */}
      <div className="md:col-span-3 rounded-2xl border border-border/80 bg-card/75 p-5 shadow-sm backdrop-blur-sm">
        <h3 className="flex items-center gap-2 font-mono text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
          <Trophy className="size-4 text-yellow-500" /> Topic Proficiency
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={stats.sortedTopics}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontFamily: "monospace" }} />
              <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
              <Radar
                name="Solved"
                dataKey="A"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                itemStyle={{ color: 'hsl(var(--primary))', fontWeight: 'bold' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
