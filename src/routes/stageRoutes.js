import express from "express";
import { createStage, getStages, getStageById, updateStage } from "../controllers/stageController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// CRUD routes
router.post("/", createStage);
router.get("/", getStages);
router.get("/:id", getStageById);
router.put("/:id", updateStage);

export default router; 