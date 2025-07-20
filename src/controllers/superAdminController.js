import { generateSuperAdminToken } from "../utilities/generateToken.js";
import mongoose from "mongoose";
import responseSender from "../utilities/responseSender.js";

export const loginSuperAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Input validation
        if (!email || !password) {
            return responseSender(res, 400, false, null, "Please provide email and password");
        }

        const db = mongoose.connection.db;
        const superAdminCollection = db.collection("superAdmin");

        // Find user
        const user = await superAdminCollection.findOne({ email });

        if (!user || user.password !== password) {
            return responseSender(res, 401, false, null, "Invalid credentials");
        }

        // Generate token
        const token = generateSuperAdminToken(user._id);

        return responseSender(res, 200, true, {
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
            },
            token,
        }, "Login successful");
    } catch (error) {
        return responseSender(res, 500, false, null, error.message || "Server error");
    }
};
