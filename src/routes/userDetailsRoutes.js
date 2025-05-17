
import express from "express";
import { getUserDetails } from "../controllers/userDetailsController.js";

const router = express.Router();

router.get("/", getUserDetails);

export default router;
