import express from "express";
import { createPipeline, getPipelines, updatePipeline, getPipelineById } from "../controllers/pipelineController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// CRUD routes
router.post("/", createPipeline);
router.get("/", getPipelines);
router.get("/:id", getPipelineById);
router.put("/:id", updatePipeline);

export default router; 