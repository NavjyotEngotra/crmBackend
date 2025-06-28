import express from "express";
import { createPipeline, getPipelines, updatePipeline, getPipelineById } from "../controllers/pipelineController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { checkPermission } from "../middlewares/checkPermission.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// CRUD routes
router.post("/",checkPermission("pipeline.create"), createPipeline);
router.get("/", checkPermission("pipeline.read"),getPipelines);
router.get("/:id", checkPermission("pipeline.read"), getPipelineById);
router.put("/:id", checkPermission("pipeline.update"), updatePipeline);

export default router; 