import { generateSuperAdminToken } from "../utilities/generateToken.js";
import mongoose from "mongoose";

export const loginSuperAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ message: "Please provide email and password" });
        }

        // Connect to MongoDB (Ensure Mongoose is already connected in your main app file)
        const db = mongoose.connection.db;
        const superAdminCollection = db.collection("superAdmin");

        // Find super admin user
        const user = await superAdminCollection.findOne({ email });

        if (!user || user.password !== password) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Generate token
        const token = generateSuperAdminToken(user._id);

        res.json({
            message: "Login successful",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
            },
            token,
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
