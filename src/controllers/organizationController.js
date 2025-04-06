import Organization from "../models/OrganizationModel.js";
import Plan from "../models/Plan.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { generateOrganizationToken } from "../utilities/generateToken.js";
import { sendEmail } from "../utilities/sendEmail.js";
import OTPModel from "../models/OTPModel.js";
import VerifiedOrganizationModel from "../models/VerifiedOrganizationModel.js";

// Step 1: Send OTP
export const sendOrganizationOTP = async (req, res) => {
    try {
        const { email } = req.body;

        const existingOrg = await Organization.findOne({ email });
        if (existingOrg) return res.status(400).json({ success: false, message: "Email already exists" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await OTPModel.findOneAndUpdate(
            { email },
            { otp, createdAt: new Date() },
            { upsert: true, new: true }
        );

        const sent = await sendEmail(email, "OTP Verification", `Your OTP is: ${otp}`);
        if (!sent) return res.status(500).json({ success: false, message: "Failed to send OTP" });

        res.json({ success: true, message: "OTP sent successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Step 2: Verify OTP
export const verifyOrganizationOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const record = await OTPModel.findOne({ email });
        if (!record || record.otp !== otp) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
        }

        await OTPModel.deleteOne({ email });

        await VerifiedOrganizationModel.findOneAndUpdate(
            { email },
            { verifiedAt: new Date() },
            { upsert: true }
        );

        res.json({ success: true, message: "OTP verified successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Step 3: Create Organization (only if email verified)
export const createOrganization = async (req, res) => {
    try {
        const { name, email, password, pinCode, address , gstNo , website } = req.body;

        const isVerified = await VerifiedOrganizationModel.findOne({ email });
        if (!isVerified) return res.status(400).json({ success: false, message: "Email not verified" });

        const existingOrg = await Organization.findOne({ email });
        if (existingOrg) return res.status(400).json({ success: false, message: "Email already exists" });

        const organization = new Organization({
            name,
            email,
            password,
            pinCode,
            address,
            website,
            gstNo,
            plan_id: null,
            plan_expire_date: null,
        });

        await organization.save();
        await VerifiedOrganizationModel.deleteOne({ email }); // remove to prevent reuse

        res.status(201).json({ success: true, message: "Organization created", organization });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


//  Get All Organizations
export const getOrganizations = async (req, res) => {
    try {
        // Get the page number from the query params (default to 1)
        const page = parseInt(req.query.page) || 1;
        const limit = 25;
        const skip = (page - 1) * limit;

        // Fetch organizations with pagination and populate the plan_id
        const organizations = await Organization.find()
            .populate("plan_id")
            .skip(skip)
            .limit(limit);

        // Get the total number of organizations
        const totalOrganizations = await Organization.countDocuments();

        res.json({
            success: true,
            organizations,
            currentPage: page,
            totalPages: Math.ceil(totalOrganizations / limit),
            totalOrganizations,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


//  Organization Buys a Plan
// export const buyPlan = async (req, res) => {
//     try {
//         const { organizationId, planId } = req.body;

//         const organization = await Organization.findById(organizationId);
//         if (!organization) return res.status(404).json({ success: false, message: "Organization not found" });

//         const plan = await Plan.findById(planId);
//         if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });

//         //  Calculate plan expiration date
//         const expireDate = new Date();
//         expireDate.setMonth(expireDate.getMonth() + plan.duration);

//         organization.plan_id = planId;
//         organization.plan_expire_date = expireDate;
//         await organization.save();

//         res.json({ success: true, message: "Plan purchased successfully", expireDate });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// };

//  Delete Organization
export const deleteOrganization = async (req, res) => {
    try {
        const { id } = req.params;
        await Organization.findByIdAndDelete(id);
        res.json({ success: true, message: "Organization deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Organization Login
export const loginOrganization = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if the organization exists and is active (status = 1)
        const organization = await Organization.findOne({ email, status: 1 }).select("+password");
        if (!organization) return res.status(404).json({ success: false, message: "Organization not found or inactive" });

        // Check if the password matches
        const isMatch = await bcrypt.compare(password, organization.password);
        if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials" });

        // Generate JWT Token using the provided function
        const token = generateOrganizationToken(organization._id);
        const orgData = organization.toObject();
        delete orgData.password;
        res.json({ success: true, message: "Login successful", token, organization:orgData });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const editOrganization = async (req, res) => {
    try {
        const { id: organizationId } = req.params;
        const { name, password, pinCode, address, status,website,gstNo } = req.body;

        // ✅ Ensure the logged-in organization is trying to edit its own data
        if (organizationId !== req.user.id) {
            return res.status(403).json({ success: false, message: "Forbidden: You can only edit your own data" });
        }

        // ✅ Fetch the organization
        const organization = await Organization.findById(organizationId);
        if (!organization) {
            return res.status(404).json({ success: false, message: "Organization not found" });
        }

        // ✅ Prevent modifications to `plan_id` & `plan_expire_date`
        if (req.body.plan_id || req.body.plan_expire_date) {
            return res.status(400).json({ success: false, message: "plan_id and plan_expire_date cannot be modified" });
        }

        // ✅ Update fields if provided
        if (name) organization.name = name;
        if (pinCode) organization.pinCode = pinCode;
        if (address) organization.address = address;
        if (website) organization.website = website;
        if (gstNo) organization.gstNo = gstNo;
        if (typeof status !== "undefined") organization.status = status;

        // ✅ Hash password if provided
        if (password) {
            organization.password = await bcrypt.hash(password, 10);
        }

        await organization.save();

        res.status(200).json({ success: true, message: "Organization updated successfully", organization });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


export const searchOrganizations = async (req, res) => {
    try {
        const searchQuery = req.query.search || "";

        // Check if search query is empty
        if (!searchQuery.trim()) {
            return res.status(400).json({ success: false, message: "Search query is required" });
        }

        const organizations = await Organization.find({
            name: { $regex: new RegExp(searchQuery, "i") }  
        }).populate("plan_id");

        res.json({ success: true, organizations });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


//  Forgot Password (Send Reset Link)
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Check if the organization exists
        const organization = await Organization.findOne({ email });
        if (!organization) {
            return res.status(404).json({ success: false, message: "Organization not found" });
        }

        // Generate Reset Token
        const resetToken = jwt.sign({ id: organization._id }, process.env.JWT_RESET_SECRET, {
            expiresIn: process.env.RESET_TOKEN_EXPIRES_IN,
        });

        // Reset URL
        const resetUrl = `${req.protocol}://${req.get("host")}/api/auth/reset-password/${resetToken}`;

        // Send the reset password email
        let a = await sendEmail(
            email,
            "Password Reset Request",
            `Please click the link to reset your password: ${resetUrl}`
        );

        if(!a){
            return res.status(500).json({ success: false, message: "Something went wrong" });
        }
        res.json({ success: true, message: "Password reset link sent to your email" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

//  Reset Password
export const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        // Verify Token
        const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET);

        // Find the organization by ID
        const organization = await Organization.findById(decoded.id);
        if (!organization) {
            return res.status(404).json({ success: false, message: "Invalid or expired token" });
        }

        organization.password = password;
        await organization.save();

        res.json({ success: true, message: "Password reset successful" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Invalid or expired token" });
    }
};

