import express from "express";
import { verifyToken } from "../utils/jwt.js";
import {
  getAllClubs,
  getClubById,
  createClub,
  joinClub,
  leaveClub,
  getClubMembers
} from "../controllers/clubsController.js";

const router = express.Router();

// CLUB DIRECTORY + DETAIL
router.get("/", verifyToken, getAllClubs);
router.get("/:id", verifyToken, getClubById);

// CREATE CLUB
router.post("/", verifyToken, createClub);

// MEMBERSHIP
router.post("/:id/join", verifyToken, joinClub);
router.post("/:id/leave", verifyToken, leaveClub);

// MEMBER LIST
router.get("/:id/members", verifyToken, getClubMembers);

export default router;