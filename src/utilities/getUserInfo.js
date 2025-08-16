import jwt from "jsonwebtoken";
import Organization from "../models/OrganizationModel.js";
import TeamMember from "../models/TeamMemberModel.js";

export const getUserInfo = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Handle superadmin
    if (decoded.role === "superadmin") {
      return { type: "superadmin", user: { _id: decoded.id } };
    }

    // Handle organization
    if (decoded.role === "organization") {
      const organization = await Organization.findById(decoded.id);
      if (organization && organization.status === 1) {
        return { type: "organization", user: organization };
      }
      return null;
    }

    // Handle team member
    if (decoded.role === "team_member") {
      const teamMember = await TeamMember.findById(decoded.id);
      if (teamMember && teamMember.status === 1) {
        return {
          type: "team_member",
          user: teamMember,
          organization_id: teamMember.organization_id,
        };
      }
      return null;
    }

    return null;
  } catch (err) {
    console.error("getUserInfo error:", err.message);
    return null;
  }
};
