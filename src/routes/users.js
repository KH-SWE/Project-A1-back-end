/**
 * routes/users.js
 *
 * Handles user-related API routes.
 * Mounted at /users in app.js, so:
 *   POST   /users/new        -> Register new user
 *   POST   /users/login      -> Login
 *   GET    /users/id/:id     -> Get user by ID (public profile info only)
 *   PATCH  /users/update/:id -> Update profile fields (username, bio, email)
 *   DELETE /users/:id        -> Delete account
 *
 * Notes:
 * - Passwords are hashed with bcrypt before storing.
 * - Responses never include password_hash.
 * - Later: add JWT auth, email verification, password reset.
 */

import express from "express";
import bcrypt from "bcrypt";
import pool from "../config/db.js";

const saltRounds = 10;
const router = express.Router();

// --- Create new user ---
router.post("/new", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, created_at, bio, avatar_url`,
      [username, email, hashedPassword]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).send("Username or email already exists");
    }
    console.error(err);
    res.status(500).send("Error creating user");
  }
});

// --- Login ---
router.post("/login", async (req, res) => {
  const { email, password } = req.body; // login with email (safer)
  try {
    const result = await pool.query(
      "SELECT id, username, email, password_hash FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).send("Invalid email or password");
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).send("Invalid email or password");
    }

    res.status(200).json({
      message: "Login successful",
      userId: user.id,
      username: user.username,
      email: user.email,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error during login");
  }
});

// --- Get user by ID ---
router.get("/id/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT id, username, email, bio, avatar_url, created_at FROM users WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("User not found");
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching user");
  }
});

// --- Update user profile (username, bio, email) ---
router.patch("/update/:id", async (req, res) => {
  const { id } = req.params;
  const { username, bio, email } = req.body;

  try {
    const result = await pool.query(
      `UPDATE users 
       SET username = COALESCE($1, username),
           bio = COALESCE($2, bio),
           email = COALESCE($3, email),
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, username, email, bio, avatar_url, created_at`,
      [username, bio, email, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("User not found");
    }

    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).send("Username or email already exists");
    }
    console.error(err);
    res.status(500).send("Error updating user");
  }
});

// --- Delete user ---
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING id, username",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("User not found");
    }

    res.json({ message: "User deleted", ...result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting user");
  }
});

// TODO: (Later once we figure out JWT and sessions)
// PATCH /users/update/password/:id → for password change.
// POST /auth/refresh → for refresh tokens.
// GET /users/me → return current user’s profile (using JWT instead of passing :id).

export default router;
