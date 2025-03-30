import Organization from "../models/OrganizationModel.js";
import Plan from "../models/Plan.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { generateOrganizationToken } from "../utilities/generateToken.js";

//  Create an Organization
export const createOrganization = async (req, res) => {
    try {
        const { name, email, password, pinCode, address } = req.body;

        // Check if email already exists
        const existingOrg = await Organization.findOne({ email });
        if (existingOrg) {
            return res.status(400).json({ success: false, message: "Email already exists" });
        }

        // 🛑 Ensure only allowed fields are passed
        const organization = new Organization({
            name,
            email,
            password,
            pinCode,
            address,
            plan_id: null,  // Make sure no plan is assigned initially
            plan_expire_date: null
        });

        await organization.save();

        res.status(201).json({ success: true, organization });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

//  Get All Organizations
export const getOrganizations = async (req, res) => {
    try {
        const organizations = await Organization.find().populate("plan_id");
        res.json({ success: true, organizations });
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

//         // 🗓️ Calculate plan expiration date
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

        // Check if the organization exists
        const organization = await Organization.findOne({ email }).select("+password");;
        if (!organization) return res.status(404).json({ success: false, message: "Organization not found" });

        const isMatch = await bcrypt.compare(password, organization.password);
        if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials" });
        // Generate JWT Token using the provided function
        const token = generateOrganizationToken(organization._id);

        res.json({ success: true, message: "Login successful", token });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const editOrganization = async (req, res) => {
    try {
        const { id:organizationId } = req.params;
        const { name, email, password, pinCode, address,status } = req.body;

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
        if (email) organization.email = email;
        if (pinCode) organization.pinCode = pinCode;
        if (address) organization.address = address;
        if (typeof status !== "undefined")organization.status = status;

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


