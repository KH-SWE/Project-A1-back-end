import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  res.send("List of clubs");
});

router.post("/", (req, res) => {
  res.send("Create a new club");
});

export default router;

// Boilerplate code for clubs routes. To be implemented later.