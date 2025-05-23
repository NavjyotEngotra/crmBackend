import express from "express";
import {
  createMeeting,
  updateMeeting,
  getMeetings,
  deleteMeeting,
  getMeetingById,
} from "../controllers/meetingController.js";
import { verifyOrgOrTeamMember } from "../middlewares/combinedAuthMiddleware.js";

const router = express.Router();

router.post("/", verifyOrgOrTeamMember, createMeeting);
router.put("/:id", verifyOrgOrTeamMember, updateMeeting);
router.get("/", verifyOrgOrTeamMember, getMeetings);
router.get("/:id", verifyOrgOrTeamMember, getMeetingById);
router.delete("/:id", verifyOrgOrTeamMember, deleteMeeting);

export default router;
