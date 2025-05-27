import express from "express";
import { createStage, createStages, getStages, getStageById, updateStage, updateStages } from "../controllers/stageController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// CRUD routes
// router.post("/", createStage);
router.post("/", createStages);
router.get("/", getStages);
router.get("/:id", getStageById);
// router.put("/:id", updateStage);
router.put("/", updateStages);

export default router; 