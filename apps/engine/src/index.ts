import "dotenv/config"
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/auth.route";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors({origin: process.env.CLIENT_ORIGIN, credentials: true}))
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter)

app.listen(PORT, () => {
  console.log(`Server is running at PORT: ${PORT}`);
});
