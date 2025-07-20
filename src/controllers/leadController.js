import Lead from "../models/LeadModel.js";
import { getUserInfo } from "../utilities/getUserInfo.js";
import mongoose from "mongoose";
import  responseSender  from "../utilities/responseSender.js";

// Helper to populate fields
const populateLeadFields = (query) => {
  return query
    .populate("pipeline_id")
    .populate("stage_id")
    .populate("organization_id")
    .populate("product_id")
    .populate("company_id")
    .populate("contact_id")
    .populate("meeting_id")
    .populate({ path: "assigned_to", select: "-password" })
    .populate({ path: "created_by", model: "Organization", select: "-password" })
    .populate({ path: "created_by", model: "TeamMember", select: "-password" })
    .populate({ path: "updated_by", model: "Organization", select: "-password" })
    .populate({ path: "updated_by", model: "TeamMember", select: "-password" });
};

// Create Lead
export const createLead = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const info = await getUserInfo(token);

    if (!info || info.user.status !== 1) {
      return responseSender(res, 401, false, "Unauthorized");
    }

    const organizationId = info.user.organization_id || info.user._id;

    const lead = new Lead({
      ...req.body,
      organization_id: organizationId,
      created_by: info.user._id,
      created_by_model: info.role === "organization" ? "Organization" : "TeamMember",
      updated_by: info.user._id,
      updated_by_model: info.role === "organization" ? "Organization" : "TeamMember",
    });

    await lead.save();
    const populatedLead = await populateLeadFields(Lead.findById(lead._id));
    return responseSender(res, 201, true, "Lead created successfully", { lead: populatedLead });
  } catch (error) {
    return responseSender(res, 500, false, error.message);
  }
};

// Get Leads
export const getLeads = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const info = await getUserInfo(token);

    if (!info || info.user.status !== 1) {
      return responseSender(res, 401, false, "Unauthorized");
    }

    const organizationId = info.user.organization_id || info.user._id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const skip = (page - 1) * limit;

    const query = { organization_id: organizationId };
    if (req.query.status !== undefined) query.status = parseInt(req.query.status);
    else query.status = 1;
    if (req.query.pipeline_id) query.pipeline_id = new mongoose.Types.ObjectId(req.query.pipeline_id);
    if (req.query.stage_id) query.stage_id = new mongoose.Types.ObjectId(req.query.stage_id);
    if (req.query.assigned_to) query.assigned_to = new mongoose.Types.ObjectId(req.query.assigned_to);
    if (req.query.search) query.name = { $regex: req.query.search, $options: "i" };

    const [leads, totalCount] = await Promise.all([
      populateLeadFields(Lead.find(query)).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Lead.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalCount / limit);
    return responseSender(res, 200, true, "Leads fetched", {
      leads,
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
    return responseSender(res, 500, false, error.message);
  }
};

// Get Lead by ID
export const getLeadById = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const info = await getUserInfo(token);

    if (!info || info.user.status !== 1) {
      return responseSender(res, 401, false, "Unauthorized");
    }

    const organizationId = info.user.organization_id || info.user._id;
    const lead = await populateLeadFields(Lead.findOne({ _id: req.params.id, organization_id: organizationId }));

    if (!lead) {
      return responseSender(res, 404, false, "Lead not found");
    }

    return responseSender(res, 200, true, "Lead fetched", { lead });
  } catch (error) {
    return responseSender(res, 500, false, error.message);
  }
};

// Update Lead
export const updateLead = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const info = await getUserInfo(token);

    if (!info || info.user.status !== 1) {
      return responseSender(res, 401, false, "Unauthorized");
    }

    const organizationId = info.user.organization_id || info.user._id;
    const lead = await Lead.findOne({ _id: req.params.id, organization_id: organizationId });

    if (!lead) {
      return responseSender(res, 404, false, "Lead not found");
    }

    const updatedLead = await populateLeadFields(
      Lead.findByIdAndUpdate(
        req.params.id,
        {
          ...req.body,
          updated_by: info.user._id,
          updated_by_model: info.role === "organization" ? "Organization" : "TeamMember",
        },
        { new: true, runValidators: true }
      )
    );

    return responseSender(res, 200, true, "Lead updated successfully", { lead: updatedLead });
  } catch (error) {
    return responseSender(res, 500, false, error.message);
  }
};

// Update Lead Status (Soft Delete)
export const updateStatus = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const info = await getUserInfo(token);

    if (!info || info.user.status !== 1) {
      return responseSender(res, 401, false, "Unauthorized");
    }

    const organizationId = info.user.organization_id || info.user._id;
    const lead = await Lead.findOne({ _id: req.params.id, organization_id: organizationId });

    if (!lead) {
      return responseSender(res, 404, false, "Lead not found");
    }

    lead.status = req.body.status;
    lead.updated_by = info.user._id;
    lead.updated_by_model = info.role === "organization" ? "Organization" : "TeamMember";
    await lead.save();

    const populatedLead = await populateLeadFields(Lead.findById(lead._id));
    return responseSender(res, 200, true, "Lead status updated", { lead: populatedLead });
  } catch (error) {
    return responseSender(res, 500, false, error.message);
  }
};

// Get Deleted Leads
export const getDeletedLeads = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const info = await getUserInfo(token);

    if (!info || info.user.status !== 1) {
      return responseSender(res, 401, false, "Unauthorized");
    }

    const organizationId = info.user.organization_id || info.user._id;
    const leads = await populateLeadFields(Lead.find({ organization_id: organizationId, status: 0 }));

    return responseSender(res, 200, true, "Deleted leads fetched", { leads });
  } catch (error) {
    return responseSender(res, 500, false, error.message);
  }
};

// Search Leads by Name
export const searchLeadsByName = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const info = await getUserInfo(token);

    if (!info || info.user.status !== 1) {
      return responseSender(res, 401, false, "Unauthorized");
    }

    const organizationId = info.user.organization_id || info.user._id;
    const leads = await populateLeadFields(
      Lead.find({
        organization_id: organizationId,
        status: 1,
        name: { $regex: req.query.name, $options: "i" },
      })
    );

    return responseSender(res, 200, true, "Leads fetched", { leads });
  } catch (error) {
    return responseSender(res, 500, false, error.message);
  }
};

// Delete Permanently
export const deleteLeadPermanently = async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.headers.authorization?.split(" ")[1];
    const info = await getUserInfo(token);
    const organizationId = info.user.organization_id || info.user._id;

    const deletedLead = await Lead.findOneAndDelete({ _id: id, organization_id: organizationId });

    if (!deletedLead) {
      return responseSender(res, 404, false, "Lead not found or does not belong to your organization");
    }

    return responseSender(res, 200, true, "Lead permanently deleted");
  } catch (error) {
    return responseSender(res, 500, false, "Server error: " + error.message);
  }
};
