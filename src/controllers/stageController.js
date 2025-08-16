import Stage from "../models/StageModel.js";
import Pipeline from "../models/PipelineModel.js";
import responseSender from "../utilities/responseSender.js";

// Create Stage
export const createStage = async (req, res) => {
  try {
    const { name, serialNumber, stageType, pipeline_id } = req.body;
    const { role, id, organizationId } = req.user;

    let organization_id;
    if (role === "organization") organization_id = id;
    else if (role === "team_member") organization_id = organizationId;
    else if (role === "superadmin") organization_id = req.body.organization_id;
    else return responseSender(res, 403, false, null, "Unauthorized role");

    const pipeline = await Pipeline.findOne({ _id: pipeline_id, organization_id, status: 1 });
    if (!pipeline)
      return responseSender(res, 404, false, null, "Pipeline not found or access denied");

    if (role === "team_member" && !pipeline.users_has_access.includes(id))
      return responseSender(res, 403, false, null, "You don't have access to this pipeline");

    const existingStage = await Stage.findOne({ name, pipeline_id, status: 1 });
    if (existingStage)
      return responseSender(res, 400, false, null, "A stage with this name already exists in this pipeline");

    const stage = new Stage({
      name,
      serialNumber,
      stageType,
      pipeline_id,
      organization_id,
      created_by: id,
    });
    await stage.save();

    return responseSender(res, 201, true, { stage });
  } catch (error) {
    if (error.code === 11000)
      return responseSender(res, 400, false, null, "A stage with this name or serial number already exists in this pipeline");
    return responseSender(res, 500, false, null, error.message);
  }
};

// Get Stages
export const getStages = async (req, res) => {
  try {
    const { role, id, organizationId } = req.user;
    const { pipeline_id, status, searchByName } = req.query;

    let query = {};
    if (role === "organization") query.organization_id = id;
    else if (role === "team_member") query.organization_id = organizationId;
    else if (role === "superadmin" && req.query.organization_id)
      query.organization_id = req.query.organization_id;

    if (pipeline_id) {
      query.pipeline_id = pipeline_id;

      if (role === "team_member") {
        const pipeline = await Pipeline.findOne({
          _id: pipeline_id,
          organization_id,
          users_has_access: id,
          status: 1,
        });
        if (!pipeline) return responseSender(res, 403, false, null, "You don't have access to this pipeline");
      }
    }

    if (status !== undefined) query.status = parseInt(status);
    if (searchByName?.trim()) query.name = { $regex: searchByName.trim(), $options: "i" };

    const stages = await Stage.find(query)
      .populate("created_by", "name email")
      .populate("updated_by", "name email")
      .populate("pipeline_id", "name")
      .sort({ serialNumber: 1 });

    return responseSender(res, 200, true, {
      stages,
      total: stages.length,
      filters: { pipeline_id, status: status ? parseInt(status) : undefined, searchByName: searchByName?.trim() },
    });
  } catch (error) {
    return responseSender(res, 500, false, null, error.message);
  }
};

// Get Stage by ID
export const getStageById = async (req, res) => {
  try {
    const { id: stageId } = req.params;
    const { role, id, organizationId } = req.user;

    let query = { _id: stageId };
    if (role === "organization") query.organization_id = id;
    else if (role === "team_member") query.organization_id = organizationId;
    else if (role === "superadmin" && req.query.organization_id)
      query.organization_id = req.query.organization_id;

    const stage = await Stage.findOne(query)
      .populate("created_by", "name email")
      .populate("updated_by", "name email")
      .populate("pipeline_id", "name");

    if (!stage) return responseSender(res, 404, false, null, "Stage not found or access denied");

    if (role === "team_member") {
      const pipeline = await Pipeline.findOne({
        _id: stage.pipeline_id,
        organization_id,
        users_has_access: id,
        status: 1,
      });

      if (!pipeline)
        return responseSender(res, 403, false, null, "You don't have access to this stage's pipeline");
    }

    return responseSender(res, 200, true, { stage });
  } catch (error) {
    return responseSender(res, 500, false, null, error.message);
  }
};

// Update Stage
export const updateStage = async (req, res) => {
  try {
    const { id: stageId } = req.params;
    const { name, serialNumber, stageType, status } = req.body;
    const { role, id, organizationId } = req.user;

    let query = { _id: stageId };
    if (role === "organization") query.organization_id = id;
    else if (role === "team_member") query.organization_id = organizationId;
    else if (role === "superadmin" && req.body.organization_id)
      query.organization_id = req.body.organization_id;

    const stage = await Stage.findOne(query);
    if (!stage) return responseSender(res, 404, false, null, "Stage not found or access denied");

    if (role === "team_member") {
      const pipeline = await Pipeline.findOne({
        _id: stage.pipeline_id,
        organization_id,
        users_has_access: id,
        status: 1,
      });

      if (!pipeline)
        return responseSender(res, 403, false, null, "You don't have access to this stage's pipeline");
    }

    if (name && name !== stage.name) {
      const existingStage = await Stage.findOne({
        name,
        pipeline_id: stage.pipeline_id,
        status: 1,
        _id: { $ne: stageId },
      });

      if (existingStage)
        return responseSender(res, 400, false, null, "A stage with this name already exists in this pipeline");
    }

    if (name) stage.name = name;
    if (serialNumber) stage.serialNumber = serialNumber;
    if (stageType) stage.stageType = stageType;
    if (status !== undefined) stage.status = parseInt(status);
    stage.updated_by = id;

    await stage.save();
    return responseSender(res, 200, true, { stage });
  } catch (error) {
    if (error.code === 11000)
      return responseSender(res, 400, false, null, "Duplicate stage name or serial number");
    return responseSender(res, 500, false, null, error.message);
  }
};

// Create Multiple Stages
export const createStages = async (req, res) => {
  try {
    const { stages } = req.body;
    const { role, id, organizationId } = req.user;

    if (!Array.isArray(stages) || stages.length === 0)
      return responseSender(res, 400, false, null, "Please provide an array of stages");

    let organization_id;
    if (role === "organization") organization_id = id;
    else if (role === "team_member") organization_id = organizationId;
    else if (role === "superadmin") organization_id = req.body.organization_id;

    const pipelineIds = [...new Set(stages.map((s) => s.pipeline_id))];
    const pipelines = await Pipeline.find({ _id: { $in: pipelineIds }, organization_id, status: 1 });

    if (pipelines.length !== pipelineIds.length)
      return responseSender(res, 404, false, null, "One or more pipelines not found or access denied");

    if (role === "team_member") {
      const hasAccess = pipelines.every((p) => p.users_has_access.includes(id));
      if (!hasAccess)
        return responseSender(res, 403, false, null, "You don't have access to one or more pipelines");
    }

    for (const pid of pipelineIds) {
      const names = stages.filter((s) => s.pipeline_id === pid).map((s) => s.name);
      const duplicates = await Stage.find({ pipeline_id: pid, name: { $in: names }, status: 1 });

      if (duplicates.length)
        return responseSender(res, 400, false, null, `Duplicate names found in pipeline ${pid}`);
    }

    const stageDocs = stages.map((s) => ({
      ...s,
      organization_id,
      created_by: id,
    }));

    const createdStages = await Stage.insertMany(stageDocs);
    return responseSender(res, 201, true, { stages: createdStages });
  } catch (error) {
    return responseSender(res, 500, false, null, error.message);
  }
};

// Update Multiple Stages
export const updateStages = async (req, res) => {
  try {
    const { stages } = req.body;
    const { role, id, organizationId } = req.user;

    if (!Array.isArray(stages) || stages.length === 0)
      return responseSender(res, 400, false, null, "Please provide an array of stages");

    let organization_id;
    if (role === "organization") organization_id = id;
    else if (role === "team_member") organization_id = organizationId;
    else if (role === "superadmin") organization_id = req.body.organization_id;

    const updateIds = stages.filter((s) => s._id).map((s) => s._id);
    const updateStages = await Stage.find({ _id: { $in: updateIds }, organization_id });

    if (updateStages.length !== updateIds.length)
      return responseSender(res, 404, false, null, "One or more stages not found or access denied");

    const newStages = stages.filter((s) => !s._id);
    const allPipelineIds = [
      ...new Set([
        ...updateStages.map((s) => s.pipeline_id.toString()),
        ...newStages.map((s) => s.pipeline_id),
      ]),
    ];

    const pipelines = await Pipeline.find({ _id: { $in: allPipelineIds }, organization_id, status: 1 });

    if (role === "team_member") {
      const hasAccess = pipelines.every((p) => p.users_has_access.includes(id));
      if (!hasAccess)
        return responseSender(res, 403, false, null, "Access denied to one or more pipelines");
    }

    const updated = await Promise.all(
      updateStages.map(async (s) => {
        const payload = stages.find((x) => x._id === s._id.toString());
        if (payload.name !== undefined) s.name = payload.name;
        if (payload.serialNumber !== undefined) s.serialNumber = payload.serialNumber;
        if (payload.stageType !== undefined) s.stageType = payload.stageType;
        if (payload.status !== undefined) s.status = parseInt(payload.status);
        s.updated_by = id;
        return s.save();
      })
    );

    const created = await Stage.insertMany(
      newStages.map((s) => ({
        ...s,
        organization_id,
        created_by: id,
        updated_by: id,
        status: s.status ?? 1,
      }))
    );

    return responseSender(res, 200, true, { stages: [...updated, ...created] });
  } catch (error) {
    return responseSender(res, 500, false, null, error.message);
  }
};

// Swap Serial Numbers
export const swapSerialNumbers = async (req, res) => {
  try {
    const { pipeline_id, swaps } = req.body;
    const { role, id, organizationId } = req.user;

    if (!pipeline_id || !Array.isArray(swaps) || swaps.length === 0)
      return responseSender(res, 400, false, null, "pipeline_id and swaps array required");

    let organization_id;
    if (role === "organization") organization_id = id;
    else if (role === "team_member") organization_id = organizationId;
    else if (role === "superadmin") organization_id = req.body.organization_id;

    const pipeline = await Pipeline.findOne({ _id: pipeline_id, organization_id });
    if (!pipeline) return responseSender(res, 403, false, null, "Pipeline not found");

    if (role === "team_member" && !pipeline.users_has_access.includes(id))
      return responseSender(res, 403, false, null, "You don't have access to this pipeline");

    const stageIds = swaps.map((s) => s.stage_id);
    const stages = await Stage.find({ _id: { $in: stageIds }, pipeline_id, organization_id });
    if (stages.length !== swaps.length)
      return responseSender(res, 404, false, null, "Some stages not found or unauthorized");

    const serials = swaps.map((s) => s.serial_number ?? s.serialNumber);
    if (new Set(serials).size !== serials.length)
      return responseSender(res, 400, false, null, "Duplicate serial numbers");

    if (!serials.every((n) => Number.isInteger(n) && n > 0))
      return responseSender(res, 400, false, null, "Serial numbers must be positive integers");

    await Stage.bulkWrite(
      swaps.map(({ stage_id }) => ({
        updateOne: { filter: { _id: stage_id }, update: { $inc: { serialNumber: 1000 } } },
      }))
    );

    await Stage.bulkWrite(
      swaps.map(({ stage_id, serial_number, serialNumber }) => ({
        updateOne: { filter: { _id: stage_id }, update: { serialNumber: serial_number ?? serialNumber } },
      }))
    );

    return responseSender(res, 200, true, null, "Serial numbers updated successfully");
  } catch (err) {
    return responseSender(res, 500, false, null, "Failed to update stages", { error: err.message });
  }
};
