import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { User } from "../models/User.js";
import { CycleSettings } from "../models/CycleSettings.js";
import { config } from "../config/env.js";

// Validation schemas
export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    email: z.string().email("Invalid email address").toLowerCase().trim(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    defaultCycleLength: z.number().int().min(15).max(60).optional(),
    defaultPeriodDuration: z.number().int().min(1).max(15).optional()
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address").toLowerCase().trim(),
    password: z.string().min(1, "Password is required")
  })
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    themePreference: z.enum(["dark", "light", "system"]).optional(),
    isOnboarded: z.boolean().optional()
  })
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters")
  })
});

function generateToken(userId: string, email: string): string {
  return jwt.sign({ id: userId, email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as any
  });
}

function sendAuthResponse(res: Response, statusCode: number, user: any, cycleSettings: any, token: string): void {
  res.cookie("token", token, {
    httpOnly: true,
    secure: config.env === "production",
    sameSite: config.env === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.status(statusCode).json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isOnboarded: user.isOnboarded,
        themePreference: user.themePreference
      },
      cycleSettings: cycleSettings
        ? {
            defaultCycleLength: cycleSettings.defaultCycleLength,
            defaultPeriodDuration: cycleSettings.defaultPeriodDuration,
            reminderDaysBefore: cycleSettings.reminderDaysBefore,
            remindersEnabled: cycleSettings.remindersEnabled
          }
        : null
    }
  });
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, password, defaultCycleLength, defaultPeriodDuration } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(409).json({ success: false, message: "Email is already registered" });
      return;
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      passwordHash,
      isOnboarded: false
    });

    // Create default cycle settings for user
    const cycleSettings = await CycleSettings.create({
      userId: user._id,
      defaultCycleLength: defaultCycleLength || 28,
      defaultPeriodDuration: defaultPeriodDuration || 5
    });

    const token = generateToken(user._id.toString(), user.email);
    sendAuthResponse(res, 201, user, cycleSettings, token);
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ success: false, message: "Invalid email or password" });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: "Invalid email or password" });
      return;
    }

    const cycleSettings = await CycleSettings.findOne({ userId: user._id });
    const token = generateToken(user._id.toString(), user.email);
    sendAuthResponse(res, 200, user, cycleSettings, token);
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  res.clearCookie("token", {
    httpOnly: true,
    secure: config.env === "production",
    sameSite: config.env === "production" ? "none" : "lax"
  });
  res.status(200).json({ success: true, message: "Successfully logged out" });
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const cycleSettings = await CycleSettings.findOne({ userId: user._id });

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isOnboarded: user.isOnboarded,
          themePreference: user.themePreference
        },
        cycleSettings: cycleSettings
          ? {
              defaultCycleLength: cycleSettings.defaultCycleLength,
              defaultPeriodDuration: cycleSettings.defaultPeriodDuration,
              reminderDaysBefore: cycleSettings.reminderDaysBefore,
              remindersEnabled: cycleSettings.remindersEnabled
            }
          : null
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, themePreference, isOnboarded } = req.body;

    const updates: Partial<{ name: string; themePreference: "dark" | "light" | "system"; isOnboarded: boolean }> = {};
    if (name !== undefined) updates.name = name;
    if (themePreference !== undefined) updates.themePreference = themePreference;
    if (isOnboarded !== undefined) updates.isOnboarded = isOnboarded;

    const user = await User.findByIdAndUpdate(req.user!.id, updates, { new: true });
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isOnboarded: user.isOnboarded,
          themePreference: user.themePreference
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user!.id);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      res.status(400).json({ success: false, message: "Current password does not match" });
      return;
    }

    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
}
