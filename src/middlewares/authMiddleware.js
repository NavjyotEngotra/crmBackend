import jwt from "jsonwebtoken";
import { asyncHandler } from "../utilities/asyncHandler.js";

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

        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid token" });
    }
};