import express from "express";
import {
  checkAvailability,
  registerUser,
  loginUser,
  refreshToken,
  logoutUser,
} from "../controllers/authController.js";

const router = express.Router();

// Auth Routes
router.post("/check", checkAvailability);
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refresh", refreshToken);
router.post("/logout", logoutUser);

export default router;