import express from "express";
import { loginSuperAdmin } from "../controllers/superAdminController.js";

const router = express.Router();

router.post("/login", loginSuperAdmin);

export default router;
