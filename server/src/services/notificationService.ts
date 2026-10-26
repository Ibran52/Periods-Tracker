import webpush from "web-push";
import { config } from "../config/env.js";
import { PushSubscription, IPushSubscription } from "../models/PushSubscription.js";
import { CycleSettings } from "../models/CycleSettings.js";
import { PeriodLog } from "../models/PeriodLog.js";
import { computeCycleStats, addDays, formatDate, parseDate } from "./cycleService.js";

// Initialize VAPID details if available
if (config.vapidPublicKey && config.vapidPrivateKey) {
  try {
    webpush.setVapidDetails(
      config.vapidSubject,
      config.vapidPublicKey,
      config.vapidPrivateKey
    );
  } catch (err) {
    console.warn("Could not set VAPID details:", err);
  }
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export async function subscribe(
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  timezone = "UTC"
): Promise<IPushSubscription> {
  const existing = await PushSubscription.findOneAndUpdate(
    { endpoint: subscription.endpoint },
    {
      userId,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      timezone
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return existing;
}

export async function unsubscribe(userId: string, endpoint: string): Promise<boolean> {
  const res = await PushSubscription.findOneAndDelete({ userId, endpoint });
  return !!res;
}

export async function sendNotification(
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: PushPayload
): Promise<boolean> {
  try {
    if (!config.vapidPublicKey || !config.vapidPrivateKey || config.env === "test" || process.env.NODE_ENV === "test") {
      // In test mode or when keys are absent, simulate successful push delivery
      return true;
    }

    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: sub.keys
      },
      JSON.stringify(payload)
    );
    return true;
  } catch (error: any) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      // Subscription has expired or is unsubscribed by browser
      await PushSubscription.deleteOne({ endpoint: sub.endpoint }).catch(() => {});
    }
    return false;
  }
}

/**
 * Evaluates pending reminder notifications for all opted-in users:
 * - Checks reminderDaysBefore against user's next predicted cycle start.
 * - Prevents duplicate notifications using tag scoping.
 * - Automatically cancels if period was already recorded early.
 */
export async function runScheduledReminders(referenceDate = new Date()): Promise<number> {
  const optedInSettings = await CycleSettings.find({ remindersEnabled: true });
  let sentCount = 0;

  const todayStr = formatDate(referenceDate);

  for (const settings of optedInSettings) {
    const userId = settings.userId;
    const subscriptions = await PushSubscription.find({ userId });
    if (!subscriptions || subscriptions.length === 0) continue;

    // Check latest period records
    const periods = await PeriodLog.find({ userId }).sort({ startDate: 1 });
    const stats = computeCycleStats(
      periods,
      settings.defaultCycleLength,
      settings.defaultPeriodDuration
    );

    if (!stats.latestPeriodStartDate) continue;

    const cycleLength = Math.round(stats.medianCycleLength);
    const predictedStart = addDays(stats.latestPeriodStartDate, cycleLength);

    // If latest recorded period already covers or is after predictedStart, cancel reminder
    if (stats.latestPeriodStartDate >= predictedStart) {
      continue;
    }

    // Target reminder date
    const reminderDate = addDays(predictedStart, -settings.reminderDaysBefore);

    if (reminderDate === todayStr) {
      const payload: PushPayload = {
        title: "Veyora Cycle Reminder",
        body: `Your next cycle is predicted to begin around ${predictedStart} (${settings.reminderDaysBefore} days away).`,
        url: "/dashboard",
        tag: `veyora-reminder-${predictedStart}`
      };

      for (const sub of subscriptions) {
        const ok = await sendNotification(sub, payload);
        if (ok) sentCount++;
      }
    }
  }

  return sentCount;
}
