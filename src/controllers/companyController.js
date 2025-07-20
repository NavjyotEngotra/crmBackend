import Company from "../models/CompanyModel.js";
import TeamMember from "../models/TeamMemberModel.js";
import jwt from "jsonwebtoken";
import { getUserInfo } from "../utilities/getUserInfo.js";
import Contact from "../models/ContactModel.js";
import responseSender from "../utilities/responseSender.js";

// Create Company
export const createCompany = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const info = await getUserInfo(token);

    if (!info || info.user.status !== 1) {
      return responseSender(res, 401, false, null, "Unauthorized");
    }

    const {
      name, description, address, pincode, website, gstNo,
      owner_id, email, phone,
    } = req.body;

    const existingCompany = await Company.findOne({
      organization_id: info.user.organization_id || info.user._id,
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (existingCompany) {
      return responseSender(res, 409, false, null, "Company with the same name already exists");
    }

    const newCompany = new Company({
      organization_id: info.user.organization_id || info.user._id,
      name, description, address, pincode, email, website,
      gstNo, phone, owner_id,
      createdBy: info.user._id,
      updatedBy: info.user._id,
    });

    await newCompany.save();

    return responseSender(res, 201, true, { company: newCompany }, "Company created");
  } catch (error) {
    return responseSender(res, 500, false, null, error.message);
  }
};

// Get all or one company
export const getCompanies = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const info = await getUserInfo(token);

    if (!info || info.user.status !== 1) {
      return responseSender(res, 401, false, null, "Unauthorized");
    }

    const organizationId = info.user.organization_id || info.user._id;
    const populateFields = [
      { path: "contactList" },
      { path: "owner_id", select: "name email" },
      { path: "organization_id", select: "name email" },
      { path: "createdBy", select: "name email" },
      { path: "updatedBy", select: "name email" },
    ];

    if (req.query.id) {
      const company = await Company.findOne({
        _id: req.query.id,
        organization_id: organizationId,
      }).populate(populateFields);

      if (!company) {
        return responseSender(res, 404, false, null, "Company not found");
      }

      return responseSender(res, 200, true, { company });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const skip = (page - 1) * limit;
    const status = req.query.status !== undefined ? parseInt(req.query.status) : 1;
    const search = req.query.search?.trim();

    const query = { organization_id: organizationId };
    if (!isNaN(status)) query.status = status;
    if (search) query.name = { $regex: search, $options: "i" };

    const [companies, total] = await Promise.all([
      Company.find(query).skip(skip).limit(limit).populate(populateFields),
      Company.countDocuments(query),
    ]);

    return responseSender(res, 200, true, {
      companies,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    return responseSender(res, 500, false, null, error.message);
  }
};

// Get deleted companies
export const getDeletedCompanies = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const info = await getUserInfo(token);

    if (!info || info.user.status !== 1) {
      return responseSender(res, 401, false, null, "Unauthorized");
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const skip = (page - 1) * limit;

    const [companies, total] = await Promise.all([
      Company.find({
        organization_id: info.user.organization_id || info.user._id,
        status: 0,
      }).skip(skip).limit(limit),
      Company.countDocuments({
        organization_id: info.user.organization_id || info.user._id,
        status: 0,
      }),
    ]);

    return responseSender(res, 200, true, {
      companies,
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
        hasNextPage: skip + companies.length < total,
      },
    });
  } catch (error) {
    return responseSender(res, 500, false, null, error.message);
  }
};

// Get single company by ID (team member)
export const getCompanyById = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const teamMember = await TeamMember.findById(decoded.id);

    const company = await Company.findById(req.params.id);

    if (!company || company.organization_id.toString() !== teamMember.organization_id.toString()) {
      return responseSender(res, 403, false, null, "Company not found");
    }

    const contacts = await Contact.find({
      company_id: company._id,
      organization_id: teamMember.organization_id,
    });

    return responseSender(res, 200, true, { company, contacts });
  } catch (error) {
    return responseSender(res, 500, false, null, error.message);
  }
};

// Update company
export const updateCompany = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const info = await getUserInfo(token);

    if (!info || info.user.status !== 1) {
      return responseSender(res, 401, false, null, "Unauthorized");
    }

    const { id } = req.params;
    const updateData = { ...req.body };
    delete updateData.organization_id;

    const company = await Company.findById(id);
    const orgId = info.user.organization_id || info.user._id;

    if (!company || company.organization_id.toString() !== orgId.toString()) {
      return responseSender(res, 403, false, null, "Company not found");
    }

    if (updateData.name) {
      const duplicate = await Company.findOne({
        _id: { $ne: id },
        organization_id: orgId,
        name: updateData.name,
      });

      if (duplicate) {
        return responseSender(res, 400, false, null, "Company already exists in your organization");
      }
    }

    updateData.updatedBy = info.user._id;

    const updated = await Company.findByIdAndUpdate(id, updateData, { new: true });

    return responseSender(res, 200, true, { company: updated }, "Company updated");
  } catch (error) {
    return responseSender(res, 500, false, null, error.message);
  }
};

// Soft delete / status update
export const updateStatus = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const teamMember = await TeamMember.findById(decoded.id);

    const { id } = req.params;
    const { status } = req.body;

    const company = await Company.findById(id);
    if (!company || company.organization_id.toString() !== teamMember.organization_id.toString()) {
      return responseSender(res, 403, false, null, "Company not found");
    }

    company.status = status;
    company.updatedBy = teamMember._id;

    await company.save();

    return responseSender(res, 200, true, { company }, "Status updated");
  } catch (error) {
    return responseSender(res, 500, false, null, error.message);
  }
};

// Search companies by name
export const searchCompaniesByName = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const info = await getUserInfo(token);

    if (!info || info.user.status !== 1) {
      return responseSender(res, 401, false, null, "Unauthorized");
    }

    const { name } = req.query;
    if (!name) {
      return responseSender(res, 400, false, null, "Query parameter 'name' is required");
    }

    const companies = await Company.find({
      organization_id: info.user.organization_id || info.user._id,
      name: { $regex: name, $options: "i" },
    }).select("-__v");

    return responseSender(res, 200, true, { companies });
  } catch (error) {
    return responseSender(res, 500, false, null, error.message);
  }
};

// Get companies owned by current team member
export const getOwnedCompanies = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return responseSender(res, 401, false, null, "Token missing");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const teamMember = await TeamMember.findById(decoded.id);

    if (!teamMember || teamMember.status !== 1) {
      return responseSender(res, 401, false, null, "Unauthorized");
    }

    const companies = await Company.find({
      organization_id: teamMember.organization_id,
      owner_id: teamMember._id,
      status: 1,
    });

    return responseSender(res, 200, true, { companies });
  } catch (error) {
    return responseSender(res, 500, false, null, error.message);
  }
};
