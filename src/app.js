import express from "express";
import cors from "cors";
import pool from "./config/db.js";

const app = express();

app.use(cors());
app.use(express.json());

// test route
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

app.get("/time", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send("DB error");
    }
});

export default app;
