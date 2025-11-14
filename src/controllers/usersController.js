import bcrypt from "bcrypt";
import pool from "../config/db.js";

const saltRounds = 10;

// --------------------------
// MAJORS
// --------------------------
export const getMajors = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, major_name, faculty_id FROM majors ORDER BY id"
    );
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error("getMajors:", err);
    return res.status(500).json({ error: "Error fetching majors" });
  }
};

// --------------------------
// FACULTIES
// --------------------------
export const getFaculties = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, faculty_name FROM faculties ORDER BY id"
    );
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error("getFaculties:", err);
    return res.status(500).json({ error: "Error fetching faculties" });
  }
};

// --------------------------
// TAGS
// --------------------------
export const getTags = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, tag_category, tag_name FROM tags ORDER BY id"
    );
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error("getTags:", err);
    return res.status(500).json({ error: "Error fetching tags" });
  }
};

// --------------------------
// ENUMS
// --------------------------
export const getStudyEnum = async (req, res) => {
  try {
    const query = `
      SELECT enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'user_study_status'
      ORDER BY e.enumsortorder;
    `;
    const result = await pool.query(query);
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error("getStudyEnum:", err);
    return res.status(500).json({ error: "Error fetching study status" });
  }
};

export const getClubEnum = async (req, res) => {
  try {
    const query = `
      SELECT enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'user_club_status'
      ORDER BY e.enumsortorder;
    `;
    const result = await pool.query(query);
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error("getClubEnum:", err);
    return res.status(500).json({ error: "Error fetching club status" });
  }
};

// --------------------------
// UPDATE USER PROFILE
// --------------------------
export const updateUserProfile = async (req, res) => {
  const userId = req.params.id;
  const {
    username,
    firstName,
    lastName,
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
    // Check username availability
    const existing = await pool.query(
      "SELECT id FROM users WHERE username = $1 AND id != $2",
      [username, userId]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Username already in use" });
    }

    const query = `
      UPDATE users
      SET username=$1, first_name=$2, last_name=$3, bio=$4, avatar_url=$5,
          twitter_url=$6, instagram_url=$7, discord_url=$8, linkedin_url=$9,
          major=$10, faculty=$11, study_year=$12, study_status=$13, club_status=$14
      WHERE id=$15
      RETURNING id, username, first_name, last_name, bio, avatar_url,
                twitter_url, instagram_url, discord_url, linkedin_url,
                major, faculty, study_year, study_status, club_status
    `;

    const result = await pool.query(query, [
      username,
      firstName,
      lastName,
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
      userId,
    ]);

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("updateUserProfile:", err);
    return res.status(500).json({ error: "Error updating user profile" });
  }
};

// --------------------------
// GET ALL USERS
// --------------------------
export const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users ORDER BY id");
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error("getAllUsers:", err);
    return res.status(500).json({ error: "Error fetching users" });
  }
};

// --------------------------
// GET USER BY ID
// --------------------------
export const getUserById = async (req, res) => {
  const userId = req.params.id;

  try {
    const query = `
      SELECT id, username, first_name, last_name, email, bio, avatar_url, 
             twitter_url, instagram_url, discord_url, linkedin_url,
             major, faculty, study_year, study_status, club_status
      FROM users
      WHERE id = $1
    `;
    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0)
      return res.status(404).json({ error: "User not found" });

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("getUserById:", err);
    return res.status(500).json({ error: "Error fetching user" });
  }
};

// --------------------------
// CREATE USER (NO JWT VERSION)
// --------------------------
export const createUser = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const password_hash = await bcrypt.hash(password, saltRounds);

    const query = `
      INSERT INTO users (username, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id
    `;
    const result = await pool.query(query, [
      username,
      email,
      password_hash,
    ]);

    return res
      .status(201)
      .send("User registered successfully, ID: " + result.rows[0].id);
  } catch (err) {
    console.error("createUser:", err);

    if (err.code === "23505") {
      return res.status(409).send("Email or username already exists");
    }

    return res.status(500).send("Error registering new user");
  }
};

// --------------------------
// BASIC LOGIN (NO JWT)
// --------------------------
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const query =
      "SELECT id, username, email, password_hash FROM users WHERE email=$1";
    const result = await pool.query(query, [email]);

    if (result.rows.length === 0) {
      return res.status(401).send("Invalid email");
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).send("Invalid password");
    }

    return res.status(200).json({
      id: user.id,
      username: user.username,
      email: user.email,
    });
  } catch (err) {
    console.error("loginUser:", err);
    return res.status(500).send("Error during login");
  }
};

// --------------------------
// DELETE USER
// --------------------------
export const deleteUser = async (req, res) => {
  const userId = req.params.id;

  try {
    await pool.query("DELETE FROM users WHERE id=$1", [userId]);
    return res.status(204).send();
  } catch (err) {
    console.error("deleteUser:", err);
    return res.status(500).send("Error deleting user");
  }
};

// --------------------------
// GET /me
// --------------------------
export const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, email FROM users WHERE id = $1",
      [req.user.user_id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "User not found" });

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("getMe:", err);
    return res.status(500).json({ error: "Server error" });
  }
};