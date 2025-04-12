import jwt from "jsonwebtoken";
import Organization from "../models/OrganizationModel.js";
import TeamMember from "../models/TeamMemberModel.js";

// Helper function to verify JWT and return user/organization info

export const getUserInfo = async (token) => {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const organization = await Organization.findById(decoded.id);
    if (organization && organization.status === 1) {
        return { type: "organization", user: organization };
    }

    const teamMember = await TeamMember.findById(decoded.id);
    if (teamMember && teamMember.status === 1) {
        return { type: "teamMember", user: teamMember };
    }

    return null;
};