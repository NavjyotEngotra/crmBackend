import express from "express";
import {
    createTeamMember,
    editTeamMemberProfile,
    getTeamMembers,
    getDeletedTeamMembers,
    loginTeamMember,
    updateTeamMemberStatus
} from "../controllers/teamMemberController.js"; // adjust path if needed

const router = express.Router();

// Team Member Login (No Auth)
router.post("/login", loginTeamMember);

// Create a new Team Member (Organization Auth Required)
router.post("/", createTeamMember);

// Edit Team Member's own profile (TeamMember Auth Required)
router.put("/", editTeamMemberProfile);

// Get Active Team Members (Organization Auth Required)
router.get("/", getTeamMembers);

// Get Soft Deleted Team Members (Organization Auth Required)
router.get("/deleted", getDeletedTeamMembers);

router.put("/status", updateTeamMemberStatus); 

export default router;