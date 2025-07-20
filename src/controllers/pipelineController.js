import Pipeline from "../models/PipelineModel.js";
import Stage from "../models/StageModel.js";
import Lead from '../models/LeadModel.js';
import responseSender from "../utilities/responseSender.js";

// Create Pipeline
export const createPipeline = async (req, res) => {
  try {
    const { name, description, users_has_access } = req.body;
    const { type, user } = req.user;

    let organization_id = type === "organization" ? user._id : user.organization_id;

    const existingPipeline = await Pipeline.findOne({
      name,
      organization_id,
      status: 1
    });

    if (existingPipeline) {
      return responseSender(res, 400, false, "A pipeline with this name already exists in your organization");
    }

    const pipeline = new Pipeline({
      name,
      description,
      users_has_access: [...users_has_access, user._id],
      organization_id,
      created_by: user._id
    });

    await pipeline.save();

    return responseSender(res, 201, true, "Pipeline created successfully", { pipeline });

  } catch (error) {
    if (error.code === 11000) {
      return responseSender(res, 400, false, "A pipeline with this name already exists in your organization");
    }
    return responseSender(res, 500, false, error.message);
  }
};

// Get Pipelines with filters
export const getPipelines = async (req, res) => {
  try {
    const { type, user } = req.user;
    const { status, searchByName } = req.query;
    let query = {};

    if (type === "organization") {
      query.organization_id = user._id;
    } else {
      query.organization_id = user.organization_id;
      query.users_has_access = user._id;
    }

    if (status !== undefined) query.status = parseInt(status);
    if (searchByName?.trim()) {
      query.name = {
        $regex: searchByName.trim(),
        $options: 'i'
      };
    }

    const pipelines = await Pipeline.find(query)
      .populate('created_by', 'name email')
      .populate('updated_by', 'name email')
      .populate('users_has_access', 'name email')
      .sort({ createdAt: -1 });

    return responseSender(res, 200, true, "Pipelines fetched successfully", {
      pipelines,
      total: pipelines.length,
      filters: {
        status: status ? parseInt(status) : undefined,
        searchByName: searchByName?.trim() || undefined
      }
    });
  } catch (error) {
    return responseSender(res, 500, false, error.message);
  }
};

// Update Pipeline
export const updatePipeline = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, users_has_access, status } = req.body;
    const { type, user } = req.user;

    let query = { _id: id };
    if (type === "organization") {
      query.organization_id = user._id;
    } else {
      query.organization_id = user.organization_id;
      query.users_has_access = user._id;
    }

    const pipeline = await Pipeline.findOne(query);
    if (!pipeline) {
      return responseSender(res, 404, false, "Pipeline not found or access denied");
    }

    if (name && name !== pipeline.name) {
      const existingPipeline = await Pipeline.findOne({
        name,
        organization_id: pipeline.organization_id,
        status: 1,
        _id: { $ne: id }
      });
      if (existingPipeline) {
        return responseSender(res, 400, false, "A pipeline with this name already exists in your organization");
      }
    }

    if (name) pipeline.name = name;
    if (description) pipeline.description = description;
    if (users_has_access) pipeline.users_has_access = users_has_access;
    if (status !== undefined) pipeline.status = parseInt(status);
    pipeline.updated_by = user._id;

    await pipeline.save();

    return responseSender(res, 200, true, "Pipeline updated successfully", { pipeline });

  } catch (error) {
    if (error.code === 11000) {
      return responseSender(res, 400, false, "A pipeline with this name already exists in your organization");
    }
    return responseSender(res, 500, false, error.message);
  }
};

// Get Pipeline by ID
export const getPipelineById = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, user } = req.user;

    let query = { _id: id };
    if (type === "organization") {
      query.organization_id = user._id;
    } else {
      query.organization_id = user.organization_id;
      query.users_has_access = user._id;
    }

    const pipeline = await Pipeline.findOne(query)
      .populate('created_by', 'name email')
      .populate('updated_by', 'name email')
      .populate('users_has_access', 'name email');

    if (!pipeline) {
      return responseSender(res, 404, false, "Pipeline not found or access denied");
    }

    const stages = await Stage.find({
      pipeline_id: pipeline._id,
      organization_id: pipeline.organization_id,
      status: 1,
    }).sort({ serialNumber: 1 });

    const stagesWithLeads = await Promise.all(
      stages.map(async (stage) => {
        const leads = await Lead.find({
          pipeline_id: pipeline._id,
          stage_id: stage._id,
          organization_id: pipeline.organization_id,
          status: 1,
        })
          .sort({ createdAt: 1 })
          .populate('assigned_to', 'name email')
          .populate('created_by', 'name email')
          .populate('updated_by', 'name email')
          .populate('product_id', 'name')
          .populate('company_id', 'name')
          .populate('contact_id', 'name email');

        return {
          ...stage.toObject(),
          leads,
        };
      })
    );

    return responseSender(res, 200, true, "Pipeline fetched successfully", {
      pipeline,
      stages: stagesWithLeads
    });

  } catch (error) {
    return responseSender(res, 500, false, error.message);
  }
};
