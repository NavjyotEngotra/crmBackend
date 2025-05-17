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

// Step 1: Send OTP
export const sendOrganizationOTP = async (req, res) => {
    try {
        const { email } = req.body;

        const existingOrg = await Organization.findOne({ email });
        const existingMember = await TeamMember.findOne({ email });
        if (existingOrg || existingMember) return res.status(400).json({ success: false, message: "Email already exists" });

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

export const getOrganizations = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(parseInt(req.query.limit) || 25, 100); // limit capped at 100
        const skip = (page - 1) * limit;

        const search = req.query.search?.trim();
        const status = req.query.status !== undefined ? parseInt(req.query.status) : undefined;
        const id = req.query.id?.trim();

        const query = {};
        if (id) {
            query._id = id;
        } else {
            if (search) {
                query.name = { $regex: search, $options: "i" };
            }
            if (!isNaN(status)) {
                query.status = status;
            }
        }

        const [organizations, totalOrganizations] = await Promise.all([
            Organization.find(query)
                .populate("plan_id")
                .skip(skip)
                .limit(limit),
            Organization.countDocuments(query)
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

        res.json({
            success: true,
            organizations: organizationsWithCounts,
            currentPage: page,
            totalPages,
            totalOrganizations,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
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
        const jwttoken = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(jwttoken, process.env.JWT_SECRET);
        const {_id:organization_id} = await Organization.findById(decoded.id);
        const deleted = await Organization.findByIdAndDelete(organization_id);

        if (!deleted) {
            return res.status(404).json({ success: false, message: "Organization not found" });
        }

        res.json({ success: true, message: "Organization deleted successfully" });
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
        res.json({ success: true, message: "Login successful", token, organization:orgData,premissions:MODULE_PERMISSIONS });
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
        if (password) organization.password = password;
        if (gstNo) organization.gstNo = gstNo;
        if (typeof status !== "undefined") organization.status = status;


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


export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Check if email exists
        const organization = await Organization.findOne({ email });
        const teamMember = await TeamMember.findOne({ email });

        if (!organization && !teamMember) {
            return res.status(404).json({ success: false, message: "Email not found" });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Save or update OTP in DB (overwrite if exists)
        await OTPModel.findOneAndUpdate(
            { email },
            { otp, createdAt: new Date() },
            { upsert: true, new: true }
        );

        // Send OTP via email
        const sent = await sendEmail(
            email,
            "Your OTP for Password Reset",
            `Your OTP is: ${otp}. It will expire in 5 minutes.`
        );

        if (!sent) {
            return res.status(500).json({ success: false, message: "Failed to send OTP" });
        }

        res.json({ success: true, message: "OTP sent to your email" });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { email, otp, password } = req.body;

        if (!email || !otp || !password) {
            return res.status(400).json({ success: false, message: "Email, OTP, and password are required" });
        }

        // Verify OTP
        const existingOtp = await OTPModel.findOne({ email, otp });
        if (!existingOtp) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
        }

        // Reset password for organization or team member
        const organization = await Organization.findOne({ email });
        if (organization) {
            organization.password = password;
            await organization.save();
        }

        const teamMember = await TeamMember.findOne({ email });
        if (teamMember) {
            teamMember.password = password;
            await teamMember.save();
        }

        if (!organization && !teamMember) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Delete OTP after use
        await OTPModel.deleteOne({ email });

        res.json({ success: true, message: "Password reset successful" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getOrganization = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ success: false, message: "No token provided" });

        const organization = await getOrganizationDetails(token);
        if (!organization) {
            return res.status(404).json({ success: false, message: "Organization not found" });
        }

        const orgData = organization.toObject();
        delete orgData.password;

        res.json({ success: true, organization: orgData });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const superadminloginOrganization = async (req, res) => {
    try {
        const { id } = req.params;
        const organization = await Organization.findById(id)

        // Generate JWT Token using the provided function
        const token = generateOrganizationToken(organization._id);
        const orgData = organization.toObject();
        delete orgData.password;
        res.json({ success: true, message: "Login successful", token, organization:orgData, premissions:MODULE_PERMISSIONS });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getSubscriptionPlan = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.type !== "organization") {
            return res.status(401).json({ 
                success: false, 
                message: "Unauthorized - Organization access required" 
            });
        }

        const organization = await Organization.findById(info.user._id)
            .populate('plan_id')
            .select('plan_id plan_expire_date');

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: "Organization not found"
            });
        }

        const subscriptionData = {
            plan: organization.plan_id,
            expireDate: organization.plan_expire_date,
            isActive: organization.plan_expire_date ? new Date(organization.plan_expire_date) > new Date() : false
        };

        res.json({
            success: true,
            subscription: subscriptionData
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const commonLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // First check in Organization
        let user = await Organization.findOne({ email, status: 1 }).select("+password");
        let token = null;
        let role = "organization";

        if (user) {
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ success: false, message: "Invalid credentials" });
            }

            token = generateOrganizationToken(user._id);
            const userData = user.toObject();
            delete userData.password;

            return res.json({
                success: true,
                message: "Login successful",
                token,
                role,
                organization: userData,
                permissions: MODULE_PERMISSIONS
            });
        }

        // If not found in Organization, check in TeamMember
        user = await TeamMember.findOne({ email, status: 1 }).select("+password");
        role = "teamMember";

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found or inactive" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        token = generateToken(user._id);
        const userData = user.toObject();
        delete userData.password;

        res.json({
            success: true,
            message: "Login successful",
            token,
            role,
            teamMember: userData,
            permissions: MODULE_PERMISSIONS
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const superadminCommonLogin = async (req, res) => {
    try {
        const { id } = req.params;

        // Try to find the user in Organization collection
        let user = await Organization.findById(id);
        let role = "organization";
        let token;

        if (user) {
            token = generateOrganizationToken(user._id);
            const orgData = user.toObject();
            delete orgData.password;

            return res.json({
                success: true,
                message: "Login successful",
                token,
                role,
                organization: orgData,
                permissions: MODULE_PERMISSIONS
            });
        }

        // If not found, try to find the user in TeamMember collection
        user = await TeamMember.findById(id);
        role = "teamMember";

        if (user) {
            token = generateToken(user._id);
            const memberData = user.toObject();
            delete memberData.password;

            return res.json({
                success: true,
                message: "Login successful",
                token,
                role,
                teamMember: memberData,
                permissions: MODULE_PERMISSIONS
            });
        }

        // If user not found in both
        return res.status(404).json({ success: false, message: "User not found" });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
