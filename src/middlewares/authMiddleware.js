import jwt from "jsonwebtoken";
import { User } from "../models/user.js";
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

// ✅ Ensure isAdmin is exported
export const isAdmin = (req, res, next) => {
    if (req.user && req.user.name === "admin") {
        next();
    } else {
        res.status(403).json({ message: "Access denied. Admins only." });
    }
};
