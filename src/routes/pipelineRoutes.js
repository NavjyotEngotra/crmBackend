import express from "express";
import { createPipeline, getPipelines, updatePipeline, getPipelineById } from "../controllers/pipelineController.js";
import { verifyAnyAuth } from "../middlewares/authMiddleware.js";
import { checkPermission } from "../middlewares/checkPermission.js";

const router = express.Router();

// All routes require authentication
router.use(verifyAnyAuth);

// CRUD routes
router.post("/",checkPermission("pipeline.create"), createPipeline);
router.get("/", checkPermission("pipeline.read"),getPipelines);
router.get("/:id", checkPermission("pipeline.read"), getPipelineById);
router.put("/:id", checkPermission("pipeline.update"), updatePipeline);

export default router; 