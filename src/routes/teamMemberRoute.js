import express from "express";
import {
    editTeamMemberProfile,
    getTeamMembers,
    getDeletedTeamMembers,
    loginTeamMember,
    updateTeamMemberStatus,
    resetTeamMemberPassword,
    searchTeamMembers,
    getMyOrganizationTeamMembers,
    getOrganization,
    getTeamMemberById,
    sendInvite,
    registerWithToken,
    superadminloginTeamMember
} from "../controllers/teamMemberController.js"; // adjust path if needed
import { verifySuperAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Team Member Login (No Auth)
router.post("/login", loginTeamMember);
router.get("/superadminloginTeamMember/:id",verifySuperAdmin, superadminloginTeamMember);

// Create a new Team Member (Organization Auth Required)
router.post("/invite", sendInvite);

// Edit Team Member's own profile (TeamMember Auth Required)
router.put("/", editTeamMemberProfile);

router.post("/", registerWithToken);

// Get Active Team Members (Organization Auth Required)
router.get("/", getTeamMembers);

// Get Soft Deleted Team Members (Organization Auth Required)
router.get("/deleted", getDeletedTeamMembers);

router.put("/status", updateTeamMemberStatus); 

router.put("/reset-password-by-orginization", resetTeamMemberPassword);

router.get("/search", searchTeamMembers);

router.get("/my-team-members", getMyOrganizationTeamMembers);

router.get("/getOrganization", getOrganization);
router.get("/:id", getTeamMemberById);


export default router;