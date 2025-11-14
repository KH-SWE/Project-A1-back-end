import express from "express";
import { verifyToken } from "../utils/jwt.js";
import {
  generateUploadUrl,
  deleteFile
} from "../controllers/uploadsController.js";

const router = express.Router();

router.post("/signed-url", verifyToken, generateUploadUrl);
router.delete("/delete-file", verifyToken, deleteFile);

export default router;