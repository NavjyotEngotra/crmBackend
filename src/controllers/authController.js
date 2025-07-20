import jwt from "jsonwebtoken";
import TeamMember from "../models/TeamMemberModel.js";
import responseSender from "../utilities/responseSender.js";

/**
 * verifyTokenAPI
 * 
 * This controller is designed to be called from other microservices
 * to validate a JWT token. It returns the decoded user data
 * including role, user id, and organization id (if team member).
 */
export const verifyTokenAPI = async (req, res) => {
  try {
    const { token } = req.body;

    // Check if token is provided
    if (!token) {
      return responseSender(res, 400, false, null, "Token is required");
    }

    // Verify the token using your JWT_SECRET
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check role from the token
    if (decoded.role === "organization") {
      // Organization is validated
      return responseSender(res, 200, true, {
        role: "organization",
        id: decoded.id,
      }, "Token verified successfully");
    }

    // Team member verification: check if team member exists and is active
    const teamMember = await TeamMember.findById(decoded.id);

    if (!teamMember || teamMember.status !== 1) {
      return responseSender(res, 401, false, null, "Unauthorized team member");
    }

    // Team member is validated
    return responseSender(res, 200, true, {
      role: "team_member",
      id: decoded.id,
      organizationId: teamMember.organization_id,
    }, "Token verified successfully");

  } catch (error) {
    console.error("verifyTokenAPI error:", error);
    // Return consistent unauthorized response on error
    return responseSender(res, 401, false, null, "Invalid token");
  }
};
