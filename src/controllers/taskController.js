import Task from "../models/TaskModel.js";
import { getUserInfo } from "../utilities/getUserInfo.js";
import responseSender from "../utilities/responseSender.js";

export const createTask = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const info = await getUserInfo(token);

    if (!info) return responseSender(res, 401, false, null, "Unauthorized");

    const { name, due_date, module, related_id, priority, status, description } = req.body;

    const task = new Task({
      organization_id: info.user.organization_id || info.user._id,
      name,
      due_date,
      module,
      related_id,
      priority,
      status,
      description,
      createdBy: info.user._id,
      createdByModel: info.type === "organization" ? "Organization" : "TeamMember",
      updatedBy: info.user._id,
      updatedByModel: info.type === "organization" ? "Organization" : "TeamMember",
    });

    await task.save();
    return responseSender(res, 201, true, { task });
  } catch (error) {
    return responseSender(res, 500, false, null, error.message);
  }
};

export const updateTask = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const info = await getUserInfo(token);
    const { id } = req.params;

    const task = await Task.findOne({
      _id: id,
      organization_id: info.user.organization_id || info.user._id,
    });

    if (!task) return responseSender(res, 404, false, null, "Task not found");

    const updateFields = { ...req.body };
    delete updateFields.organization_id;
    delete updateFields.createdBy;
    delete updateFields.createdByModel;

    updateFields.updatedBy = info.user._id;
    updateFields.updatedByModel = info.type === "organization" ? "Organization" : "TeamMember";

    const updatedTask = await Task.findByIdAndUpdate(id, { $set: updateFields }, { new: true });

    return responseSender(res, 200, true, { task: updatedTask });
  } catch (error) {
    return responseSender(res, 500, false, null, error.message);
  }
};

export const getTaskById = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const info = await getUserInfo(token);
    const { id } = req.params;

    const task = await Task.findOne({
      _id: id,
      organization_id: info.user.organization_id || info.user._id,
    });

    if (!task) return responseSender(res, 404, false, null, "Task not found");

    return responseSender(res, 200, true, { task });
  } catch (error) {
    return responseSender(res, 500, false, null, error.message);
  }
};

export const getTasks = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const info = await getUserInfo(token);

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    const query = {
      organization_id: info.user.organization_id || info.user._id,
    };

    if (req.query.statusCode !== undefined) {
      query.statusCode = parseInt(req.query.statusCode);
    }

    if (req.query.status) {
      query.status = req.query.status;
    }

    const [tasks, total] = await Promise.all([
      Task.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Task.countDocuments(query),
    ]);

    return responseSender(res, 200, true, {
      tasks,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    return responseSender(res, 500, false, null, error.message);
  }
};

export const deleteTask = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const info = await getUserInfo(token);
    const { id } = req.params;

    const task = await Task.findOneAndUpdate(
      {
        _id: id,
        organization_id: info.user.organization_id || info.user._id,
      },
      {
        statusCode: 0,
        updatedBy: info.user._id,
        updatedByModel: info.type === "organization" ? "Organization" : "TeamMember",
      },
      { new: true }
    );

    if (!task) return responseSender(res, 404, false, null, "Task not found");

    return responseSender(res, 200, true, null, "Task deleted successfully");
  } catch (error) {
    return responseSender(res, 500, false, null, error.message);
  }
};
