import React from "react";
import { Check } from "lucide-react";

interface DayStripProps {
  currentCycleDay: number;
  totalDays: number;
  onSelectDay?: (day: number) => void;
  selectedDay?: number;
}

export function DayStrip({
  currentCycleDay,
  totalDays,
  onSelectDay,
  selectedDay
}: DayStripProps) {
  // Show a window of 6 days centered around current cycle day
  const activeDay = selectedDay || currentCycleDay || 1;
  const startDay = Math.max(1, activeDay - 2);
  const daysToShow = Array.from({ length: 6 }, (_, i) => startDay + i).filter(
    (d) => d <= Math.max(totalDays, activeDay + 3)
  );

  return (
    <div className="w-full overflow-x-auto no-scrollbar py-1">
      <div className="flex items-center justify-between gap-2 min-w-full px-1">
        {daysToShow.map((dayNum) => {
          const isToday = dayNum === currentCycleDay;
          const isPast = dayNum < currentCycleDay;
          const isSelected = dayNum === activeDay;

          if (isToday) {
            return (
              <button
                key={dayNum}
                type="button"
                onClick={() => onSelectDay && onSelectDay(dayNum)}
                className="flex-1 flex flex-col items-center justify-center py-2 px-3 rounded-2xl bg-[#503750] text-white shadow-plum border border-[#503750] min-w-[56px] transition-transform active:scale-95"
              >
                <span className="text-[10px] uppercase font-bold tracking-wider text-pink-200">
                  Today
                </span>
                <div className="w-5 h-5 rounded-full border-2 border-white/80 flex items-center justify-center mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              </button>
            );
          }

          return (
            <button
              key={dayNum}
              type="button"
              onClick={() => onSelectDay && onSelectDay(dayNum)}
              className={`flex-1 flex flex-col items-center justify-center py-2 px-2.5 rounded-2xl border min-w-[52px] transition-all ${
                isSelected
                  ? "bg-[#FAF2F7] border-[#D985B7] text-[#503750] font-bold"
                  : "bg-white/80 hover:bg-white border-[#EFE4EC] text-[#8A7890]"
              }`}
            >
              <span className="text-[10px] font-semibold text-[#8A7890]">
                Day {dayNum}
              </span>
              <div className="w-5 h-5 rounded-full flex items-center justify-center mt-0.5">
                {isPast ? (
                  <div className="w-4 h-4 rounded-full bg-[#FAF0F5] border border-[#EBDDE7] flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-[#503750]" />
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-[#A697AB]">
                    {dayNum}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
