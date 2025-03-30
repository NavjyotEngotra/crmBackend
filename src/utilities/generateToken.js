import jwt from "jsonwebtoken";

export const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "30d" });
};


export const generateSuperAdminToken = (superAdminId) => {
    return jwt.sign(
        { id: superAdminId, role: "superadmin" }, // Hardcoded role
        process.env.JWT_SECRET,
        { expiresIn: "30d" }
    );
};

export const generateOrganizationToken = (superAdminId) => {
    return jwt.sign(
        { id: superAdminId, role: "organization" }, // Hardcoded role
        process.env.JWT_SECRET,
        { expiresIn: "30d" }
    );
};