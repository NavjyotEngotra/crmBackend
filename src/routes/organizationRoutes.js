import express from "express";
import { createOrganization, getOrganization, getOrganizations, deleteOrganization, loginOrganization, editOrganization, searchOrganizations, forgotPassword, resetPassword, sendOrganizationOTP, verifyOrganizationOTP, superadminloginOrganization } from "../controllers/organizationController.js";
import { verifyOrganization, verifySuperAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/send-otp", sendOrganizationOTP);
router.post("/verify-otp", verifyOrganizationOTP);
router.post("/", createOrganization);
router.get("/", verifySuperAdmin,getOrganizations);
// router.post("/buy-plan", buyPlan);
router.delete("/", verifyOrganization,deleteOrganization)
router.get("/search", verifySuperAdmin,searchOrganizations);
router.post("/login", loginOrganization);
router.put("/:id", verifyOrganization , editOrganization );
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.get("/getOrganization",getOrganization );
router.get("/superadminloginOrganization/:id",verifySuperAdmin,superadminloginOrganization );

export default router;
