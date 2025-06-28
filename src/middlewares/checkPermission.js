import jwt from "jsonwebtoken";
import TeamMember from "../models/TeamMemberModel.js";
import { TeamMemberPermission } from "../models/TeamMemberPermissionModel.js";

/**
 * checkPermission middleware
 *
 * If organization (verified via token) => always allowed
 * If team member (verified via DB) => permission check required
 */
export const checkPermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res
          .status(401)
          .json({ message: "Unauthorized, token required" });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (!decoded) {
        return res
          .status(401)
          .json({ message: "Invalid token" });
      }

      // check if organization
      if (decoded.role === "organization") {
        req.user = { id: decoded.id, role: "organization" };
        return next();
      }

      // else team member
      const teamMember = await TeamMember.findById(decoded.id);
      if (!teamMember || teamMember.status !== 1) {
        return res
          .status(401)
          .json({ message: "Unauthorized team member" });
      }

      // check if team member has permission
      const hasPermission = await TeamMemberPermission.findOne({
        teamMemberId: teamMember._id
      })
        .populate("permissionId", "name")
        .then((assignment) =>
          assignment?.permissionId?.name === permissionName
        );

      if (!hasPermission) {
        return res.status(403).json({
          message: `Forbidden: missing permission ${permissionName}`,
        });
      }

      // attach team member
      req.user = {
        id: teamMember._id,
        role: "team_member",
        organizationId: teamMember.organization_id,
      };

      next();
    } catch (error) {
      console.error("checkPermission error:", error);
      return res
        .status(401)
        .json({ message: "Invalid or expired token" });
    }
  };
};
