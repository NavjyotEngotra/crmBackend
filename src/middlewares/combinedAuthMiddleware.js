
import jwt from "jsonwebtoken";
import TeamMember from "../models/TeamMemberModel.js";

export const verifyOrgOrTeamMember = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ message: "Unauthorized, token required" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.role === "organization") {
            req.user = { id: decoded.id, role: "organization" };
            next();
        } else {
            const teamMember = await TeamMember.findById(decoded.id);
            if (!teamMember || teamMember.status !== 1) {
                return res.status(401).json({ message: "Unauthorized team member" });
            }
            req.user = { id: decoded.id, role: "team_member", organizationId: teamMember.organization_id };
            next();
        }
    } catch (error) {
        return res.status(401).json({ message: "Invalid token" });
    }
};
