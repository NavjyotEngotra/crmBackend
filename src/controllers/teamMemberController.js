import TeamMember from "../models/TeamMemberModel.js";
import Organization from "../models/OrganizationModel.js";
import { getOrganizationDetails } from "../utilities/getOrganizationDetails.js"
import {generateToken} from "../utilities/generateToken.js"
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import InviteToken from "../models/InviteTokenModel.js";
import { sendEmail } from "../utilities/sendEmail.js";
import { MODULE_PERMISSIONS } from "../constants.js";

export const sendInvite = async (req, res) => {
    try {
    const { email,role } = req.body;
    const jwttoken = req.headers.authorization?.split(" ")[1];
     const decoded = jwt.verify(jwttoken, process.env.JWT_SECRET);
     const {_id:organization_id} = await Organization.findById(decoded.id);
    if(!organization_id){
        return res.status(401).json({ message: "Unauthorised" });
    }
        // Check if email already exists in TeamMember or Organization
        const [existingTeamMember, existingOrg] = await Promise.all([
            TeamMember.findOne({ email }),
            Organization.findOne({ email }),
        ]);

        if (existingTeamMember || existingOrg) {
            return res.status(400).json({ message: "Email already registered in the system" });
        }

        const organization = await Organization.findById(organization_id);
        if (!organization) return res.status(404).json({ message: "Organization not found" });

        // Generate unique token
        const token = crypto.randomBytes(20).toString("hex");

        // Save token
        await InviteToken.create({
            email,
            token,
            role,
            organization_id,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24hr expiry
        });

        const inviteUrl = `${process.env.FRONTEND_URL}/register?token=${token}`;
        const message = `You have been invited to join ${organization.name}.\n\nRegister here: ${inviteUrl}`;

        await sendEmail(email, "You're Invited!", message);

        res.status(200).json({ message: "Invite sent successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json( err );
    }
};

export const registerWithToken = async (req, res) => {
    const { token, name, email, password } = req.body;
    if(!token || !name || !email || !password)
        return res.status(400).json({ message: "Invalid data" });
    try {
        const invite = await InviteToken.findOne({ token, email });

        if (!invite || invite.expiresAt < Date.now()) {
            return res.status(400).json({ message: "Invalid or expired token" });
        }

        const existing = await TeamMember.findOne({ email });
        const existingOrg = await Organization.findOne({ email });
        if (existing||existingOrg) {
            return res.status(400).json({ message: "Email already registered" });
        }

        const teamMember = new TeamMember({
            name,
            email,
            password,
            role:invite.role,
            organization_id: invite.organization_id,
        });

        await teamMember.save();
        await InviteToken.deleteOne({ _id: invite._id });

        res.status(201).json({ message: "Team member registered successfully" });
    } catch (err) {
        res.status(500).json( err);
    }
};

export const editTeamMemberProfile = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const teamMember = await TeamMember.findById(decoded.id);
        if (!teamMember || teamMember.status !== 1) return res.status(404).json({ message: "User not found" });

        const { phone, domainName ,name, password } = req.body;
        if (phone) teamMember.phone = phone;
        if (name) teamMember.email = name;
        if (domainName) teamMember.domainName = domainName;
        if (password) teamMember.password = password;

        await teamMember.save();
        res.json({ success: true, message: "Profile updated" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getTeamMembers = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const organization = await getOrganizationDetails(token);

        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const skip = (page - 1) * limit;

        const [members, total] = await Promise.all([
            TeamMember.find({ organization_id: organization._id, status: 1 })
                .select("-password")
                .skip(skip)
                .limit(limit),
            TeamMember.countDocuments({ organization_id: organization._id, status: 1 })
        ]);

        res.json({
            success: true,
            teamMembers: members,
            pagination: {
                total,
                page,
                totalPages: Math.ceil(total / limit),
                hasNextPage: skip + members.length < total,
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getDeletedTeamMembers = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const organization = await getOrganizationDetails(token);

        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const skip = (page - 1) * limit;

        const [members, total] = await Promise.all([
            TeamMember.find({ organization_id: organization._id, status: 0 })
                .select("-password")
                .skip(skip)
                .limit(limit),
            TeamMember.countDocuments({ organization_id: organization._id, status: 1 })
        ]);

        res.json({
            success: true,
            teamMembers: members,
            pagination: {
                total,
                page,
                totalPages: Math.ceil(total / limit),
                hasNextPage: skip + members.length < total,
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const loginTeamMember = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find active team member by email
        const teamMember = await TeamMember.findOne({ email, status: 1 }).select("+password");

        if (!teamMember) {
            return res.status(404).json({ success: false, message: "Team member not found or inactive" });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, teamMember.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        // Generate token
        const token = generateToken(teamMember._id);

        // Remove password from response
        const memberData = teamMember.toObject();
        delete memberData.password;

        res.json({
            success: true,
            message: "Login successful",
            token,
            teamMember: memberData,
            permissions : MODULE_PERMISSIONS
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


export const updateTeamMemberStatus = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const organization = await getOrganizationDetails(token);

        const { teamMemberId, status } = req.body;

        if (![0, 1].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status value" });
        }

        const teamMember = await TeamMember.findOne({ _id: teamMemberId, organization_id: organization._id });

        if (!teamMember) {
            return res.status(404).json({ success: false, message: "Team member not found or doesn't belong to your organization" });
        }

        teamMember.status = status;
        await teamMember.save();

        res.json({ success: true, message: `Team member ${status === 1 ? "activated" : "deactivated"} successfully` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const resetTeamMemberPassword = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const organization = await getOrganizationDetails(token);

        const { teamMemberId, newPassword } = req.body;

        if (!teamMemberId || !newPassword) {
            return res.status(400).json({ success: false, message: "Team member ID and new password are required" });
        }

        const teamMember = await TeamMember.findById(teamMemberId);

        if (!teamMember || teamMember.organization_id.toString() !== organization._id.toString()) {
            return res.status(403).json({ success: false, message: "You are not authorized to reset this password" });
        }

        teamMember.password = newPassword;

        await teamMember.save();

        res.json({ success: true, message: "Password reset successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const searchTeamMembers = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const organization = await getOrganizationDetails(token);

        const { name } = req.query;

        if (!name) {
            return res.status(400).json({ success: false, message: "Name query parameter is required" });
        }

        const teamMembers = await TeamMember.find({
            organization_id: organization._id,
            status: 1,
            name: { $regex: name, $options: "i" } // case-insensitive search
        }).select("-password"); // exclude password

        res.json({ success: true, teamMembers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getMyOrganizationTeamMembers = async (req, res) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const teamMember = await TeamMember.findById(decoded.id);
      if (!teamMember || teamMember.status !== 1) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
  
      const members = await TeamMember.find({
        organization_id: teamMember.organization_id,
        status: 1,
      }).select("-password");
  
      res.json({ success: true, teamMembers: members });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  export const getTeamMemberById = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get the requesting user
        const requester = await TeamMember.findById(decoded.id);
        if (!requester || requester.status !== 1) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const { id } = req.params;

        // Get the team member by id
        const member = await TeamMember.findById(id).select("-password");

        // Check if the member exists and belongs to same organization
        if (!member || member.organization_id.toString() !== requester.organization_id.toString()) {
            return res.status(403).json({ success: false, message: "Team Member not found" });
        }

        res.json({ success: true, teamMember: member });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getOrganization = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ success: false, message: "No token provided" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const teamMember = await TeamMember.findById(decoded.id);

        if (!teamMember) {
            return res.status(404).json({ success: false, message: "Team member not found" });
        }

        const organization = await Organization.findById(teamMember.organization_id);
        if (!organization) {
            return res.status(404).json({ success: false, message: "Organization not found" });
        }

        const orgData = organization.toObject();
        delete orgData.password;
        delete orgData.plan_id;
        delete orgData.plan_expire_date;
        delete orgData.status;
        delete orgData.createdAt;
        delete orgData.updatedAt;
        delete orgData.gstNo;
        delete orgData._id;

        res.json({ success: true, organization: orgData });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const superadminloginTeamMember = async (req, res) => {
    try {
        const { id } = req.params;
        const teamMember = await TeamMember.findById(id)

        // Generate token
        const token = generateToken(teamMember._id);

        // Remove password from response
        const memberData = teamMember.toObject();
        delete memberData.password;

        res.json({
            success: true,
            message: "Login successful",
            token,
            teamMember: memberData,
            permissions : MODULE_PERMISSIONS
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

