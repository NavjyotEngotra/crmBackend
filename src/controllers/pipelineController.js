import Pipeline from "../models/PipelineModel.js";
import Stage from "../models/StageModel.js"; 

// Create Pipeline
export const createPipeline = async (req, res) => {
    try {
        const { name, description, users_has_access } = req.body;
        const { type, user } = req.user;

        // Get organization_id based on user type
        let organization_id;
        if (type === "organization") {
            organization_id = user._id;
        } else if (type === "teamMember") {
            organization_id = user.organization_id;
        }

        // Check if pipeline name already exists in the organization
        const existingPipeline = await Pipeline.findOne({
            name,
            organization_id,
            status: 1
        });

        if (existingPipeline) {
            return res.status(400).json({
                success: false,
                message: "A pipeline with this name already exists in your organization"
            });
        }

        // Create pipeline with organization_id and created_by
        const pipeline = new Pipeline({
            name,
            description,
            users_has_access: [...users_has_access, user._id], // Add creator to users_has_access
            organization_id,
            created_by: user._id
        });

        await pipeline.save();

        res.status(201).json({
            success: true,
            message: "Pipeline created successfully",
            pipeline
        });
    } catch (error) {
        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "A pipeline with this name already exists in your organization"
            });
        }
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get Pipelines with filters
export const getPipelines = async (req, res) => {
    try {
        const { type, user } = req.user;
        const { status, searchByName } = req.query;
        let query = {};

        // Set organization_id based on user type
        if (type === "organization") {
            // Organization can see all pipelines in their organization
            query.organization_id = user._id;
        } else if (type === "teamMember") {
            // Team member can only see pipelines where they are in users_has_access
            query.organization_id = user.organization_id;
            query.users_has_access = user._id;
        }

        // Add status filter if provided
        if (status !== undefined) {
            query.status = parseInt(status);
        }

        // Add name search if provided
        if (searchByName && searchByName.trim() !== '') {
            query.name = { 
                $regex: searchByName.trim(), 
                $options: 'i'  // Case-insensitive search
            };
        }

        const pipelines = await Pipeline.find(query)
            .populate('created_by', 'name email')
            .populate('updated_by', 'name email')
            .populate('users_has_access', 'name email')
            .sort({ createdAt: -1 }); // Sort by newest first

        res.json({
            success: true,
            pipelines,
            total: pipelines.length,
            filters: {
                status: status ? parseInt(status) : undefined,
                searchByName: searchByName ? searchByName.trim() : undefined
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update Pipeline
export const updatePipeline = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, users_has_access, status } = req.body;
        const { type, user } = req.user;

        let query = { _id: id };

        // Set organization_id based on user type
        if (type === "organization") {
            query.organization_id = user._id;
        } else if (type === "teamMember") {
            query.organization_id = user.organization_id;
            query.users_has_access = user._id;
        }

        // Find pipeline and check access
        const pipeline = await Pipeline.findOne(query);

        if (!pipeline) {
            return res.status(404).json({
                success: false,
                message: "Pipeline not found or access denied"
            });
        }

        // If name is being updated, check for uniqueness
        if (name && name !== pipeline.name) {
            const existingPipeline = await Pipeline.findOne({
                name,
                organization_id: pipeline.organization_id,
                status: 1,
                _id: { $ne: id } // Exclude current pipeline
            });

            if (existingPipeline) {
                return res.status(400).json({
                    success: false,
                    message: "A pipeline with this name already exists in your organization"
                });
            }
        }

        // Update pipeline
        if (name) pipeline.name = name;
        if (description) pipeline.description = description;
        if (users_has_access) pipeline.users_has_access = users_has_access;
        if (status !== undefined) pipeline.status = parseInt(status);
        pipeline.updated_by = user._id;

        await pipeline.save();

        res.json({
            success: true,
            message: "Pipeline updated successfully",
            pipeline
        });
    } catch (error) {
        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "A pipeline with this name already exists in your organization"
            });
        }
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get Pipeline by ID

export const getPipelineById = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, user } = req.user;

    let query = { _id: id };

    // Set organization_id based on user type
    if (type === "organization") {
      // Organization can see any pipeline in their organization
      query.organization_id = user._id;
    } else if (type === "teamMember") {
      // Team member can only see pipelines where they are in users_has_access
      query.organization_id = user.organization_id;
      query.users_has_access = user._id;
    }

    const pipeline = await Pipeline.findOne(query)
      .populate('created_by', 'name email')
      .populate('updated_by', 'name email')
      .populate('users_has_access', 'name email');

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        message: "Pipeline not found or access denied",
      });
    }

    // Find stages that belong to this pipeline and organization
    const stages = await Stage.find({
      pipeline_id: pipeline._id,
      organization_id: pipeline.organization_id,
      status: 1, // optional: fetch only active stages
    }).sort({ serialNumber: 1 }); // optional: sort stages by serialNumber

    res.json({
      success: true,
      pipeline,
      stages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};