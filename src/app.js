import express from "express";
import cors from "cors";
import pool from "./config/db.js";
import usersRouter from "./routes/users.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/users", usersRouter);

export default app;