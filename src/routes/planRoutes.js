import express from "express";
import {
    createPlan, getAllPlans, getPlanById, updatePlan, deletePlan,
    softDeletePlan,
    recoverPlan,
    getActivePlans,
} from "../controllers/planController.js";
import { verifySuperAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();


router.post("/", verifySuperAdmin, createPlan);// Create a plan (Super Admin)
router.get("/", getAllPlans); // Get all plans (Public)
router.get("/getActivePlans", getActivePlans); // Get active plans (Public)
router.get("/:id", getPlanById); // Get plan by ID (Public)
router.put("/:id", verifySuperAdmin, updatePlan); // Update plan (Super Admin)
router.delete("/:id", verifySuperAdmin, deletePlan); // Delete plan (Super Admin)
router.put("/softDelete/:id", verifySuperAdmin, softDeletePlan); // Soft Delete plan (Super Admin)
router.put("/recoverPlan/:id", verifySuperAdmin, recoverPlan); // recover plan (Super Admin)



export default router;
