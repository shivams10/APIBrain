import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import * as documentController from "../controllers/document.controller";

export const documentRouter = Router();
documentRouter.use(requireAuth);

documentRouter.get("/:documentId", documentController.getById);
