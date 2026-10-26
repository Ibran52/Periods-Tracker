import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";

interface JwtPayload {
  id: string;
  email: string;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    let token: string | undefined;

    // Check cookie first
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Invalid or expired authentication token" });
  }
}
