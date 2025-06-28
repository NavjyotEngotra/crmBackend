import express from "express";
import {
  createMeeting,
  updateMeeting,
  getMeetings,
  deleteMeeting,
  getMeetingById,
} from "../controllers/meetingController.js";
import { verifyOrgOrTeamMember } from "../middlewares/combinedAuthMiddleware.js";
import { checkPermission } from "../middlewares/checkPermission.js";

const router = express.Router();

router.post("/", verifyOrgOrTeamMember,checkPermission("meeting.create"), createMeeting);
router.put("/:id", verifyOrgOrTeamMember,checkPermission("meeting.update"), updateMeeting);
router.get("/", verifyOrgOrTeamMember,checkPermission("meeting.read"), getMeetings);
router.get("/:id", verifyOrgOrTeamMember,checkPermission("meeting.read"), getMeetingById);
router.delete("/:id", verifyOrgOrTeamMember,checkPermission("meeting.update"), deleteMeeting);

export default router;
