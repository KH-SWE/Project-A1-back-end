import express from "express";
import { verifyToken } from "../utils/jwt.js";
import {
  getAllDiscussions,
  getDiscussionById,
  getDiscussionComments,
  getDiscussionsByUser,
  searchDiscussions
} from "../controllers/discussionsController.js";

const router = express.Router();

// GET all discussions
router.get("/", verifyToken, getAllDiscussions);

// SEARCH discussions
router.get("/search", verifyToken, searchDiscussions);

// GET discussion by ID
router.get("/:id", verifyToken, getDiscussionById);

// GET comments for a discussion
router.get("/:id/comments", verifyToken, getDiscussionComments);

// GET discussions by user
router.get("/user/:userId", verifyToken, getDiscussionsByUser);

export default router;
