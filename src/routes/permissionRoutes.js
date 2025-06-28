import express from "express";
import {
  createPermission,
  getAllPermissions,
  getPermissionById,
  updatePermission,
  deletePermission,
} from "../controllers/permissionController.js";

import { verifySuperAdmin ,verifyAnyAuth} from "../middlewares/authMiddleware.js";

const router = express.Router();

// anyone with a valid token (superadmin, org, team member) can read
router.get("/", verifyAnyAuth, getAllPermissions);
router.get("/:id", verifyAnyAuth, getPermissionById);

// only superadmin can create/update/delete
router.post("/", verifySuperAdmin, createPermission);
router.put("/:id", verifySuperAdmin, updatePermission);
router.delete("/:id", verifySuperAdmin, deletePermission);

export default router;
