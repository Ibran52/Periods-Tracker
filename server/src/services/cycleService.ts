import { IPeriodLog } from "../models/PeriodLog.js";

export interface CycleStats {
  completedCycles: number;
  cycleLengths: number[];
  averageCycleLength: number;
  medianCycleLength: number;
  stdCycleLength: number;
  averagePeriodDuration: number;
  isIrregular: boolean;
  lastCycleLength: number | null;
  lastPeriodDuration: number | null;
  latestPeriodStartDate: string | null;
}

export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function diffInDays(d1: string | Date, d2: string | Date): number {
  const date1 = typeof d1 === "string" ? parseDate(d1) : d1;
  const date2 = typeof d2 === "string" ? parseDate(d2) : d2;
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((date2.getTime() - date1.getTime()) / msPerDay);
}

export function addDays(dateStr: string, days: number): string {
  const date = parseDate(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(date);
}

export function computeCycleStats(
  periods: IPeriodLog[],
  defaultCycleLength = 28,
  defaultPeriodDuration = 5
): CycleStats {
  if (!periods || periods.length === 0) {
    return {
      completedCycles: 0,
      cycleLengths: [],
      averageCycleLength: defaultCycleLength,
      medianCycleLength: defaultCycleLength,
      stdCycleLength: 0,
      averagePeriodDuration: defaultPeriodDuration,
      isIrregular: false,
      lastCycleLength: null,
      lastPeriodDuration: null,
      latestPeriodStartDate: null
    };
  }

  // Deduplicate and ensure chronological order
  const uniqueMap = new Map<string, IPeriodLog>();
  for (const p of periods) {
    if (p.startDate && !uniqueMap.has(p.startDate)) {
      uniqueMap.set(p.startDate, p);
    }
  }

  const sorted = Array.from(uniqueMap.values()).sort(
    (a, b) => parseDate(a.startDate).getTime() - parseDate(b.startDate).getTime()
  );

  const cycleLengths: number[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const days = diffInDays(sorted[i].startDate, sorted[i + 1].startDate);
    // Biological filter: realistic menstrual cycle is 15-60 days
    if (days >= 15 && days <= 60) {
      cycleLengths.push(days);
    }
  }

  // Calculate durations for completed periods (safely preventing overlapping bleeding into next start)
  const durations: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    if (p.endDate && p.endDate >= p.startDate) {
      const nextStart = i + 1 < sorted.length ? sorted[i + 1].startDate : null;
      let effectiveEnd = p.endDate;
      if (nextStart && effectiveEnd >= nextStart) {
        effectiveEnd = addDays(nextStart, -1);
      }
      const dur = diffInDays(p.startDate, effectiveEnd) + 1;
      if (dur >= 1 && dur <= 15) {
        durations.push(dur);
      }
    }
  }

  const latestPeriod = sorted[sorted.length - 1];
  let lastPeriodDuration: number | null = null;
  if (latestPeriod.endDate && latestPeriod.endDate >= latestPeriod.startDate) {
    const dur = diffInDays(latestPeriod.startDate, latestPeriod.endDate) + 1;
    if (dur >= 1 && dur <= 15) {
      lastPeriodDuration = dur;
    }
  }

  if (cycleLengths.length === 0) {
    return {
      completedCycles: 0,
      cycleLengths: [],
      averageCycleLength: defaultCycleLength,
      medianCycleLength: defaultCycleLength,
      stdCycleLength: 0,
      averagePeriodDuration: durations.length > 0 ? average(durations) : defaultPeriodDuration,
      isIrregular: false,
      lastCycleLength: null,
      lastPeriodDuration,
      latestPeriodStartDate: latestPeriod.startDate
    };
  }

  const avg = average(cycleLengths);
  const med = median(cycleLengths);
  const std = standardDeviation(cycleLengths);
  const isIrregular = cycleLengths.length >= 2
    ? (std >= 7 || cycleLengths.some((l) => l < 21 || l > 38))
    : (cycleLengths[0] < 21 || cycleLengths[0] > 38);

  return {
    completedCycles: cycleLengths.length,
    cycleLengths,
    averageCycleLength: Math.round(avg * 10) / 10,
    medianCycleLength: Math.round(med * 10) / 10,
    stdCycleLength: Math.round(std * 10) / 10,
    averagePeriodDuration: durations.length > 0 ? Math.round(average(durations) * 10) / 10 : defaultPeriodDuration,
    isIrregular,
    lastCycleLength: cycleLengths[cycleLengths.length - 1],
    lastPeriodDuration,
    latestPeriodStartDate: latestPeriod.startDate
  };
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function standardDeviation(nums: number[]): number {
  if (nums.length <= 1) return 0;
  const avg = average(nums);
  const variance = nums.reduce((sum, n) => sum + Math.pow(n - avg, 2), 0) / nums.length;
  return Math.sqrt(variance);
}
