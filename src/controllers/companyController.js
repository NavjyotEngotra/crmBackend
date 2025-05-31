import Company from "../models/CompanyModel.js";
import TeamMember from "../models/TeamMemberModel.js";
import jwt from "jsonwebtoken";
import { getUserInfo } from "../utilities/getUserInfo.js";
import Contact from "../models/ContactModel.js"; // import your Contact model


// Create Company
export const createCompany = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const { name, description, address, pincode, website, gstNo, owner_id, email ,phone } = req.body;

        // Check for duplicate name in same organization
        const existingCompany = await Company.findOne({
            organization_id: info.user.organization_id || info.user._id,
            name: { $regex: new RegExp(`^${name}$`, 'i') }, // case-insensitive match
        });

        if (existingCompany) {
            return res.status(409).json({
                success: false,
                message: "Company with the same name already exists"
            });
        }

        const newCompany = new Company({
            organization_id: info.user.organization_id || info.user._id,
            name,
            description,
            address,
            pincode,
            email,
            website,
            gstNo,
            phone,
            owner_id,
            createdBy: info.user._id,
            updatedBy: info.user._id,
        });

        await newCompany.save();

        res.status(201).json({ success: true, message: "Company created", company: newCompany });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getCompanies = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const organizationId = info.user.organization_id || info.user._id;

        // Get single company by ID and its contacts
        const companyId = req.query.id;
        if (companyId) {
            const company = await Company.findOne({ _id: companyId, organization_id: organizationId });
            if (!company) {
                return res.status(404).json({ success: false, message: "Company not found" });
            }

            const contacts = await Contact.find({ company_id: companyId, organization_id: organizationId });

            return res.json({
                success: true,
                company,
                contacts
            });
        }

        // List companies with pagination + filters
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const skip = (page - 1) * limit;

        const status = req.query.status !== undefined ? parseInt(req.query.status) : 1;
        const search = req.query.search?.trim();

        const query = { organization_id: organizationId };
        if (!isNaN(status)) query.status = status;
        if (search) query.name = { $regex: search, $options: "i" };

        const [companies, total] = await Promise.all([
            Company.find(query).skip(skip).limit(limit),
            Company.countDocuments(query)
        ]);

        const totalPages = Math.ceil(total / limit);

        res.json({
            success: true,
            companies,
            pagination: {
                total,
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

// Get all active companies (paginated)
export const getDeletedCompanies = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const skip = (page - 1) * limit;

        const [companies, total] = await Promise.all([
            Company.find({ organization_id: (info.user.organization_id || info.user._id), status: 0 })
                .skip(skip)
                .limit(limit),
            Company.countDocuments({ organization_id: (info.user.organization_id || info.user._id), status: 0 })
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

        const contacts = await Contact.find({
            company_id: company._id,
            organization_id: teamMember.organization_id
        });

        res.json({
            success: true,
            company,
            contacts
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update company
export const updateCompany = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const { id } = req.params;
        const updateData = { ...req.body };
        delete updateData.organization_id;

        const company = await Company.findById(id);

        if (!company || company.organization_id.toString() !== (info.user.organization_id||info.user._id).toString()) {
            return res.status(403).json({ success: false, message: "Company not found" });
        }

        // 🔒 Check for uniqueness of name and code within the same organization
        if (updateData.name) {
            const duplicateProduct = await Company.findOne({
                _id: { $ne: id },
                organization_id: info.user.organization_id||info.user._id,
                $or: [
                    updateData.name ? { name: updateData.name } : {},
                ],
            });

            if (duplicateProduct) {
                return res.status(400).json({
                    success: false,
                    message: "company already exists in your organization",
                });
            }
        }

        updateData.updatedBy = info.user._id;

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
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const { name } = req.query;
        if (!name) {
            return res.status(400).json({ success: false, message: "Query parameter 'name' is required" });
        }

        const companies = await Company.find({
            organization_id: info.user.organization_id || info.user._id,
            name: { $regex: name, $options: "i" }
        }).select("-__v");

        res.json({ success: true, companies });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Companies Owned by Logged-In Team Member
export const getOwnedCompanies = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ success: false, message: "Token missing" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const teamMember = await TeamMember.findById(decoded.id);

        if (!teamMember || teamMember.status !== 1)
            return res.status(401).json({ success: false, message: "Unauthorized" });

        const companies = await Company.find({
            organization_id: teamMember.organization_id,
            owner_id: teamMember._id,
            status: 1, // only active contacts
        });

        res.json({ success: true, companies });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};