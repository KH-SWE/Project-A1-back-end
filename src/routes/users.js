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
import { verifyToken } from "../utils/jwt.js";
import pool from "../config/db.js";

const saltRounds = 10;
const router = express.Router();

// get majors
router.get("/majors", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, major_name, faculty_id FROM majors ORDER BY id");
    // console.log("Majors retrieved:", result.rows);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching majors");
  }
});
// get faculties
router.get("/faculties", async (req, res) => {
  try {
    const query = "SELECT id, faculty_name FROM faculties ORDER BY id"; 
    const result = await pool.query(query);
    // console.log("Faculties retrieved:", result.rows);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching faculties");
  }
});
// get tags
router.get("/tags", async (req, res) => {
  try {
    const query = "SELECT id, tag_category, tag_name FROM tags ORDER BY id";
    const result = await pool.query(query);
    // console.log("Tags retrieved:", result.rows);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching tags");
  }
});

// get study status enum
router.get("/studyenum", async (req, res) => {
  try {
    const query = `SELECT enumlabel
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'user_study_status'
ORDER BY e.enumsortorder;`;
    const result = await pool.query(query);
    // console.log("Study status' retrieved:", result.rows);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching study status'");
  }
});
// retrieve club status enum
router.get("/clubenum", async (req, res) => {
  try {
    const query = `SELECT enumlabel
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'user_club_status'
ORDER BY e.enumsortorder;`;
    const result = await pool.query(query);
    // console.log("Club status' retrieved:", result.rows);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching club status'");
  }
});

// update user profile
// need to check if username is unique before updating
router.patch("/update/:id", verifyToken, async (req, res) => {
  const userId = req.params.id;
  const { username, firstName, lastName, bio, avatarUrl, twitterUrl, instagramUrl, discordUrl, linkedinUrl, major, faculty, studyYear, studyStatus, clubStatus } = req.body;
  try {
    const existingUsername = await pool.query(
      "SELECT id FROM users WHERE username = $1 AND id != $2",
      [username, userId]
    );
    if (existingUsername.rows.length > 0) {
      return res.status(400).json({ error: "Username already in use" });
    }
    const query = `
      UPDATE users
      SET username=$1, first_name=$2, last_name=$3, bio=$4, avatar_url=$5, twitter_url=$6, instagram_url=$7, discord_url=$8, linkedin_url=$9,
          major=$10, faculty=$11, study_year=$12, study_status=$13, club_status=$14
      WHERE id=$15
      RETURNING id, username, first_name, last_name, bio, avatar_url, twitter_url, instagram_url, discord_url, linkedin_url,
                major, faculty, study_year, study_status, club_status
    `;
    const result = await pool.query(query, [
      username, firstName, lastName, bio, avatarUrl, twitterUrl, instagramUrl, discordUrl, linkedinUrl,
      major, faculty, studyYear, studyStatus, clubStatus,
      userId
    ]);
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating user profile");
  }
});

// get all users (for testing)
router.get("/all", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users ORDER BY id");
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching users");
  }
});

// get user by id
router.get("/id/:id", async (req, res) => {
  const userId = req.params.id;
  try {
    const query = "SELECT id, username, first_name, last_name, email, bio, avatar_url, twitter_url, instagram_url, discord_url, linkedin_url, major, faculty, study_year, study_status, club_status FROM users WHERE id=$1";
    const result = await pool.query(query, [userId]);
    if (result.rows.length === 0) {
      return res.status(404).send("User not found");
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching user");
  }
});

// create new user
// need to return user id for front-end to store in localStorage
// handle unique email/username violation errors
router.post("/new", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    // hash before storing
    const password_hash = await bcrypt.hash(password, saltRounds);
    
    // insert into db
    const query = 
    `
      INSERT INTO users (username, email, password_hash)
      VALUES
      ($1, $2, $3)
      RETURNING id
    `;
    const result = await pool.query(query, [username, email, password_hash]);
    res.status(201).send("User registered successfully, ID: " + result.rows[0].id);
  } catch (err) {
    console.error(err);
    if (err.code === "23505") {
      // unique violation
      return res.status(409).send("Email or username already exists");
    }
    res.status(500).send("Error registering new user");
  }
});

// login check
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    // fetch user by email
    const query = "SELECT id, username, email, password_hash FROM users WHERE email=$1";
    const result = await pool.query(query, [email]);

    // if no user found
    if (result.rows.length === 0) {
      console.log(`Login failed: no user with email ${email}`);
      return res.status(401).send("Invalid email");
    }
    const user = result.rows[0];

    // compare password
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      console.log(`Login failed: incorrect password for user ${user.username} (ID: ${user.id})`);
      return res.status(401).send("Invalid password");
    }

    // successful login
    console.log(`User ${user.username} (ID: ${user.id}) logged in successfully.`);
    res.status(200).json({ id: user.id, username: user.username, email: user.email });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error during login");
  }
});

// delete user
router.delete("/delete/:id", async (req, res) => {
  const userId = req.params.id;
  try {
    const query = "DELETE FROM users WHERE id=$1";
    await pool.query(query, [userId]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting user");
  }
});

router.get("/me", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, email FROM users WHERE id = $1",
      [req.user.user_id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "User not found" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get /me error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


export default router;
