import express from "express";
import { createOrganization, getOrganizations, deleteOrganization, loginOrganization, editOrganization } from "../controllers/organizationController.js";
import { verifyOrganization, verifySuperAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", createOrganization);
router.get("/", verifySuperAdmin,getOrganizations);
// router.post("/buy-plan", buyPlan);
// router.delete("/:id", verifySuperAdmin,deleteOrganization);
router.post("/login", loginOrganization);
router.put("/:id", verifyOrganization , editOrganization );

export default router;
