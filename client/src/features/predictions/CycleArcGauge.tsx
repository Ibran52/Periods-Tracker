import React from "react";

interface CycleArcGaugeProps {
  currentDay: number;
  totalDays: number;
  phaseName: string;
  isOverdue?: boolean;
}

export function CycleArcGauge({
  currentDay,
  totalDays,
  phaseName,
  isOverdue = false
}: CycleArcGaugeProps) {
  const safeTotal = Math.max(1, totalDays);
  // Clamped progress for pointer along the arc (0 to 1)
  const clampedDay = Math.min(safeTotal, Math.max(1, currentDay));
  const progressRatio = (clampedDay - 1) / (safeTotal - 1 || 1);

  // Arc angles: from 145 degrees (bottom left) to 395 degrees (bottom right) -> span 250 degrees
  const startAngle = 145;
  const totalAngleSpan = 250;
  const currentAngle = startAngle + progressRatio * totalAngleSpan;

  const cx = 170;
  const cy = 150;
  const r = 110;
  const strokeWidth = 14;

  // 4 Phase segments
  // Menstruation ~ 5/28 (~18%)
  // Follicular ~ 8/28 (~29%)
  // Ovulation ~ 4/28 (~14%)
  // Luteal ~ 11/28 (~39%)
  const phases = [
    { name: "Menstruation", color: "#E05A8D", spanRatio: 0.18 },
    { name: "Follicular phase", color: "#F69988", spanRatio: 0.29 },
    { name: "Ovulation", color: "#D884B6", spanRatio: 0.14 },
    { name: "Luteal phase", color: "#9D72BE", spanRatio: 0.39 },
  ];

  // Helper to calculate arc path for a segment
  let accumulatedRatio = 0;
  const gapAngle = 4; // subtle gap between segments

  const segments = phases.map((phase) => {
    const segStartAngle = startAngle + accumulatedRatio * totalAngleSpan + gapAngle / 2;
    const segEndAngle = startAngle + (accumulatedRatio + phase.spanRatio) * totalAngleSpan - gapAngle / 2;
    accumulatedRatio += phase.spanRatio;

    const startRad = (segStartAngle * Math.PI) / 180;
    const endRad = (segEndAngle * Math.PI) / 180;

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);

    const largeArcFlag = segEndAngle - segStartAngle <= 180 ? 0 : 1;
    const pathData = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2}`;

    return {
      ...phase,
      pathData,
    };
  });

  // Calculate pointer position (on the outer edge of the arc)
  const pointerRad = (currentAngle * Math.PI) / 180;
  const pointerR = r + 1;
  const px = cx + pointerR * Math.cos(pointerRad);
  const py = cy + pointerR * Math.sin(pointerRad);
  // Triangle pointing inwards toward center
  const angleDeg = currentAngle;

  return (
    <div className="flex flex-col items-center select-none py-2">
      <div className="relative w-72 h-52 sm:w-80 sm:h-56 flex items-center justify-center">
        <svg
          viewBox="0 0 340 230"
          className="w-full h-full overflow-visible drop-shadow-sm"
        >
          {/* Subtle background track */}
          <path
            d={`M ${cx + r * Math.cos((startAngle * Math.PI) / 180)} ${
              cy + r * Math.sin((startAngle * Math.PI) / 180)
            } A ${r} ${r} 0 1 1 ${
              cx + r * Math.cos(((startAngle + totalAngleSpan) * Math.PI) / 180)
            } ${cy + r * Math.sin(((startAngle + totalAngleSpan) * Math.PI) / 180)}`}
            fill="none"
            stroke="rgba(235, 220, 230, 0.4)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Render 4 phase segments */}
          {segments.map((seg, idx) => (
            <path
              key={idx}
              d={seg.pathData}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          ))}

          {/* Indicator Marker / Pointer */}
          <g transform={`translate(${px}, ${py}) rotate(${angleDeg - 90})`}>
            {/* Soft glow behind indicator */}
            <circle cx="0" cy="0" r="10" fill="rgba(80, 55, 80, 0.15)" />
            {/* Sleek plum pointer triangle */}
            <polygon
              points="0,-12 8,6 -8,6"
              fill="#503750"
              stroke="#FFFFFF"
              strokeWidth="2"
              className="drop-shadow-md"
            />
          </g>
        </svg>

        {/* Center Text inside Arc */}
        <div className="absolute top-24 sm:top-26 flex flex-col items-center text-center">
          <span className="text-3xl sm:text-4xl font-black tracking-tight text-[#302337] dark:text-[#FAF3F8]">
            Day {currentDay}
          </span>
          <span className="text-xs sm:text-sm font-semibold mt-0.5 tracking-wide text-[#8A7890] dark:text-[#B3A2B7]">
            {phaseName} {phaseName.toLowerCase().includes("phase") ? "" : "Phase"}
          </span>
          {isOverdue && (
            <span className="mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-500 border border-rose-500/20">
              {currentDay - safeTotal}d overdue
            </span>
          )}
        </div>
      </div>

      {/* 4-Phase Legend directly below Arc */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap mt-1 text-[11px] sm:text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
        {phases.map((p) => (
          <div key={p.name} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
              style={{ backgroundColor: p.color }}
            />
            <span>{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
