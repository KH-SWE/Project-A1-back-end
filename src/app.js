import express from "express";
import cors from "cors";
// import pool from "./config/db.js";
import usersRouter from "./routes/users.js";
import authRouter from "./routes/auth.js";
import resourcesRouter from "./routes/resources.js";
import uploadRouter from "./routes/uploads.js";
import clubsRouter from "./routes/clubs.js";
import postsRouter from "./routes/posts.js";
import commentRouter from "./routes/comments.js";
import discussionsRouter from "./routes/discussions.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/clubs", clubsRouter);
app.use("/api/posts", postsRouter);
app.use("/api/discussions", discussionsRouter);
app.use("/api/comments", commentRouter);
app.use("/api/users", usersRouter);
app.use("/api/resources", resourcesRouter);

export default app;