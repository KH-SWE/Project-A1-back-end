/**
 * routes/clubs.js
 *
 * Handles club-related API routes.
 * Mounted at /clubs in app.js, so:
 *   POST   /clubs/new        -> Create a new club
 *   GET    /clubs/id/:id     -> Get club by ID
 *   PATCH  /clubs/update/:id -> Update club details
 *   DELETE /clubs/:id        -> Delete club
 *
 * Notes:
 *  - Determine whether optional fields for update should be nullable or not.
 *  - Later: add authentication, member management, event scheduling.
 */

import express from "express";
import pool from "../config/db.js";

const router = express.Router();

/* --- Create New Club --- */
router.post("/new", async (req, res) => {
  const { name, type } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO clubs (club_name, club_type)
       VALUES ($1, $2)
       RETURNING id, club_name, club_type, description, avatar_url, banner_url, created_at`,
      [name, type]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") { // ERROR 23505:Unique constraint violation
      return res.status(400).send("Club name already exists");
    }
    console.error(err);
    res.status(500).send("Error creating club");
  }
});

/* --- Get Club by ID --- */
router.get("/id/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, club_name, club_type, description, avatar_url, banner_url, created_at
       FROM clubs
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Club not found"); // ERROR 404: Not found
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving club"); // ERROR 500: Internal server error
  }
});

/* --- Update Club Details (club_name, club_type, description) --- */
router.patch("/update/:id", async (req, res) => {
  const { id } = req.params;
  const { name, type, description} = req.body;

  try {
    const result = await pool.query(
      `UPDATE clubs
       SET club_name = COALESCE($1, club_name), 
           club_type = COALESCE($2, club_type), 
           description = COALESCE($3, description), 
       WHERE id = $4
       RETURNING id, club_name, club_type, description, avatar_url, banner_url, created_at`,
      [name, type, description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Club not found"); // ERROR 404: Not found
    }

    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") { // ERROR 23505: Unique constraint violation
      return res.status(400).send("Club name already exists");
    }
    console.error(err);
    res.status(500).send("Error updating club"); // ERROR 500: Internal server error
  }
});

/* --- Delete Club --- */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM clubs
       WHERE id = $1
       RETURNING id, club_name`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Club not found"); // ERROR 404: Not found
    }

    res.status(204).send(); // ERROR 204: No Content
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting club"); // ERROR 500: Internal server error
  }
});

export default router;