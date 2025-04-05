import Company from "../models/CompanyModel.js";
import TeamMember from "../models/TeamMemberModel.js";
import jwt from "jsonwebtoken";

// Create Company
export const createCompany = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const teamMember = await TeamMember.findById(decoded.id);

        if (!teamMember || teamMember.status !== 1)
            return res.status(401).json({ success: false, message: "Unauthorized" });

        const { name, description, address, pincode, website, gstNo, owner_id } = req.body;

        // Check for duplicate name in same organization
        const existingCompany = await Company.findOne({
            organization_id: teamMember.organization_id,
            name: { $regex: new RegExp(`^${name}$`, 'i') }, // case-insensitive match
        });

        if (existingCompany) {
            return res.status(409).json({
                success: false,
                message: "Company with the same name already exists"
            });
        }

        const newCompany = new Company({
            organization_id: teamMember.organization_id,
            name,
            description,
            address,
            pincode,
            website,
            gstNo,
            owner_id,
            createdBy: teamMember._id,
            updatedBy: teamMember._id,
        });

        await newCompany.save();

        res.status(201).json({ success: true, message: "Company created", company: newCompany });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all active companies (paginated)
export const getCompanies = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const teamMember = await TeamMember.findById(decoded.id);

        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const skip = (page - 1) * limit;

        const [companies, total] = await Promise.all([
            Company.find({ organization_id: teamMember.organization_id, status: 1 })
                .skip(skip)
                .limit(limit),
            Company.countDocuments({ organization_id: teamMember.organization_id, status: 1 })
        ]);

        res.json({
            success: true,
            companies,
            pagination: {
                total,
                page,
                totalPages: Math.ceil(total / limit),
                hasNextPage: skip + companies.length < total,
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all active companies (paginated)
export const getDeletedCompanies = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const teamMember = await TeamMember.findById(decoded.id);

        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const skip = (page - 1) * limit;

        const [companies, total] = await Promise.all([
            Company.find({ organization_id: teamMember.organization_id, status: 0 })
                .skip(skip)
                .limit(limit),
            Company.countDocuments({ organization_id: teamMember.organization_id, status: 1 })
        ]);

        res.json({
            success: true,
            companies,
            pagination: {
                total,
                page,
                totalPages: Math.ceil(total / limit),
                hasNextPage: skip + companies.length < total,
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get company by ID
export const getCompanyById = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const teamMember = await TeamMember.findById(decoded.id);

        const company = await Company.findById(req.params.id);

        if (!company || company.organization_id.toString() !== teamMember.organization_id.toString()) {
            return res.status(403).json({ success: false, message: "Company not found" });
        }

        res.json({ success: true, company });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update company
export const updateCompany = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const teamMember = await TeamMember.findById(decoded.id);

        const { id } = req.params;
        const updateData = { ...req.body };
        delete updateData.organization_id;
        delete updateData.status;

        const company = await Company.findById(id);

        if (!company || company.organization_id.toString() !== teamMember.organization_id.toString()) {
            return res.status(403).json({ success: false, message: "Company not found" });
        }

        updateData.updatedBy = teamMember._id;

        const updatedCompany = await Company.findByIdAndUpdate(id, updateData, { new: true });

        res.json({ success: true, message: "Company updated", company: updatedCompany });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Soft delete company
export const updateStatus = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const teamMember = await TeamMember.findById(decoded.id);

        const { id } = req.params;

        const company = await Company.findById(id);
        if (!company || company.organization_id.toString() !== teamMember.organization_id.toString()) {
            return res.status(403).json({ success: false, message: "Company not found" });
        }
        const { status } = req.body;
        company.status = status;
        company.updatedBy = teamMember._id;

        await company.save();

        res.json({ success: true, message: "status updated", company });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const searchCompaniesByName = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const teamMember = await TeamMember.findById(decoded.id);

        if (!teamMember || teamMember.status !== 1) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const { name } = req.query;
        if (!name) {
            return res.status(400).json({ success: false, message: "Query parameter 'name' is required" });
        }

        const companies = await Company.find({
            organization_id: teamMember.organization_id,
            name: { $regex: name, $options: "i" }
        }).select("-__v");

        res.json({ success: true, companies });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};