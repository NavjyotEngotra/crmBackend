import express from "express";
import {
  assignPermission,
  getAllAssignments,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
} from "../controllers/teamMemberPermissionController.js";

import { verifyOrganization } from "../middlewares/authMiddleware.js";

const router = express.Router();

// all routes only for organizations
router.post("/", verifyOrganization, assignPermission);
router.get("/", verifyOrganization, getAllAssignments);
router.get("/:id", verifyOrganization, getAssignmentById);
router.put("/:id", verifyOrganization, updateAssignment);
router.delete("/:id", verifyOrganization, deleteAssignment);

export default router;
