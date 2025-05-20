import Stage from "../models/StageModel.js";
import Pipeline from "../models/PipelineModel.js";

// Create Stage
export const createStage = async (req, res) => {
    try {
        const { name, serialNumber, stageType, pipeline_id } = req.body;
        const { type, user } = req.user;

        // Get organization_id based on user type
        let organization_id;
        if (type === "organization") {
            organization_id = user._id;
        } else if (type === "teamMember") {
            organization_id = user.organization_id;
        }

        // Verify pipeline exists and user has access
        const pipeline = await Pipeline.findOne({
            _id: pipeline_id,
            organization_id,
            status: 1
        });

        if (!pipeline) {
            return res.status(404).json({
                success: false,
                message: "Pipeline not found or access denied"
            });
        }

        // For team members, check if they have access to the pipeline
        if (type === "teamMember" && !pipeline.users_has_access.includes(user._id)) {
            return res.status(403).json({
                success: false,
                message: "You don't have access to this pipeline"
            });
        }

        // Check if stage name already exists in the pipeline
        const existingStage = await Stage.findOne({
            name,
            pipeline_id,
            status: 1
        });

        if (existingStage) {
            return res.status(400).json({
                success: false,
                message: "A stage with this name already exists in this pipeline"
            });
        }

        // Check if serial number already exists in the pipeline
        const existingSerialNumber = await Stage.findOne({
            serialNumber,
            pipeline_id,
            status: 1
        });

        if (existingSerialNumber) {
            return res.status(400).json({
                success: false,
                message: "A stage with this serial number already exists in this pipeline"
            });
        }

        // Create stage
        const stage = new Stage({
            name,
            serialNumber,
            stageType,
            pipeline_id,
            organization_id,
            created_by: user._id
        });

        await stage.save();

        res.status(201).json({
            success: true,
            message: "Stage created successfully",
            stage
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "A stage with this name or serial number already exists in this pipeline"
            });
        }
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get Stages
export const getStages = async (req, res) => {
    try {
        const { type, user } = req.user;
        const { pipeline_id, status, searchByName } = req.query;
        let query = {};

        // Set organization_id based on user type
        if (type === "organization") {
            query.organization_id = user._id;
        } else if (type === "teamMember") {
            query.organization_id = user.organization_id;
        }

        // Add pipeline filter if provided
        if (pipeline_id) {
            query.pipeline_id = pipeline_id;

            // For team members, verify pipeline access
            if (type === "teamMember") {
                const pipeline = await Pipeline.findOne({
                    _id: pipeline_id,
                    organization_id: user.organization_id,
                    users_has_access: user._id,
                    status: 1
                });

                if (!pipeline) {
                    return res.status(403).json({
                        success: false,
                        message: "You don't have access to this pipeline"
                    });
                }
            }
        }

        // Add status filter if provided
        if (status !== undefined) {
            query.status = parseInt(status);
        }

        // Add name search if provided
        if (searchByName && searchByName.trim() !== '') {
            query.name = {
                $regex: searchByName.trim(),
                $options: 'i'
            };
        }

        const stages = await Stage.find(query)
            .populate('created_by', 'name email')
            .populate('updated_by', 'name email')
            .populate('pipeline_id', 'name')
            .sort({ serialNumber: 1 });

        res.json({
            success: true,
            stages,
            total: stages.length,
            filters: {
                pipeline_id,
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

// Get Stage by ID
export const getStageById = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, user } = req.user;

        let query = { _id: id };

        // Set organization_id based on user type
        if (type === "organization") {
            query.organization_id = user._id;
        } else if (type === "teamMember") {
            query.organization_id = user.organization_id;
        }

        const stage = await Stage.findOne(query)
            .populate('created_by', 'name email')
            .populate('updated_by', 'name email')
            .populate('pipeline_id', 'name');

        if (!stage) {
            return res.status(404).json({
                success: false,
                message: "Stage not found or access denied"
            });
        }

        // For team members, verify pipeline access
        if (type === "teamMember") {
            const pipeline = await Pipeline.findOne({
                _id: stage.pipeline_id,
                organization_id: user.organization_id,
                users_has_access: user._id,
                status: 1
            });

            if (!pipeline) {
                return res.status(403).json({
                    success: false,
                    message: "You don't have access to this stage's pipeline"
                });
            }
        }

        res.json({
            success: true,
            stage
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update Stage
export const updateStage = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, serialNumber, stageType, status } = req.body;
        const { type, user } = req.user;

        let query = { _id: id };

        // Set organization_id based on user type
        if (type === "organization") {
            query.organization_id = user._id;
        } else if (type === "teamMember") {
            query.organization_id = user.organization_id;
        }

        const stage = await Stage.findOne(query);

        if (!stage) {
            return res.status(404).json({
                success: false,
                message: "Stage not found or access denied"
            });
        }

        // For team members, verify pipeline access
        if (type === "teamMember") {
            const pipeline = await Pipeline.findOne({
                _id: stage.pipeline_id,
                organization_id: user.organization_id,
                users_has_access: user._id,
                status: 1
            });

            if (!pipeline) {
                return res.status(403).json({
                    success: false,
                    message: "You don't have access to this stage's pipeline"
                });
            }
        }

        // If name is being updated, check for uniqueness
        if (name && name !== stage.name) {
            const existingStage = await Stage.findOne({
                name,
                pipeline_id: stage.pipeline_id,
                status: 1,
                _id: { $ne: id }
            });

            if (existingStage) {
                return res.status(400).json({
                    success: false,
                    message: "A stage with this name already exists in this pipeline"
                });
            }
        }

        // If serial number is being updated, check for uniqueness
        if (serialNumber && serialNumber !== stage.serialNumber) {
            const existingSerialNumber = await Stage.findOne({
                serialNumber,
                pipeline_id: stage.pipeline_id,
                status: 1,
                _id: { $ne: id }
            });

            if (existingSerialNumber) {
                return res.status(400).json({
                    success: false,
                    message: "A stage with this serial number already exists in this pipeline"
                });
            }
        }

        // Update stage
        if (name) stage.name = name;
        if (serialNumber) stage.serialNumber = serialNumber;
        if (stageType) stage.stageType = stageType;
        if (status !== undefined) stage.status = parseInt(status);
        stage.updated_by = user._id;

        await stage.save();

        res.json({
            success: true,
            message: "Stage updated successfully",
            stage
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "A stage with this name or serial number already exists in this pipeline"
            });
        }
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}; 