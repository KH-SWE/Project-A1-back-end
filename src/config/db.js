import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// test connection immediately
(async () => {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("Connected to PostgreSQL 17! Time:", res.rows[0].now);
  } catch (err) {
    console.error("Failed to connect to PostgreSQL:", err.message);
  }
})();

export default pool;
