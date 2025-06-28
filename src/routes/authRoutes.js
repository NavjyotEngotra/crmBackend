import express from "express";
import { verifyTokenAPI } from "../controllers/authController.js";

const router = express.Router();

router.post("/verify-token", verifyTokenAPI);

export default router;
