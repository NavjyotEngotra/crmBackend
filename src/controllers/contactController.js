import Contact from "../models/ContactModel.js";
import Organization from "../models/OrganizationModel.js";
import TeamMember from "../models/TeamMemberModel.js";
import jwt from "jsonwebtoken";
import { getUserInfo } from "../utilities/getUserInfo.js";
import responseSender from "../utilities/responseSender.js";

// Create Contact
export const createContact = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);
        if (!info || info.user.status !== 1)
            return responseSender(res, 401, false, null, "Unauthorized");

        const { name, designation, phoneno, address, pincode, owner_id, email, company_id, title } = req.body;

        const existing = await Contact.findOne({
            organization_id: info.user.organization_id || info.user._id,
            email: email,
        });

        if (existing) {
            return responseSender(res, 409, false, null, "Contact with the same email already exists");
        }

        const newContact = new Contact({
            organization_id: info.user.organization_id || info.user._id,
            name,
            email,
            designation,
            phoneno,
            owner_id,
            title,
            company_id,
            address,
            pincode,
            createdBy: info.user._id,
            updatedBy: info.user._id,
        });

        await newContact.save();
        return responseSender(res, 201, true, { contact: newContact }, "Contact created successfully");
    } catch (error) {
        return responseSender(res, 500, false, null, error.message);
    }
};

// Update Contact
export const updateContact = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);
        if (!info || info.user.status !== 1)
            return responseSender(res, 401, false, null, "Unauthorized");

        const { id } = req.params;
        const updateData = { ...req.body };

        const contact = await Contact.findById(id);
        if (!contact || contact.organization_id.toString() !== (info.user.organization_id || info.user._id).toString())
            return responseSender(res, 404, false, null, "Contact not found");

        const isSameEmail = contact.email?.toLowerCase() === updateData.email?.toLowerCase();
        if (!isSameEmail) {
            const existing = await Contact.findOne({
                organization_id: info.user.organization_id || info.user._id,
                email: updateData.email,
            });
            if (existing)
                return responseSender(res, 409, false, null, "Contact with the same email already exists");
        }

        delete updateData.organization_id;
        updateData.updatedBy = info.user._id;

        const updatedContact = await Contact.findByIdAndUpdate(id, updateData, { new: true });
        return responseSender(res, 200, true, { contact: updatedContact }, "Contact updated");
    } catch (error) {
        return responseSender(res, 500, false, null, error.message);
    }
};

// Get Contacts (All or by ID)
export const getContacts = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);
        if (!info || info.user.status !== 1)
            return responseSender(res, 401, false, null, "Unauthorized");

        const organizationId = info.user.organization_id || info.user._id;
        const populateFields = [
            { path: "owner_id", select: "name email" },
            { path: "company_id", select: "name email" },
            { path: "organization_id", select: "name email" },
            { path: "createdBy", select: "name email" },
            { path: "updatedBy", select: "name email" },
        ];

        if (req.query.id) {
            const contact = await Contact.findOne({ _id: req.query.id, organization_id: organizationId }).populate(populateFields);
            if (!contact)
                return responseSender(res, 404, false, null, "Contact not found");
            return responseSender(res, 200, true, { contact }, "Contact found");
        }

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const skip = (page - 1) * limit;
        const status = req.query.status !== undefined ? parseInt(req.query.status) : 1;
        const search = req.query.search?.trim();

        const query = { organization_id: organizationId };
        if (!isNaN(status)) query.status = status;
        if (search) query.name = { $regex: search, $options: "i" };

        const [contacts, totalCount] = await Promise.all([
            Contact.find(query).skip(skip).limit(limit).populate(populateFields),
            Contact.countDocuments(query),
        ]);

        return responseSender(res, 200, true, {
            contacts,
            pagination: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit),
                hasNextPage: page * limit < totalCount,
                hasPreviousPage: page > 1
            }
        }, "Contacts fetched");
    } catch (error) {
        return responseSender(res, 500, false, null, error.message);
    }
};

// Get Deleted Contacts
export const getDeletedContacts = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);
        if (!info || info.user.status !== 1)
            return responseSender(res, 401, false, null, "Unauthorized");

        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const skip = (page - 1) * limit;

        const contacts = await Contact.find({
            organization_id: info.user.organization_id || info.user._id,
            status: 0
        }).skip(skip).limit(limit);

        return responseSender(res, 200, true, { contacts }, "Deleted contacts fetched");
    } catch (error) {
        return responseSender(res, 500, false, null, error.message);
    }
};

// Soft Delete (Update Status)
export const updateStatus = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const teamMember = await TeamMember.findById(decoded.id);
        const organization = await Organization.findById(teamMember.organization_id);

        const { id } = req.params;
        const contact = await Contact.findById(id);
        if (!contact || contact.organization_id.toString() !== organization._id.toString())
            return responseSender(res, 404, false, null, "Contact not found");

        const { status } = req.body;
        contact.status = status;
        contact.updatedBy = teamMember._id;
        await contact.save();

        return responseSender(res, 200, true, { contact }, "Status updated");
    } catch (error) {
        return responseSender(res, 500, false, null, error.message);
    }
};

// Search Contacts by Name
export const searchContactsByName = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);
        if (!info || info.user.status !== 1)
            return responseSender(res, 401, false, null, "Unauthorized");

        const { name } = req.query;
        if (!name)
            return responseSender(res, 400, false, null, "Name query parameter is required");

        const contacts = await Contact.find({
            organization_id: info.user.organization_id || info.user._id,
            name: { $regex: name, $options: "i" },
            status: 1
        }).select("-__v");

        return responseSender(res, 200, true, { contacts }, "Contacts found");
    } catch (error) {
        return responseSender(res, 500, false, null, error.message);
    }
};

// Get Contact by ID
export const getContactById = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const teamMember = await TeamMember.findById(decoded.id);
        if (!teamMember || teamMember.status !== 1)
            return responseSender(res, 401, false, null, "Unauthorized");

        const { id } = req.params;
        const contact = await Contact.findById(id);
        if (!contact || contact.organization_id.toString() !== teamMember.organization_id.toString())
            return responseSender(res, 403, false, null, "Contact not found");

        return responseSender(res, 200, true, { contact }, "Contact found");
    } catch (error) {
        return responseSender(res, 500, false, null, error.message);
    }
};

// Get Owned Contacts
export const getOwnedContacts = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const teamMember = await TeamMember.findById(decoded.id);
        if (!teamMember || teamMember.status !== 1)
            return responseSender(res, 401, false, null, "Unauthorized");

        const contacts = await Contact.find({
            organization_id: teamMember.organization_id,
            owner_id: teamMember._id,
            status: 1
        });

        return responseSender(res, 200, true, { contacts }, "Owned contacts retrieved");
    } catch (error) {
        return responseSender(res, 500, false, null, error.message);
    }
};
