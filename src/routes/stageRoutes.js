import express from "express";
import { createStages, getStages, getStageById, updateStage, updateStages, swapSerialNumbers } from "../controllers/stageController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { checkPermission } from "../middlewares/checkPermission.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// CRUD routes
// router.post("/", createStage);
router.post("/",checkPermission("stage.create"), createStages);
router.get("/", checkPermission("stage.read"),getStages);
router.get("/:id", checkPermission("stage.read"),getStageById);
// router.put("/:id", updateStage);
router.put("/",checkPermission("stage.update"), updateStages);
router.put("/changeSerial",checkPermission("stage.update"), swapSerialNumbers);

export default router; 