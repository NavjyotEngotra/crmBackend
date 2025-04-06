import express from "express";
import {
  createNote,
  getNotesByModuleId,
  updateNote,
  updateStatus,
} from "../controllers/noteController.js";
import { isAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", createNote);
router.get("/:module_id", getNotesByModuleId);
router.put("/:id", updateNote);
router.put("/update-status/:id", isAdmin,updateStatus);

export default router;
