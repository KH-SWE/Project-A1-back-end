import express from "express";
import { verifyToken } from "../utils/jwt.js";
import {
  createPost,
  getPostById,
  getPostsByClub,
  getGlobalFeed,
  likePost,
  unlikePost,
  updatePost,
  deletePost
} from "../controllers/postsController.js";

const router = express.Router();

// CREATE
router.post("/", verifyToken, createPost);

// READ
router.get("/:id", verifyToken, getPostById);
router.get("/club/:clubId", verifyToken, getPostsByClub);
router.get("/feed/global", verifyToken, getGlobalFeed);

// LIKE / UNLIKE
router.post("/:id/like", verifyToken, likePost);
router.post("/:id/unlike", verifyToken, unlikePost);

// UPDATE / DELETE
router.patch("/:id", verifyToken, updatePost);
router.delete("/:id", verifyToken, deletePost);

export default router;