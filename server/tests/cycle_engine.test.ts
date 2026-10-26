import { describe, it, expect } from "vitest";
import {
  parseDate,
  formatDate,
  diffInDays,
  addDays,
  computeCycleStats
} from "../src/services/cycleService.js";
import { IPeriodLog } from "../src/models/PeriodLog.js";

describe("Phase 4: Baseline Period Prediction Engine & Date Arithmetic Unit Tests", () => {
  describe("Date Arithmetic & Leap Year Calculations", () => {
    it("handles leap year February (2024 is a leap year with Feb 29)", () => {
      const start = "2024-02-28";
      const nextDay = addDays(start, 1);
      expect(nextDay).toBe("2024-02-29");

      const twoDays = addDays(start, 2);
      expect(twoDays).toBe("2024-03-01");

      const diff = diffInDays("2024-02-28", "2024-03-01");
      expect(diff).toBe(2);
    });

    it("handles non-leap year February (2025 has 28 days)", () => {
      const start = "2025-02-28";
      const nextDay = addDays(start, 1);
      expect(nextDay).toBe("2025-03-01");

      const diff = diffInDays("2025-02-28", "2025-03-01");
      expect(diff).toBe(1);
    });

    it("handles month and year boundaries correctly", () => {
      // Month boundary: March 31 to April 1
      expect(addDays("2026-03-31", 1)).toBe("2026-04-01");
      expect(diffInDays("2026-03-31", "2026-04-01")).toBe(1);

      // Year boundary: December 30, 2025 + 28 days -> January 27, 2026
      expect(addDays("2025-12-30", 28)).toBe("2026-01-27");
      expect(diffInDays("2025-12-30", "2026-01-27")).toBe(28);

      // Reverse diff calculation
      expect(diffInDays("2026-01-27", "2025-12-30")).toBe(-28);
    });
  });

  describe("Cycle Length Computation & History Scenarios", () => {
    it("handles empty periods gracefully with defaults", () => {
      const stats = computeCycleStats([], 28, 5);
      expect(stats.completedCycles).toBe(0);
      expect(stats.cycleLengths).toEqual([]);
      expect(stats.medianCycleLength).toBe(28);
      expect(stats.averageCycleLength).toBe(28);
      expect(stats.latestPeriodStartDate).toBeNull();
      expect(stats.isIrregular).toBe(false);
    });

    it("handles a single recorded period without completed cycles", () => {
      const periods = [
        { startDate: "2026-05-01", endDate: "2026-05-05" } as IPeriodLog
      ];
      const stats = computeCycleStats(periods, 28, 5);
      expect(stats.completedCycles).toBe(0);
      expect(stats.latestPeriodStartDate).toBe("2026-05-01");
      expect(stats.lastPeriodDuration).toBe(5);
      expect(stats.medianCycleLength).toBe(28);
    });

    it("computes accurate median cycle length from regular history", () => {
      // 4 periods -> 3 cycle lengths: 28, 29, 30 days
      const periods = [
        { startDate: "2026-01-01", endDate: "2026-01-05" },
        { startDate: "2026-01-29", endDate: "2026-02-02" }, // 28 days
        { startDate: "2026-02-27", endDate: "2026-03-03" }, // 29 days (2026 is non-leap: Jan 29 + 29d)
        { startDate: "2026-03-29", endDate: "2026-04-02" }  // 30 days (Feb 27 + 30d: Feb 28 is 1d, +29d in March)
      ] as IPeriodLog[];

      const stats = computeCycleStats(periods);
      expect(stats.completedCycles).toBe(3);
      expect(stats.cycleLengths).toHaveLength(3);
      expect(stats.medianCycleLength).toBe(29);
      expect(stats.latestPeriodStartDate).toBe("2026-03-29");
      expect(stats.isIrregular).toBe(false);
    });

    it("filters out large gaps (> 60 days) caused by missed logging or pregnancy", () => {
      // Period 1: 2026-01-01
      // Period 2: 2026-01-29 (28 days) -> Valid cycle
      // Period 3: 2026-05-01 (92 days gap) -> Filtered out (> 60 days)
      // Period 4: 2026-05-30 (29 days) -> Valid cycle
      const periods = [
        { startDate: "2026-01-01" },
        { startDate: "2026-01-29" },
        { startDate: "2026-05-01" },
        { startDate: "2026-05-30" }
      ] as IPeriodLog[];

      const stats = computeCycleStats(periods);
      expect(stats.completedCycles).toBe(2);
      expect(stats.cycleLengths).toEqual([28, 29]);
      expect(stats.medianCycleLength).toBe(28.5);
    });

    it("detects irregularity when cycle variance is high or intervals exceed biological thresholds", () => {
      // High variability: 21 days, 42 days, 22 days
      const periods = [
        { startDate: "2026-01-01" },
        { startDate: "2026-01-22" }, // 21 days
        { startDate: "2026-03-05" }, // 42 days
        { startDate: "2026-03-27" }  // 22 days
      ] as IPeriodLog[];

      const stats = computeCycleStats(periods);
      expect(stats.completedCycles).toBe(3);
      expect(stats.isIrregular).toBe(true);
    });

    it("sorts entries chronologically even if provided out of order", () => {
      const unsorted = [
        { startDate: "2026-03-01" },
        { startDate: "2026-01-01" },
        { startDate: "2026-01-29" }
      ] as IPeriodLog[];

      const stats = computeCycleStats(unsorted);
      expect(stats.latestPeriodStartDate).toBe("2026-03-01");
      expect(stats.completedCycles).toBe(2);
      expect(stats.cycleLengths[0]).toBe(28);
    });

    it("handles exactly one completed cycle interval (regular vs irregular)", () => {
      // 1 regular interval (28 days)
      const reg = [
        { startDate: "2026-01-01", endDate: "2026-01-05" },
        { startDate: "2026-01-29", endDate: "2026-02-02" }
      ] as IPeriodLog[];
      const regStats = computeCycleStats(reg);
      expect(regStats.completedCycles).toBe(1);
      expect(regStats.cycleLengths).toEqual([28]);
      expect(regStats.averageCycleLength).toBe(28);
      expect(regStats.medianCycleLength).toBe(28);
      expect(regStats.stdCycleLength).toBe(0);
      expect(regStats.isIrregular).toBe(false);

      // 1 irregular short interval (20 days: < 21d threshold)
      const irreg = [
        { startDate: "2026-10-06", endDate: "2026-10-10" },
        { startDate: "2026-10-26" }
      ] as IPeriodLog[];
      const irregStats = computeCycleStats(irreg);
      expect(irregStats.completedCycles).toBe(1);
      expect(irregStats.cycleLengths).toEqual([20]);
      expect(irregStats.averageCycleLength).toBe(20);
      expect(irregStats.medianCycleLength).toBe(20);
      expect(irregStats.stdCycleLength).toBe(0);
      expect(irregStats.isIrregular).toBe(true);
    });

    it("handles overlapping periods and deduplicates identical start dates", () => {
      const periodsWithOverlap = [
        { startDate: "2026-10-06", endDate: "2026-11-11" }, // Typo in end date extending past next period
        { startDate: "2026-10-06", endDate: "2026-10-10" }, // Duplicate start date
        { startDate: "2026-10-26", endDate: null }
      ] as IPeriodLog[];

      const stats = computeCycleStats(periodsWithOverlap);
      expect(stats.completedCycles).toBe(1);
      expect(stats.cycleLengths).toEqual([20]);
      expect(stats.latestPeriodStartDate).toBe("2026-10-26");
      // Overlapping duration was safely clamped so it does not exceed next start date
      expect(stats.averagePeriodDuration).toBeLessThanOrEqual(15);
    });
  });
});
