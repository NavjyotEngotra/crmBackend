import jwt from "jsonwebtoken";
import Organization from "../models/OrganizationModel.js"; 

export const getOrganizationDetails = async (token) => {
        if (!token) return;

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const organization = await Organization.findById(decoded.id);
        if (!organization) return res.status(404).json({ message: "Organization not found" });

        return organization;

};