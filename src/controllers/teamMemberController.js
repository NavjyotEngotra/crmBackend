import TeamMember from "../models/TeamMemberModel.js";
import Organization from "../models/OrganizationModel.js";
import { getOrganizationDetails } from "../utilities/getOrganizationDetails.js";
import { generateToken } from "../utilities/generateToken.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import InviteToken from "../models/InviteTokenModel.js";
import { sendEmail } from "../utilities/sendEmail.js";
import { MODULE_PERMISSIONS } from "../constants.js";
import { getUserInfo } from "../utilities/getUserInfo.js";
import responseSender from "../utilities/responseSender.js";

export const sendInvite = async (req, res) => {
    try {
        const { email, role } = req.body;
        const jwttoken = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(jwttoken, process.env.JWT_SECRET);
        const { _id: organization_id } = await Organization.findById(decoded.id);
        if (!organization_id) return responseSender(res, 401, false, null, "Unauthorized");

        const [existingTeamMember, existingOrg] = await Promise.all([
            TeamMember.findOne({ email }),
            Organization.findOne({ email }),
        ]);

        if (existingTeamMember || existingOrg) {
            return responseSender(res, 400, false, null, "Email already registered in the system");
        }

        const organization = await Organization.findById(organization_id);
        if (!organization) return responseSender(res, 404, false, null, "Organization not found");

        const token = crypto.randomBytes(20).toString("hex");

        await InviteToken.create({
            email,
            token,
            role,
            organization_id,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        });

        const inviteUrl = `${process.env.FRONTEND_URL}/register?token=${token}`;
        const message = `You have been invited to join ${organization.name}.\n\nRegister here: ${inviteUrl}`;

        await sendEmail(email, "You're Invited!", message);

        return responseSender(res, 200, true, null, "Invite sent successfully");
    } catch (err) {
        console.error(err);
        return responseSender(res, 500, false, err.message, "Internal server error");
    }
};

export const registerWithToken = async (req, res) => {
    const { token, name, email, password } = req.body;
    if (!token || !name || !email || !password)
        return responseSender(res, 400, false, null, "Invalid data");

    try {
        const invite = await InviteToken.findOne({ token, email });
        if (!invite || invite.expiresAt < Date.now())
            return responseSender(res, 400, false, null, "Invalid or expired token");

        const existing = await TeamMember.findOne({ email });
        const existingOrg = await Organization.findOne({ email });
        if (existing || existingOrg)
            return responseSender(res, 400, false, null, "Email already registered");

        const teamMember = new TeamMember({
            name,
            email,
            password,
            role: invite.role,
            organization_id: invite.organization_id,
        });

        await teamMember.save();
        await InviteToken.deleteOne({ _id: invite._id });

        return responseSender(res, 201, true, null, "Team member registered successfully");
    } catch (err) {
        return responseSender(res, 500, false, err.message, "Internal server error");
    }
};

export const editTeamMemberProfile = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const teamMember = await TeamMember.findById(decoded.id);
        if (!teamMember || teamMember.status !== 1)
            return responseSender(res, 404, false, null, "User not found");

        const { phone, domainName, name, password } = req.body;
        if (phone) teamMember.phone = phone;
        if (name) teamMember.name = name;
        if (domainName) teamMember.domainName = domainName;
        if (password) teamMember.password = password;

        await teamMember.save();
        return responseSender(res, 200, true, null, "Profile updated");
    } catch (error) {
        return responseSender(res, 500, false, error.message, "Error updating profile");
    }
};

export const getTeamMembers = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info?.user || info.user.status !== 1) {
            return responseSender(res, 401, false, null, "Unauthorized");
        }

        const organizationId = info.user.organization_id || info.user._id;
        const memberId = req.query.id;

        if (memberId) {
            const member = await TeamMember.findOne({ _id: memberId, organization_id: organizationId }).select("-password");
            if (!member) return responseSender(res, 404, false, null, "Team member not found");
            return responseSender(res, 200, true, { teamMember: member });
        }

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(parseInt(req.query.limit) || 25, 100);
        const skip = (page - 1) * limit;
        const status = req.query.status !== undefined ? parseInt(req.query.status) : undefined;
        const search = req.query.search?.trim();

        const query = { organization_id: organizationId };
        if (!isNaN(status)) query.status = status;
        if (search) query.name = { $regex: search, $options: "i" };

        const [members, total] = await Promise.all([
            TeamMember.find(query).select("-password").skip(skip).limit(limit),
            TeamMember.countDocuments(query),
        ]);

        return responseSender(res, 200, true, {
            teamMembers: members,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page < Math.ceil(total / limit),
                hasPreviousPage: page > 1
            }
        });
    } catch (error) {
        return responseSender(res, 500, false, error.message, "Server error");
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
            TeamMember.find({ organization_id: organization._id, status: 0 }).select("-password").skip(skip).limit(limit),
            TeamMember.countDocuments({ organization_id: organization._id, status: 1 }),
        ]);

        return responseSender(res, 200, true, {
            teamMembers: members,
            pagination: {
                total,
                page,
                totalPages: Math.ceil(total / limit),
                hasNextPage: skip + members.length < total
            }
        });
    } catch (error) {
        return responseSender(res, 500, false, error.message, "Server error");
    }
};

export const loginTeamMember = async (req, res) => {
    try {
        const { email, password } = req.body;
        const teamMember = await TeamMember.findOne({ email, status: 1 }).select("+password");

        if (!teamMember)
            return responseSender(res, 404, false, null, "Team member not found or inactive");

        const isMatch = await bcrypt.compare(password, teamMember.password);
        if (!isMatch)
            return responseSender(res, 401, false, null, "Invalid credentials");

        const token = generateToken(teamMember._id);
        const memberData = teamMember.toObject();
        delete memberData.password;

        return responseSender(res, 200, true, {
            token,
            teamMember: memberData,
            permissions: MODULE_PERMISSIONS
        }, "Login successful");
    } catch (error) {
        return responseSender(res, 500, false, error.message);
    }
};

export const updateTeamMemberStatus = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const organization = await getOrganizationDetails(token);

        const { teamMemberId, status } = req.body;
        if (![0, 1].includes(status))
            return responseSender(res, 400, false, null, "Invalid status value");

        const teamMember = await TeamMember.findOne({ _id: teamMemberId, organization_id: organization._id });
        if (!teamMember)
            return responseSender(res, 404, false, null, "Team member not found");

        teamMember.status = status;
        await teamMember.save();

        return responseSender(res, 200, true, null, `Team member ${status === 1 ? "activated" : "deactivated"} successfully`);
    } catch (error) {
        return responseSender(res, 500, false, error.message);
    }
};

export const resetTeamMemberPassword = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const organization = await getOrganizationDetails(token);

        const { teamMemberId, newPassword } = req.body;
        if (!teamMemberId || !newPassword)
            return responseSender(res, 400, false, null, "Team member ID and new password are required");

        const teamMember = await TeamMember.findById(teamMemberId);
        if (!teamMember || teamMember.organization_id.toString() !== organization._id.toString())
            return responseSender(res, 403, false, null, "Unauthorized to reset password");

        teamMember.password = newPassword;
        await teamMember.save();

        return responseSender(res, 200, true, null, "Password reset successfully");
    } catch (error) {
        return responseSender(res, 500, false, error.message);
    }
};

export const searchTeamMembers = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const organization = await getOrganizationDetails(token);

        const { name } = req.query;
        if (!name)
            return responseSender(res, 400, false, null, "Name query parameter is required");

        const teamMembers = await TeamMember.find({
            organization_id: organization._id,
            status: 1,
            name: { $regex: name, $options: "i" }
        }).select("-password");

        return responseSender(res, 200, true, { teamMembers });
    } catch (error) {
        return responseSender(res, 500, false, error.message);
    }
};

export const getMyOrganizationTeamMembers = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const teamMember = await TeamMember.findById(decoded.id);
        if (!teamMember || teamMember.status !== 1)
            return responseSender(res, 401, false, null, "Unauthorized");

        const members = await TeamMember.find({
            organization_id: teamMember.organization_id,
            status: 1,
        }).select("-password");

        return responseSender(res, 200, true, { teamMembers: members });
    } catch (error) {
        return responseSender(res, 500, false, error.message);
    }
};

export const getTeamMemberById = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const requester = await TeamMember.findById(decoded.id);
        if (!requester || requester.status !== 1)
            return responseSender(res, 401, false, null, "Unauthorized");

        const { id } = req.params;
        const member = await TeamMember.findById(id).select("-password");

        if (!member || member.organization_id.toString() !== requester.organization_id.toString())
            return responseSender(res, 403, false, null, "Team Member not found");

        return responseSender(res, 200, true, { teamMember: member });
    } catch (error) {
        return responseSender(res, 500, false, error.message);
    }
};

export const getOrganization = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1)
            return responseSender(res, 401, false, null, "Unauthorized");

        const organization = await Organization.findById(info.user.organization_id || info.user._id);
        if (!organization)
            return responseSender(res, 404, false, null, "Organization not found");

        const orgData = organization.toObject();
        delete orgData.password;
        delete orgData.plan_id;
        delete orgData.plan_expire_date;
        delete orgData.status;
        delete orgData.createdAt;
        delete orgData.updatedAt;
        delete orgData.gstNo;
        delete orgData._id;

        return responseSender(res, 200, true, { organization: orgData });
    } catch (error) {
        return responseSender(res, 500, false, error.message);
    }
};

export const superadminloginTeamMember = async (req, res) => {
    try {
        const { id } = req.params;
        const teamMember = await TeamMember.findById(id);

        const token = generateToken(teamMember._id);
        const memberData = teamMember.toObject();
        delete memberData.password;

        return responseSender(res, 200, true, {
            token,
            teamMember: memberData,
            permissions: MODULE_PERMISSIONS
        }, "Login successful");
    } catch (error) {
        return responseSender(res, 500, false, error.message);
    }
};
