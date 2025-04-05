import TeamMember from "../models/TeamMemberModel.js";
import { getOrganizationDetails } from "../utilities/getOrganizationDetails.js"
import {generateToken} from "../utilities/generateToken.js"
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const createTeamMember = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const organization = await getOrganizationDetails(token);

        const { name, password, role } = req.body;

        // Check if name already exists for this organization
        const existing = await TeamMember.findOne({
            organization_id: organization._id,
            name: name.trim()
        });

        if (existing) {
            return res.status(400).json({ success: false, message: "Team member username must be unique within the organization" });
        }

        const newMember = new TeamMember({
            name: name.trim(),
            password,
            role,
            organization_id: organization._id,
            organizationName: organization.name,
        });

        await newMember.save();
        res.status(201).json({ success: true, message: "Team member created", newMember });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


export const editTeamMemberProfile = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const teamMember = await TeamMember.findById(decoded.id);
        if (!teamMember || teamMember.status !== 1) return res.status(404).json({ message: "User not found" });

        const {email, phone, domainName ,full_name , password } = req.body;
        if (phone) teamMember.phone = phone;
        if (email) teamMember.email = email;
        if (full_name) teamMember.full_name = full_name;
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

        const members = await TeamMember.find({ organization_id: organization._id, status: 1 }).select("-password");
        res.json({ success: true, teamMembers: members });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getDeletedTeamMembers = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const organization = await getOrganizationDetails(token);

        const members = await TeamMember.find({ organization_id: organization._id, status: 0 }).select("-password");
        res.json({ success: true, teamMembers: members });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const loginTeamMember = async (req, res) => {
    try {
        const { name, password } = req.body;

        // Find active team member by email
        const teamMember = await TeamMember.findOne({ name, status: 1 }).select("+password");

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