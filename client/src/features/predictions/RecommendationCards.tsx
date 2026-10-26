import React from "react";
import { Utensils, Activity, Sparkles, Droplet, Moon, Heart } from "lucide-react";

interface RecommendationCardsProps {
  phase: "Menstruation" | "Follicular" | "Ovulation" | "Luteal" | string;
  onOpenJournal?: () => void;
}

export function RecommendationCards({ phase, onOpenJournal }: RecommendationCardsProps) {
  // Clinically appropriate and wellness-oriented advice per phase
  const tipsByPhase: Record<string, { nutrition: string; activity: string; focus: string }> = {
    Menstruation: {
      nutrition: "Add iron-rich foods, leafy greens, and drink plenty of warm water.",
      activity: "Choose gentle restorative yoga, pelvic stretches, or a light walk.",
      focus: "Replenish & Rest"
    },
    Follicular: {
      nutrition: "Focus on vibrant fresh veggies, complex carbs, and lean proteins.",
      activity: "Rising estrogen boosts stamina — ideal for cardio and strength building.",
      focus: "Renew Energy"
    },
    Ovulation: {
      nutrition: "Incorporate antioxidant-rich berries, zinc, fiber, and hydrating foods.",
      activity: "Peak vitality — great time for high-intensity training and personal bests.",
      focus: "Peak Vitality"
    },
    Luteal: {
      nutrition: "Enjoy magnesium-rich dark chocolate, root vegetables, and herbal teas.",
      activity: "Ease into pilates, gentle swimming, and restorative mindful rest.",
      focus: "Soothe & Ground"
    }
  };

  const current = tipsByPhase[phase] || tipsByPhase.Menstruation;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Today's recommendation
        </h3>
        {onOpenJournal && (
          <button
            type="button"
            onClick={onOpenJournal}
            className="text-xs font-semibold text-[#8A7890] hover:text-[#503750] transition-colors"
          >
            See All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Nutrition Card */}
        <div className="rounded-3xl p-4 sm:p-5 border transition-all hover:shadow-soft flex items-start gap-3.5 bg-white/90 border-[#EFE4EC]">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-[#FDEEF4] text-[#E05A8D]">
            <Utensils className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-[#302337]">Nutrition</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FAF0F5] text-[#E05A8D]">
                {phase}
              </span>
            </div>
            <p className="text-xs text-[#8A7890] leading-relaxed">
              {current.nutrition}
            </p>
          </div>
        </div>

        {/* Activity Card */}
        <div className="rounded-3xl p-4 sm:p-5 border transition-all hover:shadow-soft flex items-start gap-3.5 bg-white/90 border-[#EFE4EC]">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-[#FFF2EE] text-[#F69988]">
            <Activity className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-[#302337]">Activity</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FFF2EE] text-[#F69988]">
                {current.focus}
              </span>
            </div>
            <p className="text-xs text-[#8A7890] leading-relaxed">
              {current.activity}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
