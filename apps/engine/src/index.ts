import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/auth.route";
import { projectRouter } from "./routes/project.routes";
import { documentRouter } from "./routes/document.routes";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/projects", projectRouter);
app.use("/documents", documentRouter);

app.listen(PORT, () => {
  console.log(`Server is running at PORT: ${PORT}`);
});
