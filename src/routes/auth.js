import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/jwt.js";

const router = express.Router();

// USER REGISTRATION
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // check if user exists
    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );
    if (existing.rows.length > 0)
      return res.status(400).json({ error: "Email already in use" });

    // hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // insert new user
    const result = await pool.query(
      "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email",
      [username, email, password_hash]
    );
    const user = result.rows[0];

    // issue tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // store refresh token in DB
    await pool.query(
    "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 days')",
    [user.id, refreshToken]
    );

    res.status(201).json({ user, accessToken, refreshToken });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// USER LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // find user
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: "User not found" });

    // compare password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid password" });

    // generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // store refresh token in DB
    await pool.query(
    "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 days')",
    [user.id, refreshToken]
    );

    res.status(200).json({
      user: { id: user.id, username: user.username, email: user.email },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(401).json({ error: "Missing refresh token" });

  try {
    // 1 - verify signature
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    // 2 - check DB to ensure token exists
    const result = await pool.query(
      "SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2",
      [refreshToken, decoded.user_id]
    );

    if (result.rows.length === 0)
      return res.status(403).json({ error: "Invalid or revoked refresh token" });

    // 3 - issue new access token
    const newAccessToken = generateAccessToken({
      id: decoded.user_id,
      email: decoded.email,
    });

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    console.error(err);
    res.status(403).json({ error: "Invalid or expired refresh token" });
  }
});

router.post("/logout", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(400).json({ error: "Missing refresh token" });

  await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [refreshToken]);
  res.json({ message: "Logged out successfully" });
});


export default router;