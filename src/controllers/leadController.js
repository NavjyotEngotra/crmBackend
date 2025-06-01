import Lead from "../models/LeadModel.js";
import { getUserInfo } from "../utilities/getUserInfo.js";
import mongoose from "mongoose";

// Helper function for populating lead fields
const populateLeadFields = (query) => {
    return query
        .populate('pipeline_id')
        .populate('stage_id')
        .populate('organization_id')
        .populate('product_id')
        .populate('company_id')
        .populate('contact_id')
        .populate('meeting_id')
        .populate({
            path: 'assigned_to',
            select: '-password'
        })
        .populate({
            path: 'created_by',
            model: 'Organization',
            select: '-password'
        })
        .populate({
            path: 'created_by',
            model: 'TeamMember',
            select: '-password'
        })
        .populate({
            path: 'updated_by',
            model: 'Organization',
            select: '-password'
        })
        .populate({
            path: 'updated_by',
            model: 'TeamMember',
            select: '-password'
        });
};

// Create a new lead
export const createLead = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const organizationId = info.user.organization_id || info.user._id;
        
        const lead = new Lead({
            ...req.body,
            organization_id: organizationId,
            created_by: info.user._id,
            created_by_model: info.role === 'organization' ? 'Organization' : 'TeamMember',
            updated_by: info.user._id,
            updated_by_model: info.role === 'organization' ? 'Organization' : 'TeamMember'
        });

        await lead.save();

        // Fetch the lead with populated fields
        const populatedLead = await populateLeadFields(Lead.findById(lead._id));

        res.status(201).json({
            success: true,
            message: "Lead created successfully",
            lead: populatedLead
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get all leads with pagination and filters
export const getLeads = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const organizationId = info.user.organization_id || info.user._id;
        
        // Pagination
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const skip = (page - 1) * limit;

        // Filters
        const query = { organization_id: organizationId };
        
        // Status filter
        if (req.query.status !== undefined) {
            query.status = parseInt(req.query.status);
        } else {
            query.status = 1; // Default to active leads
        }

        // Pipeline filter
        if (req.query.pipeline_id) {
            query.pipeline_id = new mongoose.Types.ObjectId(req.query.pipeline_id);
        }

        // Stage filter
        if (req.query.stage_id) {
            query.stage_id = new mongoose.Types.ObjectId(req.query.stage_id);
        }

        // Assigned to filter
        if (req.query.assigned_to) {
            query.assigned_to = new mongoose.Types.ObjectId(req.query.assigned_to);
        }

        // Search by name
        if (req.query.search) {
            query.name = { $regex: req.query.search, $options: "i" };
        }

        const [leads, totalCount] = await Promise.all([
            populateLeadFields(Lead.find(query))
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Lead.countDocuments(query)
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            success: true,
            leads,
            pagination: {
                total: totalCount,
                page,
                limit,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get lead by ID
export const getLeadById = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const organizationId = info.user.organization_id || info.user._id;
        
        const lead = await populateLeadFields(
            Lead.findOne({
                _id: req.params.id,
                organization_id: organizationId
            })
        );

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found"
            });
        }

        res.json({
            success: true,
            lead
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update lead
export const updateLead = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const organizationId = info.user.organization_id || info.user._id;
        
        const lead = await Lead.findOne({
            _id: req.params.id,
            organization_id: organizationId
        });

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found"
            });
        }

        // Update the lead
        const updatedLead = await populateLeadFields(
            Lead.findByIdAndUpdate(
                req.params.id,
                {
                    ...req.body,
                    updated_by: info.user._id,
                    updated_by_model: info.role === 'organization' ? 'Organization' : 'TeamMember'
                },
                { new: true, runValidators: true }
            )
        );

        res.json({
            success: true,
            message: "Lead updated successfully",
            lead: updatedLead
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update lead status (soft delete)
export const updateStatus = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const organizationId = info.user.organization_id || info.user._id;
        
        const lead = await Lead.findOne({
            _id: req.params.id,
            organization_id: organizationId
        });

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found"
            });
        }

        lead.status = req.body.status;
        lead.updated_by = info.user._id;
        lead.updated_by_model = info.role === 'organization' ? 'Organization' : 'TeamMember';

        await lead.save();

        const populatedLead = await populateLeadFields(Lead.findById(lead._id));

        res.json({
            success: true,
            message: "Lead status updated successfully",
            lead: populatedLead
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get deleted leads
export const getDeletedLeads = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const organizationId = info.user.organization_id || info.user._id;
        
        const leads = await populateLeadFields(
            Lead.find({
                organization_id: organizationId,
                status: 0
            })
        );

        res.json({
            success: true,
            leads
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Search leads by name
export const searchLeadsByName = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const organizationId = info.user.organization_id || info.user._id;
        
        const leads = await populateLeadFields(
            Lead.find({
                organization_id: organizationId,
                status: 1,
                name: { $regex: req.query.name, $options: "i" }
            })
        );

        res.json({
            success: true,
            leads
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}; 