import re

with open('src/components/visualizer/MonotonicStackVisualizer.tsx', 'r') as f:
    text = f.read()

target = """                  {activeSightlines.map((sight, sIdx) => {
                    const fromPct = ((sight.fromIdx + 0.5) / array.length) * 100;
                    const toPct = ((sight.toIdx + 0.5) / array.length) * 100;
                    const fromVal = array[sight.fromIdx] ?? 0;
                    const toVal = array[sight.toIdx] ?? 0;
                    const fromHeightPct = maxVal > 0 ? (fromVal / maxVal) * 65 : 40;
                    const toHeightPct = maxVal > 0 ? (toVal / maxVal) * 65 : 40;

                    // Compute vertical positions (SVG y increases downward; bottom is 90%, top is ~20%)
                    const y1 = `${Math.max(15, 88 - fromHeightPct)}%`;
                    const y2 = `${Math.max(15, 88 - toHeightPct)}%`;

                    const isHit = sight.resolved;
                    const strokeColor = isHit ? "#f59e0b" : "#10b981";

                    return (
                      <g key={sIdx}>
                        {/* Glow halo */}
                        <line
                          x1={`${fromPct}%`}
                          y1={y1}
                          x2={`${toPct}%`}
                          y2={y2}
                          stroke={strokeColor}
                          strokeWidth={6}
                          strokeOpacity={0.25}
                          strokeLinecap="round"
                        />
                        {/* Laser Ray Line */}
                        <line
                          x1={`${fromPct}%`}
                          y1={y1}
                          x2={`${toPct}%`}
                          y2={y2}
                          stroke={strokeColor}
                          strokeWidth={2.5}
                          strokeDasharray={isHit ? "4 3" : undefined}
                          markerEnd={isHit ? "url(#ray-head-resolved)" : "url(#ray-head-green)"}
                          filter="url(#ray-glow)"
                        />
                        {/* Midpoint Observation Label */}
                        <g transform={`translate(${(fromPct + toPct) / 2}%, 22)`}>"""

replacement = """                  {activeSightlines.map((sight, sIdx) => {
                    const fromX = barCenters[sight.fromIdx] ?? 0;
                    const toX = barCenters[sight.toIdx] ?? 0;
                    const fromVal = array[sight.fromIdx] ?? 0;
                    const toVal = array[sight.toIdx] ?? 0;
                    const fromHeightPct = maxVal > 0 ? (fromVal / maxVal) * 65 : 40;
                    const toHeightPct = maxVal > 0 ? (toVal / maxVal) * 65 : 40;

                    // Compute vertical positions (SVG y increases downward; bottom is 90%, top is ~20%)
                    const y1 = `${Math.max(15, 88 - fromHeightPct)}%`;
                    const y2 = `${Math.max(15, 88 - toHeightPct)}%`;

                    const isHit = sight.resolved;
                    const strokeColor = isHit ? "#f59e0b" : "#10b981";

                    return (
                      <g key={sIdx}>
                        {/* Glow halo */}
                        <line
                          x1={fromX}
                          y1={y1}
                          x2={toX}
                          y2={y2}
                          stroke={strokeColor}
                          strokeWidth={6}
                          strokeOpacity={0.25}
                          strokeLinecap="round"
                        />
                        {/* Laser Ray Line */}
                        <line
                          x1={fromX}
                          y1={y1}
                          x2={toX}
                          y2={y2}
                          stroke={strokeColor}
                          strokeWidth={2.5}
                          strokeDasharray={isHit ? "4 3" : undefined}
                          markerEnd={isHit ? "url(#ray-head-resolved)" : "url(#ray-head-green)"}
                          filter="url(#ray-glow)"
                        />
                        {/* Midpoint Observation Label */}
                        <g transform={`translate(${(fromX + toX) / 2}, 22)`}>"""

if target in text:
    with open('src/components/visualizer/MonotonicStackVisualizer.tsx', 'w') as f:
        f.write(text.replace(target, replacement))
    print("Patched!")
else:
    print("Target not found!")
