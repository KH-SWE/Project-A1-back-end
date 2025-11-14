import pool from "../config/db.js";

export const getResources = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, resource_category, resource_name, resource_url 
       FROM resources 
       ORDER BY id`
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching resources:", err);

    if (err?.code === "42P01") {
      return res
        .status(500)
        .json({ error: 'DB error: relation "resources" does not exist' });
    }

    return res.status(500).json({ error: "Error fetching resources" });
  }
};