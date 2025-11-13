import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  options: "-c search_path=public"
});

// test connection immediately
(async () => {
  try {
    const res = await pool.query("SELECT NOW(), current_database(), current_user, current_schema();");
    console.log("Connected to PostgreSQL 17! Time:", res.rows[0].now);
    console.log("DB Info: ", res.rows[0]);
  } catch (err) {
    console.error("Failed to connect to PostgreSQL:", err.message);
  }
})();

export default pool;
