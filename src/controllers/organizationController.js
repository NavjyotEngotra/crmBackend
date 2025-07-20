import Organization from "../models/OrganizationModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { generateOrganizationToken, generateToken } from "../utilities/generateToken.js";
import { sendEmail } from "../utilities/sendEmail.js";
import OTPModel from "../models/OTPModel.js";
import VerifiedOrganizationModel from "../models/VerifiedOrganizationModel.js";
import { getOrganizationDetails } from "../utilities/getOrganizationDetails.js";
import TeamMember from "../models/TeamMemberModel.js";
import { MODULE_PERMISSIONS } from "../constants.js";
import ContactModel from "../models/ContactModel.js";
import CompanyModel from "../models/CompanyModel.js";
import { getUserInfo } from "../utilities/getUserInfo.js";
import responseSender from "../utilities/responseSender.js";

// Step 1: Send OTP
export const sendOrganizationOTP = async (req, res) => {
    try {
        const { email } = req.body;

        const existingOrg = await Organization.findOne({ email });
        const existingMember = await TeamMember.findOne({ email });
        if (existingOrg || existingMember)
            return responseSender(res, 400, false, {}, "Email already exists");

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await OTPModel.findOneAndUpdate(
            { email },
            { otp, createdAt: new Date() },
            { upsert: true, new: true }
        );

        const sent = await sendEmail(email, "OTP Verification", `Your OTP is: ${otp}`);
        if (!sent)
            return responseSender(res, 500, false, {}, "Failed to send OTP");

        return responseSender(res, 200, true, {}, "OTP sent successfully");
    } catch (error) {
        return responseSender(res, 500, false, {}, error.message);
    }
};

// Step 2: Verify OTP
export const verifyOrganizationOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const record = await OTPModel.findOne({ email });
        if (!record || record.otp !== otp)
            return responseSender(res, 400, false, {}, "Invalid or expired OTP");

        await OTPModel.deleteOne({ email });

        await VerifiedOrganizationModel.findOneAndUpdate(
            { email },
            { verifiedAt: new Date() },
            { upsert: true }
        );

        return responseSender(res, 200, true, {}, "OTP verified successfully");
    } catch (error) {
        return responseSender(res, 500, false, {}, error.message);
    }
};

// Step 3: Create Organization
export const createOrganization = async (req, res) => {
    try {
        const { name, email, password, pinCode, address, gstNo, website } = req.body;

        const isVerified = await VerifiedOrganizationModel.findOne({ email });
        if (!isVerified)
            return responseSender(res, 400, false, {}, "Email not verified");

        const existingOrg = await Organization.findOne({ email });
        if (existingOrg)
            return responseSender(res, 400, false, {}, "Email already exists");

        const organization = new Organization({
            name, email, password, pinCode, address, website, gstNo,
            plan_id: null,
            plan_expire_date: null,
        });

        await organization.save();
        await VerifiedOrganizationModel.deleteOne({ email });

        return responseSender(res, 201, true, { organization }, "Organization created");
    } catch (error) {
        return responseSender(res, 500, false, {}, error.message);
    }
};

// Get all organizations
export const getOrganizations = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(parseInt(req.query.limit) || 25, 100);
        const skip = (page - 1) * limit;

        const search = req.query.search?.trim();
        const status = req.query.status !== undefined ? parseInt(req.query.status) : undefined;
        const id = req.query.id?.trim();

        const query = {};
        if (id) {
            query._id = id;
        } else {
            if (search) query.name = { $regex: search, $options: "i" };
            if (!isNaN(status)) query.status = status;
        }

        const [organizations, totalOrganizations] = await Promise.all([
            Organization.find(query).populate("plan_id").skip(skip).limit(limit),
            Organization.countDocuments(query),
        ]);

        const organizationsWithCounts = await Promise.all(
            organizations.map(async (org) => {
                const [teamMemberCount, contactCount, companyCount] = await Promise.all([
                    TeamMember.countDocuments({ organization_id: org._id, status: 1 }),
                    ContactModel.countDocuments({ organization_id: org._id, status: 1 }),
                    CompanyModel.countDocuments({ organization_id: org._id, status: 1 }),
                ]);

                return {
                    ...org.toObject(),
                    activeTeamMembers: teamMemberCount,
                    activeContacts: contactCount,
                    activeCompanies: companyCount,
                };
            })
        );

        const totalPages = Math.ceil(totalOrganizations / limit);

        return responseSender(res, 200, true, {
            organizations: organizationsWithCounts,
            currentPage: page,
            totalPages,
            totalOrganizations,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
        });
    } catch (error) {
        return responseSender(res, 500, false, {}, error.message);
    }
};

// Delete Organization
export const deleteOrganization = async (req, res) => {
    try {
        const jwttoken = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(jwttoken, process.env.JWT_SECRET);
        const { _id: organization_id } = await Organization.findById(decoded.id);

        const deleted = await Organization.findByIdAndDelete(organization_id);
        if (!deleted)
            return responseSender(res, 404, false, {}, "Organization not found");

        return responseSender(res, 200, true, {}, "Organization deleted successfully");
    } catch (error) {
        return responseSender(res, 500, false, {}, error.message);
    }
};
// Login Organization
export const loginOrganization = async (req, res) => {
    try {
        const { email, password } = req.body;
        const organization = await Organization.findOne({ email });

        if (!organization || !(await bcrypt.compare(password, organization.password))) {
            return responseSender(res, 401, false, {}, "Invalid credentials");
        }

        const token = generateOrganizationToken(organization._id);
        return responseSender(res, 200, true, { token, organization }, "Login successful");
    } catch (error) {
        return responseSender(res, 500, false, {}, error.message);
    }
};

// Edit Organization
export const editOrganization = async (req, res) => {
    try {
        const { name, pinCode, address, gstNo, website } = req.body;
        const { id } = req.params;

        const updatedOrg = await Organization.findByIdAndUpdate(
            id,
            { name, pinCode, address, gstNo, website },
            { new: true }
        );

        if (!updatedOrg)
            return responseSender(res, 404, false, {}, "Organization not found");

        return responseSender(res, 200, true, { updatedOrg }, "Organization updated");
    } catch (error) {
        return responseSender(res, 500, false, {}, error.message);
    }
};

// Search Organizations
export const searchOrganizations = async (req, res) => {
    try {
        const { name } = req.query;
        const regex = new RegExp(name, "i");

        const organizations = await Organization.find({ name: regex });
        return responseSender(res, 200, true, { organizations });
    } catch (error) {
        return responseSender(res, 500, false, {}, error.message);
    }
};

// Forgot Password
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const organization = await Organization.findOne({ email });

        if (!organization)
            return responseSender(res, 404, false, {}, "Email not registered");

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await OTPModel.findOneAndUpdate(
            { email },
            { otp, createdAt: new Date() },
            { upsert: true, new: true }
        );

        const sent = await sendEmail(email, "Password Reset OTP", `Your OTP is: ${otp}`);
        if (!sent)
            return responseSender(res, 500, false, {}, "Failed to send OTP");

        return responseSender(res, 200, true, {}, "OTP sent successfully");
    } catch (error) {
        return responseSender(res, 500, false, {}, error.message);
    }
};

// Reset Password
export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const record = await OTPModel.findOne({ email });

        if (!record || record.otp !== otp)
            return responseSender(res, 400, false, {}, "Invalid or expired OTP");

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const organization = await Organization.findOneAndUpdate(
            { email },
            { password: hashedPassword },
            { new: true }
        );

        await OTPModel.deleteOne({ email });

        if (!organization)
            return responseSender(res, 404, false, {}, "Organization not found");

        return responseSender(res, 200, true, {}, "Password reset successful");
    } catch (error) {
        return responseSender(res, 500, false, {}, error.message);
    }
};

// Get Organization by ID
export const getOrganization = async (req, res) => {
    try {
        const { id } = req.params;
        const organization = await Organization.findById(id).populate("plan_id");

        if (!organization)
            return responseSender(res, 404, false, {}, "Organization not found");

        return responseSender(res, 200, true, { organization });
    } catch (error) {
        return responseSender(res, 500, false, {}, error.message);
    }
};

// Common Login for both Organization and Team Member
export const commonLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        let user = await Organization.findOne({ email });
        let role = "organization";

        if (!user) {
            user = await TeamMember.findOne({ email });
            role = "teammember";
        }

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return responseSender(res, 401, false, {}, "Invalid credentials");
        }

        const token = generateToken(user._id, role);
        const info = await getUserInfo(user._id, role);

        return responseSender(res, 200, true, { token, ...info }, "Login successful");
    } catch (error) {
        return responseSender(res, 500, false, {}, error.message);
    }
};

// Super Admin Login (only for verified orgs)
export const superadminloginOrganization = async (req, res) => {
    try {
        const { id } = req.params;
        const organization = await Organization.findById(id);

        if (!organization)
            return responseSender(res, 404, false, {}, "Organization not found");

        const token = generateOrganizationToken(organization._id, true); // true = superadmin override
        return responseSender(res, 200, true, { token, organization }, "Superadmin login successful");
    } catch (error) {
        return responseSender(res, 500, false, {}, error.message);
    }
};

// Get Subscription Plan
export const getSubscriptionPlan = async (req, res) => {
    try {
        const { id } = req.params;
        const organization = await Organization.findById(id).populate("plan_id");

        if (!organization || !organization.plan_id)
            return responseSender(res, 404, false, {}, "Plan not found");

        return responseSender(res, 200, true, { plan: organization.plan_id });
    } catch (error) {
        return responseSender(res, 500, false, {}, error.message);
    }
};

export const superadminCommonLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        let user = await Organization.findOne({ email });
        let role = "organization";

        if (!user) {
            user = await TeamMember.findOne({ email });
            role = "teammember";
        }

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return responseSender(res, 401, false, {}, "Invalid credentials");
        }

        const token = generateToken(user._id, role, true); // true = superadmin override
        const info = await getUserInfo(user._id, role);

        return responseSender(res, 200, true, { token, ...info }, "Superadmin login successful");
    } catch (error) {
        return responseSender(res, 500, false, {}, error.message);
    }
};

