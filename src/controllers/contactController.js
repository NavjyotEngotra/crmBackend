import Contact from "../models/ContactModel.js";
import Organization from "../models/OrganizationModel.js";
import TeamMember from "../models/TeamMemberModel.js";
import jwt from "jsonwebtoken";

// Create Contact
export const createContact = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const teamMember = await TeamMember.findById(decoded.id);

        if (!teamMember || teamMember.status !== 1)
            return res.status(401).json({ success: false, message: "Unauthorized" });

        const organization = await Organization.findById(teamMember.organization_id);
        const { name, email, phoneno, owner_id,  title, company_id,  address, pincode } = req.body;

        const newContact = new Contact({
            organization_id: organization._id,
            name,
            email,
            phoneno,
            owner_id,
            title,
            company_id,
            address,
            pincode,
            createdBy: teamMember._id,
            updatedBy: teamMember._id,
        });

        await newContact.save();
        res.status(201).json({ success: true, message: "Contact created successfully", contact: newContact });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update Contact
export const updateContact = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const teamMember = await TeamMember.findById(decoded.id);

        if (!teamMember || teamMember.status !== 1)
            return res.status(401).json({ success: false, message: "Unauthorized" });

        const organization = await Organization.findById(teamMember.organization_id);
        const { id } = req.params;
        const updateData = { ...req.body };

        const contact = await Contact.findById(id);
        if (!contact || contact.organization_id.toString() !== organization._id.toString())
            return res.status(404).json({ success: false, message: "Contact not found" });

        //  Prevent organization_id from being updated
        delete updateData.organization_id;
        delete updateData.status;

        updateData.updatedBy = teamMember._id;

        const updatedContact = await Contact.findByIdAndUpdate(id, updateData, { new: true });
        res.json({ success: true, message: "Contact updated", contact: updatedContact });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all active contacts (paginated)
export const getContacts = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const teamMember = await TeamMember.findById(decoded.id);
        const organization = await Organization.findById(teamMember.organization_id);


        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const skip = (page - 1) * limit;

        const contacts = await Contact.find({
            organization_id: organization._id,
            status: 1
        })
        .skip(skip)
        .limit(limit);

        res.json({ success: true, contacts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get deleted contacts
export const getDeletedContacts = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const teamMember = await TeamMember.findById(decoded.id);
        const organization = await Organization.findById(teamMember.organization_id);


        const contacts = await Contact.find({
            organization_id: organization._id,
            status: 0
        });

        res.json({ success: true, contacts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Soft delete contact
export const updateStatus = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const teamMember = await TeamMember.findById(decoded.id);
        const organization = await Organization.findById(teamMember.organization_id);


        const { id } = req.params;

        const contact = await Contact.findById(id);
        if (!contact || contact.organization_id.toString() !== organization._id.toString())
            return res.status(404).json({ success: false, message: "Contact not found" });

        const { status } = req.body;


        contact.status = status;
        contact.updatedBy = teamMember._id;

        await contact.save();
        res.json({ success: true, message: "status updated",contact });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


export const searchContactsByName = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const teamMember = await TeamMember.findById(decoded.id);

        if (!teamMember || teamMember.status !== 1) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const { name } = req.query;

        if (!name) {
            return res.status(400).json({ success: false, message: "Name query parameter is required" });
        }

        const contacts = await Contact.find({
            organization_id: teamMember.organization_id,
            name: { $regex: name, $options: "i" }, // case-insensitive partial match
            status: 1, // only active
        }).select("-__v");

        res.json({ success: true, contacts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Contact by ID
export const getContactById = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const teamMember = await TeamMember.findById(decoded.id);

        if (!teamMember || teamMember.status !== 1)
            return res.status(401).json({ success: false, message: "Unauthorized" });

        const { id } = req.params;

        const contact = await Contact.findById(id);

        if (!contact || contact.organization_id.toString() !== teamMember.organization_id.toString()) {
            return res.status(403).json({ success: false, message: "Contact not found" });
        }

        res.json({ success: true, contact });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Contacts Owned by Logged-In Team Member
export const getOwnedContacts = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ success: false, message: "Token missing" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const teamMember = await TeamMember.findById(decoded.id);

        if (!teamMember || teamMember.status !== 1)
            return res.status(401).json({ success: false, message: "Unauthorized" });

        const contacts = await Contact.find({
            organization_id: teamMember.organization_id,
            owner_id: teamMember._id,
            status: 1, // only active contacts
        });

        res.json({ success: true, contacts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};