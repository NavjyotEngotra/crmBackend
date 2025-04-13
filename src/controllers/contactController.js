import Contact from "../models/ContactModel.js";
import Organization from "../models/OrganizationModel.js";
import TeamMember from "../models/TeamMemberModel.js";
import jwt from "jsonwebtoken";
import { getUserInfo } from "../utilities/getUserInfo.js";

// Create Contact
export const createContact = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const { name, phoneno, address, pincode, owner_id, email,company_id,title } = req.body;


            const existingCompany = await Contact.findOne({
                    organization_id: info.user.organization_id || info.user._id,
                    email: email, // case-insensitive match
                });
        
                if (existingCompany) {
                    return res.status(409).json({
                        success: false,
                        message: "Contact with the same email already exists"
                    });
                }

        const newContact = new Contact({
            organization_id: info.user.organization_id || info.user._id,
            name,
            email,
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
        res.status(201).json({ success: true, message: "Contact created successfully", contact: newContact });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update Contact
export const updateContact = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const { id } = req.params;
        const updateData = { ...req.body };

        const contact = await Contact.findById(id);
        if (!contact || contact.organization_id.toString() !== (info.user.organization_id||info.user._id).toString())
            return res.status(404).json({ success: false, message: "Contact not found" });

        const existingCompany = await Contact.findOne({
            organization_id: info.user.organization_id||info.user._id,
            email: updateData.email, // case-insensitive match
        });

        if (existingCompany) {
            return res.status(409).json({
                success: false,
                message: "Contact with the same email already exists"
            });
        }

        //  Prevent organization_id from being updated
        delete updateData.organization_id;

        updateData.updatedBy = info.user._id;

        const updatedContact = await Contact.findByIdAndUpdate(id, updateData, { new: true });
        res.json({ success: true, message: "Contact updated", contact: updatedContact });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getContacts = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const organizationId = info.user.organization_id || info.user.id;

        // Get by ID
        const contactId = req.query.id;
        if (contactId) {
            const contact = await Contact.findOne({ _id: contactId, organization_id: organizationId });
            if (!contact) {
                return res.status(404).json({ success: false, message: "Contact not found" });
            }
            return res.json({ success: true, contact });
        }

        // Pagination and filters
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const skip = (page - 1) * limit;

        const status = req.query.status !== undefined ? parseInt(req.query.status) : 1;
        const search = req.query.search?.trim();

        const query = { organization_id: organizationId };
        if (!isNaN(status)) query.status = status;
        if (search) query.name = { $regex: search, $options: "i" };

        const [contacts, totalCount] = await Promise.all([
            Contact.find(query).skip(skip).limit(limit),
            Contact.countDocuments(query)
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            success: true,
            contacts,
            pagination: {
                total: totalCount,
                page,
                limit,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get deleted contacts
export const getDeletedContacts = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
         const info = await getUserInfo(token);
 
         if (!info || info.user.status !== 1) {
             return res.status(401).json({ success: false, message: "Unauthorized" });
         }


      const page = parseInt(req.query.page) || 1;
      const limit = 50;
      const skip = (page - 1) * limit;

      const contacts = await Contact.find({
          organization_id: info.user.organization_id||info.user.id,
          status: 0
      })
      .skip(skip)
      .limit(limit);

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
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }


        const { name } = req.query;

        if (!name) {
            return res.status(400).json({ success: false, message: "Name query parameter is required" });
        }

        const contacts = await Contact.find({
            organization_id: info.user.organization_id || info.user.id,
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