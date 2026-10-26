import { Router } from "express";
import {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { deleteAccount } from "../controllers/settingsController.js";

export const authRouter = Router();

authRouter.post("/register", validate(registerSchema), register);
authRouter.post("/login", validate(loginSchema), login);
authRouter.post("/logout", logout);
authRouter.get("/me", requireAuth, getMe);
authRouter.patch("/profile", requireAuth, validate(updateProfileSchema), updateProfile);
authRouter.post("/change-password", requireAuth, validate(changePasswordSchema), changePassword);
authRouter.delete("/account", requireAuth, deleteAccount);
