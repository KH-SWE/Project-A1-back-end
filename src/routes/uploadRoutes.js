import express from "express";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { verifyToken } from "../utils/jwt.js"; // use the verifyToken from your utils

const router = express.Router();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  // credentials not required here if provided via environment/IAM role
});

router.post("/signed-url", verifyToken, async (req, res) => {
  try {
    const { fileName, fileType, folder } = req.body;

    if (!fileName || !fileType) {
      return res.status(400).json({ error: "fileName and fileType are required" });
    }

    const safeFolder = folder || "uploads";
    const timestamp = Date.now();
    const key = `${safeFolder}/${timestamp}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 }); // 60s
    const fileUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    return res.json({ uploadUrl, fileUrl });
  } catch (err) {
    console.error("Error generating signed URL:", err);
    return res.status(500).json({ error: "Failed to generate signed URL" });
  }
});

router.delete("/delete-file", verifyToken, async (req, res) => {
  try {
    const fileKey = req.query.fileKey;

    if (!fileKey) {
      return res.status(400).json({ error: "fileKey is required" });
    }

    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: fileKey,
    }));

    return res.json({ message: "File deleted successfully" });
  } catch (err) {
    console.error("Error deleting file:", err);
    return res.status(500).json({ error: "Failed to delete file" });
  }
});

export default router;