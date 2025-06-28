import jwt from "jsonwebtoken";
import TeamMember from "../models/TeamMemberModel.js";

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
      return res.status(400).json({ message: "Token is required" });
    }

    // Verify the token using your JWT_SECRET
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check role from the token
    if (decoded.role === "organization") {
      // Organization is validated
      return res.status(200).json({
        valid: true,
        role: "organization",
        id: decoded.id,
      });
    } else {
      // Team member verification: check if team member exists and is active
      const teamMember = await TeamMember.findById(decoded.id);

      if (!teamMember || teamMember.status !== 1) {
        return res.status(401).json({ message: "Unauthorized team member" });
      }

      // Team member is validated
      return res.status(200).json({
        valid: true,
        role: "team_member",
        id: decoded.id,
        organizationId: teamMember.organization_id,
      });
    }
  } catch (error) {
    console.error("verifyTokenAPI error:", error);
    // Return consistent unauthorized response on error
    return res.status(401).json({ message: "Invalid token" });
  }
};
