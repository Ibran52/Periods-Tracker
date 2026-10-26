import { Request, Response, NextFunction } from "express";
import { config } from "../config/env.js";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Handle duplicate key error (MongoDB 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "record";
    res.status(409).json({
      success: false,
      message: `A entry with this ${field} already exists.`
    });
    return;
  }

  // Handle invalid ObjectId cast error
  if (err.name === "CastError") {
    res.status(400).json({
      success: false,
      message: "Invalid resource identifier format"
    });
    return;
  }

  const statusCode = err.statusCode || err.status || 500;
  if (statusCode >= 500) {
    console.error(`[api-error] status=${statusCode} type=${err.name || "UnknownError"}`);
  }
  const message = statusCode >= 500 && config.env !== "development"
    ? "Internal server error"
    : err.message || "Internal server error";

  res.status(statusCode).json({
    success: false,
    message,
    ...(config.env === "development" && { stack: err.stack })
  });
}
