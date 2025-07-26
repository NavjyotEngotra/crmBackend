import express from "express";
import { verifyAnyAuth } from "../middlewares/authMiddleware.js";
import responseSender from "../utilities/responseSender.js";

const router = express.Router();

// All routes require authentication
router.use(verifyAnyAuth);
router.get("/modules", (req, res) => {
  return responseSender(res, 200, true, [
    "contact",
    "category",
    "company",
    "lead",
    "meeting",
    "pipeline",
    "product",
    "stage",
  ], "Modules fetched successfully");
});

export default router;
