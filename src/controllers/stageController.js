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

// Create Multiple Stages
export const createStages = async (req, res) => {
    try {
        const { stages } = req.body;
        const { type, user } = req.user;

        if (!Array.isArray(stages) || stages.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please provide an array of stages"
            });
        }

        // Get organization_id based on user type
        let organization_id;
        if (type === "organization") {
            organization_id = user._id;
        } else if (type === "teamMember") {
            organization_id = user.organization_id;
        }

        // Extract unique pipeline IDs from the stages
        const pipelineIds = [...new Set(stages.map(stage => stage.pipeline_id))];

        // Verify all pipelines exist and user has access
        const pipelines = await Pipeline.find({
            _id: { $in: pipelineIds },
            organization_id,
            status: 1
        });

        if (pipelines.length !== pipelineIds.length) {
            return res.status(404).json({
                success: false,
                message: "One or more pipelines not found or access denied"
            });
        }

        // For team members, check if they have access to all pipelines
        if (type === "teamMember") {
            const hasAccessToAll = pipelines.every(pipeline => 
                pipeline.users_has_access.includes(user._id)
            );

            if (!hasAccessToAll) {
                return res.status(403).json({
                    success: false,
                    message: "You don't have access to one or more pipelines"
                });
            }
        }

        // Check for duplicate names and serial numbers within each pipeline
        for (const pipelineId of pipelineIds) {
            const pipelineStages = stages.filter(stage => stage.pipeline_id === pipelineId);
            const stageNames = pipelineStages.map(stage => stage.name);
            const serialNumbers = pipelineStages.map(stage => stage.serialNumber);

            // Check for duplicate names within the request
            if (new Set(stageNames).size !== stageNames.length) {
                return res.status(400).json({
                    success: false,
                    message: `Duplicate stage names found for pipeline ${pipelineId}`
                });
            }

            // Check for duplicate serial numbers within the request
            if (new Set(serialNumbers).size !== serialNumbers.length) {
                return res.status(400).json({
                    success: false,
                    message: `Duplicate serial numbers found for pipeline ${pipelineId}`
                });
            }

            // Check for existing stages with same names or serial numbers
            const existingStages = await Stage.find({
                pipeline_id: pipelineId,
                $or: [
                    { name: { $in: stageNames } },
                    { serialNumber: { $in: serialNumbers } }
                ],
                status: 1
            });

            if (existingStages.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Stages with duplicate names or serial numbers already exist in pipeline ${pipelineId}`
                });
            }
        }

        // Prepare stage documents
        const stageDocuments = stages.map(stage => ({
            ...stage,
            organization_id,
            created_by: user._id
        }));

        // Create all stages
        const createdStages = await Stage.insertMany(stageDocuments);

        res.status(201).json({
            success: true,
            message: "Stages created successfully",
            stages: createdStages
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "Duplicate stage names or serial numbers found"
            });
        }
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update Multiple Stages
export const updateStages = async (req, res) => {
    try {
        const { stages } = req.body;
        const { type, user } = req.user;

        if (!Array.isArray(stages) || stages.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please provide an array of stages to update"
            });
        }

        // Get organization_id based on user type
        let organization_id;
        if (type === "organization") {
            organization_id = user._id;
        } else if (type === "teamMember") {
            organization_id = user.organization_id;
        }

        const stageIds = stages.map(stage => stage._id);
        const existingStages = await Stage.find({
            _id: { $in: stageIds },
            organization_id
        });

        if (existingStages.length !== stageIds.length) {
            return res.status(404).json({
                success: false,
                message: "One or more stages not found or access denied"
            });
        }

        // Get unique pipeline IDs from existing stages
        const pipelineIds = [...new Set(existingStages.map(stage => stage.pipeline_id.toString()))];

        // Verify user has access to all pipelines
        const pipelines = await Pipeline.find({
            _id: { $in: pipelineIds },
            organization_id,
            status: 1
        });

        // For team members, check if they have access to all pipelines
        if (type === "teamMember") {
            const hasAccessToAll = pipelines.every(pipeline => 
                pipeline.users_has_access.includes(user._id)
            );

            if (!hasAccessToAll) {
                return res.status(403).json({
                    success: false,
                    message: "You don't have access to one or more pipelines"
                });
            }
        }

        // Group stages by pipeline for validation
        const stagesByPipeline = {};
        for (const stage of stages) {
            const existingStage = existingStages.find(es => es._id.toString() === stage._id);
            const pipelineId = existingStage.pipeline_id.toString();
            
            if (!stagesByPipeline[pipelineId]) {
                stagesByPipeline[pipelineId] = [];
            }
            stagesByPipeline[pipelineId].push({
                ...stage,
                existingStage
            });
        }

        // Validate updates for each pipeline
        for (const [pipelineId, pipelineStages] of Object.entries(stagesByPipeline)) {
            // Check for duplicate names and serial numbers within updates
            const namesMap = new Map();
            const serialNumbersMap = new Map();

            for (const stage of pipelineStages) {
                if (stage.name) {
                    if (namesMap.has(stage.name)) {
                        return res.status(400).json({
                            success: false,
                            message: `Duplicate stage name "${stage.name}" found in updates for pipeline ${pipelineId}`
                        });
                    }
                    namesMap.set(stage.name, stage._id);
                }

                if (stage.serialNumber) {
                    if (serialNumbersMap.has(stage.serialNumber)) {
                        return res.status(400).json({
                            success: false,
                            message: `Duplicate serial number ${stage.serialNumber} found in updates for pipeline ${pipelineId}`
                        });
                    }
                    serialNumbersMap.set(stage.serialNumber, stage._id);
                }
            }

            // Check for conflicts with existing stages
            const existingStagesInPipeline = await Stage.find({
                pipeline_id: pipelineId,
                _id: { $nin: stageIds },
                status: 1
            });

            for (const existingStage of existingStagesInPipeline) {
                if (namesMap.has(existingStage.name)) {
                    return res.status(400).json({
                        success: false,
                        message: `Stage name "${existingStage.name}" already exists in pipeline ${pipelineId}`
                    });
                }

                if (serialNumbersMap.has(existingStage.serialNumber)) {
                    return res.status(400).json({
                        success: false,
                        message: `Serial number ${existingStage.serialNumber} already exists in pipeline ${pipelineId}`
                    });
                }
            }
        }

        // Perform updates
        const updatedStages = await Promise.all(stages.map(async (stage) => {
            const { _id, name, serialNumber, stageType, status } = stage;
            const update = {};
            
            if (name) update.name = name;
            if (serialNumber) update.serialNumber = serialNumber;
            if (stageType) update.stageType = stageType;
            if (status !== undefined) update.status = parseInt(status);
            update.updated_by = user._id;

            return Stage.findOneAndUpdate(
                { _id, organization_id },
                update,
                { new: true }
            ).populate('created_by', 'name email')
             .populate('updated_by', 'name email')
             .populate('pipeline_id', 'name');
        }));

        res.json({
            success: true,
            message: "Stages updated successfully",
            stages: updatedStages
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "Duplicate stage names or serial numbers found"
            });
        }
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}; 