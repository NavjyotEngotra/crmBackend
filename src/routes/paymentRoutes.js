import express from "express";
import { createOrder, getPayments, searchPayments, verifyPayment } from "../controllers/paymentController.js";
import { verifySuperAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/create-order", createOrder);
router.post("/verify-payment", verifyPayment);
router.get("/", verifySuperAdmin, getPayments); // Get all payments (Super Admin)
router.get("/search", verifySuperAdmin, searchPayments); // Search payments (Super Admin)

export default router;
