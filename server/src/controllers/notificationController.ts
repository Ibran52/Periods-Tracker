import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { config } from "../config/env.js";
import {
  isAllowedPushEndpoint,
  subscribe,
  unsubscribe,
  sendNotification
} from "../services/notificationService.js";
import { PushSubscription } from "../models/PushSubscription.js";

export const subscribeSchema = z.object({
  body: z.object({
    endpoint: z.string()
      .url("Valid push endpoint URL is required")
      .refine(isAllowedPushEndpoint, "Push endpoint must use an approved HTTPS push service"),
    keys: z.object({
      p256dh: z.string().min(1, "p256dh key is required"),
      auth: z.string().min(1, "auth key is required")
    }),
    timezone: z.string().optional()
  })
});

export const unsubscribeSchema = z.object({
  body: z.object({
    endpoint: z.string().url()
  })
});

export function getVapidPublicKey(_req: Request, res: Response): void {
  res.status(200).json({
    success: true,
    data: {
      publicKey: config.vapidPublicKey || null
    }
  });
}

export async function subscribeNotification(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { endpoint, keys, timezone } = req.body;
    const sub = await subscribe(req.user!.id, { endpoint, keys }, timezone || "UTC");

    res.status(201).json({
      success: true,
      message: "Push notification subscription registered successfully",
      data: sub
    });
  } catch (error: any) {
    if (error?.message?.includes("already registered to another user")) {
      res.status(409).json({
        success: false,
        message: "This push notification endpoint is already registered to another user."
      });
      return;
    }

    next(error);
  }
}

export async function unsubscribeNotification(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { endpoint } = req.body;
    const success = await unsubscribe(req.user!.id, endpoint);

    res.status(200).json({
      success,
      message: success
        ? "Push subscription removed successfully"
        : "Subscription not found"
    });
  } catch (error) {
    next(error);
  }
}

export async function sendTestNotification(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const subs = await PushSubscription.find({ userId: req.user!.id });
    if (subs.length === 0) {
      res.status(404).json({
        success: false,
        message: "No active push subscriptions found for this account"
      });
      return;
    }

    const payload = {
      title: "Veyora Test Notification",
      body: "Notifications are configured and working properly!",
      url: "/dashboard"
    };

    let delivered = 0;
    for (const sub of subs) {
      const ok = await sendNotification(sub, payload);
      if (ok) delivered++;
    }

    res.status(200).json({
      success: true,
      message: `Test notification sent to ${delivered} subscription(s)`
    });
  } catch (error) {
    next(error);
  }
}
