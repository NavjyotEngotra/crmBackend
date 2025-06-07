import Stage from "../models/StageModel.js";
import Pipeline from "../models/PipelineModel.js";
import TeamMember from "../models/TeamMemberModel.js";
import jwt from "jsonwebtoken";
import Organization from "../models/OrganizationModel.js";

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


            // Check for existing stages with same names or serial numbers
            const existingStages = await Stage.find({
                pipeline_id: pipelineId,
                $or: [
                    { name: { $in: stageNames } },
                ],
                status: 1
            });

            if (existingStages.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Stages with duplicate names  already exist in pipeline ${pipelineId}`
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
                message: "Duplicate stage names  found"
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
        message: "Please provide an array of stages to update or create",
      });
    }

    // Get organization_id based on user type
    let organization_id;
    if (type === "organization") {
      organization_id = user._id;
    } else if (type === "teamMember") {
      organization_id = user.organization_id;
    } else {
      return res.status(403).json({
        success: false,
        message: "Invalid user type",
      });
    }

    // Separate stages into existing (have _id) and new (no _id)
    const stagesToUpdate = stages.filter(stage => stage._id);
    const stagesToCreate = stages.filter(stage => !stage._id);

    // Validate existing stages belong to the organization
    const stageIds = stagesToUpdate.map(stage => stage._id);
    const existingStages = await Stage.find({
      _id: { $in: stageIds },
      organization_id,
    });

    if (existingStages.length !== stageIds.length) {
      return res.status(404).json({
        success: false,
        message: "One or more stages to update not found or access denied",
      });
    }

    // Get unique pipeline IDs from existing stages and new stages (assuming pipeline_id is provided for new)
    const pipelineIdsExisting = existingStages.map(stage => stage.pipeline_id.toString());
    const pipelineIdsNew = stagesToCreate
      .map(stage => stage.pipeline_id)
      .filter(id => !!id)
      .map(id => id.toString());

    const pipelineIds = [...new Set([...pipelineIdsExisting, ...pipelineIdsNew])];

    // Verify user has access to all pipelines
    const pipelines = await Pipeline.find({
      _id: { $in: pipelineIds },
      organization_id,
      status: 1,
    });

    if (type === "teamMember") {
      const hasAccessToAll = pipelines.every(pipeline =>
        pipeline.users_has_access.some(id => id.toString() === user._id.toString())
      );

      if (!hasAccessToAll) {
        return res.status(403).json({
          success: false,
          message: "You don't have access to one or more pipelines",
        });
      }
    }

    // Update existing stages
    const updatedStages = await Promise.all(
      stagesToUpdate.map(async (stage) => {
        const { _id, name, serialNumber, stageType, status } = stage;
        const update = {};

        if (name !== undefined) update.name = name;
        if (serialNumber !== undefined) update.serialNumber = serialNumber;
        if (stageType !== undefined) update.stageType = stageType;
        if (status !== undefined) update.status = parseInt(status);
        update.updated_by = user._id; // assuming schema field is updated_by

        return Stage.findOneAndUpdate(
          { _id, organization_id },
          update,
          { new: true }
        );
      })
    );

    // Create new stages
    const createdStages = await Promise.all(
      stagesToCreate.map(async (stage) => {
        // stage must contain at least: name, serialNumber, stageType, pipeline_id
        const newStage = new Stage({
          ...stage,
          organization_id,
          created_by: user._id,
          updated_by: user._id,
          status: stage.status !== undefined ? stage.status : 1,
        });
        return newStage.save();
      })
    );

    // Return combined result
    const allStages = [...updatedStages, ...createdStages];

    res.json({
      success: true,
      message: "Stages updated and created successfully",
      stages: allStages,
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate key error",
      });
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// export const swapSerialNumbers = async (req, res) => {
//   try {
//     const { pipeline_id, swaps } = req.body;
//     const token = req.headers.authorization?.split(" ")[1];

//     if (!pipeline_id || !Array.isArray(swaps) || swaps.length === 0) {
//       return res.status(400).json({ message: "pipeline_id and non-empty swaps array are required." });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const teamMember = await TeamMember.findById(decoded.id);
//     if (!teamMember) return res.status(401).json({ message: "Unauthorized: team member not found" });

//     const pipeline = await Pipeline.findOne({
//       _id: pipeline_id,
//       organization_id: teamMember.organization_id,
//     });
//     if (!pipeline) return res.status(403).json({ message: "Pipeline not found or access denied" });

//     const stageIds = swaps.map((s) => s.stage_id);
//     const stages = await Stage.find({
//       _id: { $in: stageIds },
//       pipeline_id,
//       organization_id: teamMember.organization_id,
//     });

//     if (stages.length !== swaps.length) {
//       return res.status(404).json({ message: "Some stages not found or unauthorized" });
//     }

//     const newSerials = swaps.map((s) => s.serial_number ?? s.serialNumber);
//     const hasDuplicates = new Set(newSerials).size !== newSerials.length;
//     if (hasDuplicates) {
//       return res.status(400).json({ message: "Duplicate serial_number values in swaps array" });
//     }

//     if (!newSerials.every((n) => Number.isInteger(n) && n > 0)) {
//       return res.status(400).json({ message: "All serial_number values must be positive integers" });
//     }

//     // Step 1: Temporarily move all affected stages' serial numbers to large unique numbers (e.g., +1000)
//     const tempBulkOps = swaps.map(({ stage_id }) => ({
//       updateOne: {
//         filter: { _id: stage_id },
//         update: { $inc: { serialNumber: 1000 } }, // adding 1000 to avoid conflicts
//       },
//     }));

//     await Stage.bulkWrite(tempBulkOps);

//     // Step 2: Update to target serial numbers
//     const finalBulkOps = swaps.map(({ stage_id, serial_number, serialNumber }) => ({
//       updateOne: {
//         filter: { _id: stage_id },
//         update: { serialNumber: serial_number ?? serialNumber },
//       },
//     }));

//     await Stage.bulkWrite(finalBulkOps);

//     return res.status(200).json({ message: "Serial numbers updated successfully" });
//   } catch (err) {
//     console.error("Swap serial error:", err);
//     return res.status(500).json({
//       message: "Failed to update stages due to duplicate serial numbers or other constraint",
//       error: err.message,
//     });
//   }
// };

export const swapSerialNumbers = async (req, res) => {
  try {
    const { pipeline_id, swaps } = req.body;
    const token = req.headers.authorization?.split(" ")[1];

    if (!pipeline_id || !Array.isArray(swaps) || swaps.length === 0) {
      return res.status(400).json({ message: "pipeline_id and non-empty swaps array are required." });
    }

    // Decode token to find user type (team member or organization)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let organization_id;

    // Try finding team member first
    const teamMember = await TeamMember.findById(decoded.id);
    if (teamMember) {
      organization_id = teamMember.organization_id;
    } else {
      // Try finding organization by decoded id
      const organization = await Organization.findById(decoded.id);
      if (organization) {
        organization_id = organization._id;
      } else {
        return res.status(401).json({ message: "Unauthorized: user not found" });
      }
    }

    // Check pipeline belongs to the organization
    const pipeline = await Pipeline.findOne({
      _id: pipeline_id,
      organization_id,
    });
    if (!pipeline) return res.status(403).json({ message: "Pipeline not found or access denied" });

    const stageIds = swaps.map((s) => s.stage_id);
    const stages = await Stage.find({
      _id: { $in: stageIds },
      pipeline_id,
      organization_id,
    });

    if (stages.length !== swaps.length) {
      return res.status(404).json({ message: "Some stages not found or unauthorized" });
    }

    const newSerials = swaps.map((s) => s.serial_number ?? s.serialNumber);
    const hasDuplicates = new Set(newSerials).size !== newSerials.length;
    if (hasDuplicates) {
      return res.status(400).json({ message: "Duplicate serial_number values in swaps array" });
    }

    if (!newSerials.every((n) => Number.isInteger(n) && n > 0)) {
      return res.status(400).json({ message: "All serial_number values must be positive integers" });
    }

    // Step 1: Temporarily move all affected stages' serial numbers to large unique numbers (e.g., +1000)
    const tempBulkOps = swaps.map(({ stage_id }) => ({
      updateOne: {
        filter: { _id: stage_id },
        update: { $inc: { serialNumber: 1000 } },
      },
    }));

    await Stage.bulkWrite(tempBulkOps);

    // Step 2: Update to target serial numbers
    const finalBulkOps = swaps.map(({ stage_id, serial_number, serialNumber }) => ({
      updateOne: {
        filter: { _id: stage_id },
        update: { serialNumber: serial_number ?? serialNumber },
      },
    }));

    await Stage.bulkWrite(finalBulkOps);

    return res.status(200).json({ message: "Serial numbers updated successfully" });
  } catch (err) {
    console.error("Swap serial error:", err);
    return res.status(500).json({
      message: "Failed to update stages due to duplicate serial numbers or other constraint",
      error: err.message,
    });
  }
};