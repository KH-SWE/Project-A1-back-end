import express from "express";
import { verifyToken } from "../utils/jwt.js";
import { getResources } from "../controllers/resourcesController.js";

const router = express.Router();

router.get("/", verifyToken, getResources);

export default router;