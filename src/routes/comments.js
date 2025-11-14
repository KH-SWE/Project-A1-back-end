import express from "express";
import { verifyToken } from "../utils/jwt.js";
import {
  createComment,
  getCommentsForPost,
  likeComment,
  unlikeComment,
  updateComment,
  deleteComment
} from "../controllers/commentsController.js";

const router = express.Router();

// CREATE
router.post("/", verifyToken, createComment);

// READ (comment tree)
router.get("/post/:postId", verifyToken, getCommentsForPost);

// LIKE / UNLIKE
router.post("/:id/like", verifyToken, likeComment);
router.post("/:id/unlike", verifyToken, unlikeComment);

// UPDATE / DELETE
router.patch("/:id", verifyToken, updateComment);
router.delete("/:id", verifyToken, deleteComment);

export default router;