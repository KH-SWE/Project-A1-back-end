import express from "express";
import { verifyToken } from "../utils/jwt.js";

import {
  getMajors,
  getFaculties,
  getTags,
  getStudyEnum,
  getClubEnum,
  updateUserProfile,
  getAllUsers,
  getUserById,
  createUser,
  loginUser,
  deleteUser,
  getMe
} from "../controllers/usersController.js";

const router = express.Router();

// ENUM + STATIC DATA
router.get("/majors", getMajors);
router.get("/faculties", getFaculties);
router.get("/tags", getTags);
router.get("/studyenum", getStudyEnum);
router.get("/clubenum", getClubEnum);

// USER PROFILE ACTIONS
router.patch("/update/:id", verifyToken, updateUserProfile);

// BASIC USER OPERATIONS
router.get("/all", getAllUsers);
router.get("/id/:id", getUserById);
router.post("/new", createUser);
router.post("/login", loginUser);
router.delete("/delete/:id", deleteUser);

// AUTHENTICATED SELF-LOOKUP
router.get("/me", verifyToken, getMe);

export default router;