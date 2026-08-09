import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/requireAuth";
import * as projectController from "../controllers/project.controller";
import * as queryController from "../controllers/query.controller";

export const projectRouter = Router();
projectRouter.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.MAX_UPLOAD_MB ?? 20) * 1024 * 1024 },
});

projectRouter.post("/", projectController.create);
projectRouter.get("/", projectController.list);
projectRouter.post("/:projectId/documents", upload.single("file"), projectController.ingestDocument);
projectRouter.get("/:projectId/documents", projectController.listDocuments);
projectRouter.post("/:projectId/query", queryController.ask);
