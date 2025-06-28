import jwt from "jsonwebtoken";
import { asyncHandler } from "../utilities/asyncHandler.js";
import TeamMember from "../models/TeamMemberModel.js";
import Organization from "../models/OrganizationModel.js";

export const protect = asyncHandler(async (req, res, next) => {
    let token = req.headers.authorization;

    if (!token || !token.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Not authorized, no token" });
    }

    try {
        token = token.split(" ")[1]; // Remove 'Bearer' prefix
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select("-password");
        next();
    } catch (error) {
        res.status(401).json({ message: "Not authorized, token failed" });
    }
});


export const verifySuperAdmin = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({ message: "Unauthorized, token required" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded || decoded.role !== "superadmin") {
            return res.status(403).json({ message: "Forbidden: Only Super Admins can access this" });
        }

        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid token" });
    }
};

export const verifyOrganization = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({ message: "Unauthorized, token required" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded || decoded.role !== "organization") {
            return res.status(403).json({ message: "Forbidden: Only Organizations can access this" });
        }

        req.user = decoded; // Store decoded token data in the request object
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid token" });
    }
};

export const isAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const teamMember = await TeamMember.findById(decoded.id);

        if (!teamMember || teamMember.role !== "admin") {
            return res.status(403).json({ success: false, message: "Only admins are allowed to perform this action" });
        }

        req.teamMember = teamMember; // forward if needed
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: "Invalid token or unauthorized" });
    }
};

export const verifyToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({ 
                success: false,
                message: "Unauthorized, token required" 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded) {
            return res.status(401).json({ 
                success: false,
                message: "Invalid token" 
            });
        }

        // Check if user is organization or team member
        let user;
        if (decoded.role === "organization") {
            user = await Organization.findById(decoded.id);
            if (!user) {
                return res.status(401).json({ 
                    success: false,
                    message: "Organization not found" 
                });
            }
            req.user = {
                type: "organization",
                user: user
            };
        } else {
            user = await TeamMember.findById(decoded.id);
            if (!user) {
                return res.status(401).json({ 
                    success: false,
                    message: "Team member not found" 
                });
            }
            req.user = {
                type: "teamMember",
                user: user
            };
        }

        next();
    } catch (error) {
        return res.status(401).json({ 
            success: false,
            message: "Invalid token" 
        });
    }
};

export const verifyAnyAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized, token required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role === "superadmin") {
      req.user = { id: decoded.id, role: "superadmin" };
      next();
    } else if (decoded.role === "organization") {
      req.user = { id: decoded.id, role: "organization" };
      next();
    } else {
      // team member check
      const teamMember = await TeamMember.findById(decoded.id);
      if (!teamMember || teamMember.status !== 1) {
        return res.status(401).json({ message: "Unauthorized team member" });
      }
      req.user = {
        id: decoded.id,
        role: "team_member",
        organizationId: teamMember.organization_id,
      };
      next();
    }
  } catch (error) {
    console.error("verifyAnyAuth error:", error.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};
