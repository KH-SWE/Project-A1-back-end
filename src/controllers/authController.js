import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/jwt.js";

/* ----------------------------------------
   CHECK USERNAME / EMAIL AVAILABILITY
----------------------------------------- */
export const checkAvailability = async (req, res) => {
  const { username, email } = req.body;

  try {
    if (username) {
      const u = await pool.query(
        "SELECT id FROM users WHERE username = $1",
        [username]
      );
      if (u.rows.length > 0)
        return res.status(200).json({ available: false, field: "username" });
    }

    if (email) {
      const e = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );
      if (e.rows.length > 0)
        return res.status(200).json({ available: false, field: "email" });
    }

    return res.status(200).json({ available: true });
  } catch (err) {
    console.error("Check availability error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* ----------------------------------------
   REGISTER USER
----------------------------------------- */
export const registerUser = async (req, res) => {
  const {
    username,
    firstName,
    lastName,
    email,
    password,
    bio,
    avatarUrl,
    twitterUrl,
    instagramUrl,
    discordUrl,
    linkedinUrl,
    major,
    faculty,
    studyYear,
    studyStatus,
    clubStatus,
  } = req.body;

  try {
    // Check duplicate email
    const emailExist = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );
    if (emailExist.rows.length > 0)
      return res.status(400).json({ error: "Email already in use" });

    // Check duplicate username
    const usernameExist = await pool.query(
      "SELECT id FROM users WHERE username = $1",
      [username]
    );
    if (usernameExist.rows.length > 0)
      return res.status(400).json({ error: "Username already in use" });

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert new user
    const result = await pool.query(
      `INSERT INTO users (
        username, first_name, last_name, email, password_hash,
        bio, avatar_url, twitter_url, instagram_url,
        discord_url, linkedin_url, major, faculty,
        study_year, study_status, club_status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING id, username, email`,
      [
        username, firstName, lastName, email, password_hash,
        bio, avatarUrl, twitterUrl, instagramUrl,
        discordUrl, linkedinUrl, major, faculty,
        studyYear, studyStatus, clubStatus,
      ]
    );

    const user = result.rows[0];

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token
    await pool.query(
      "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 days')",
      [user.id, refreshToken]
    );

    return res.status(201).json({ user, accessToken, refreshToken });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* ----------------------------------------
   LOGIN USER
----------------------------------------- */
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    const user = result.rows[0];
    if (!user)
      return res.status(401).json({ error: "User not found" });

    // Validate password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ error: "Invalid password" });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token
    await pool.query(
      "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 days')",
      [user.id, refreshToken]
    );

    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* ----------------------------------------
   REFRESH TOKEN
----------------------------------------- */
export const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(401).json({ error: "Missing refresh token" });

  try {
    // Verify signature
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    // Check DB
    const result = await pool.query(
      "SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2",
      [refreshToken, decoded.user_id]
    );

    if (result.rows.length === 0)
      return res.status(403).json({ error: "Invalid or revoked refresh token" });

    // Issue new access token
    const newAccessToken = generateAccessToken({
      id: decoded.user_id,
      email: decoded.email,
    });

    return res.json({ accessToken: newAccessToken });
  } catch (err) {
    console.error("Refresh error:", err);
    return res.status(403).json({ error: "Invalid or expired refresh token" });
  }
};

/* ----------------------------------------
   LOGOUT USER
----------------------------------------- */
export const logoutUser = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken)
    return res.status(400).json({ error: "Missing refresh token" });

  try {
    await pool.query(
      "DELETE FROM refresh_tokens WHERE token = $1",
      [refreshToken]
    );

    return res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};