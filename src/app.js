import express from "express";
import cors from "cors";
import pool from "./config/db.js";
import usersRouter from "./routes/users.js";
import authRoutes from "./routes/auth.js";
import resourcesRouter from "./routes/resources.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/users", usersRouter);
app.use("/api/auth", authRoutes)
app.use("/api/resources", resourcesRouter);

export default app;