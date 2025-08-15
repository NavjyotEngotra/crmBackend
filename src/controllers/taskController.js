import Meeting from "../models/MeetingModel.js";
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


export const getMeetingsAndTasks = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const info = await getUserInfo(token);

    if (!info) return responseSender(res, 401, false, null, "Unauthorized");

    const orgId = info.user.organization_id || info.user._id;

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    // Separate filters
    const meetingQuery = { organization_id: orgId };
    const taskQuery = { organization_id: orgId };

    if (req.query.statusCode !== undefined) {
      const status = parseInt(req.query.statusCode);
      meetingQuery.status = status;         // Correct field for Meeting
      taskQuery.statusCode = status;        // Correct field for Task
    } else {
      meetingQuery.status = { $in: [0, 1] };
      taskQuery.statusCode = { $in: [0, 1] };
    }

    // Fetch separately
    const [meetings, meetingTotal] = await Promise.all([
      Meeting.find(meetingQuery).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Meeting.countDocuments(meetingQuery),
    ]);

    const [tasks, taskTotal] = await Promise.all([
      Task.find(taskQuery).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Task.countDocuments(taskQuery),
    ]);

    return responseSender(res, 200, true, {
      meetings,
      tasks,
      currentPage: page,
      totalMeetingPages: Math.ceil(meetingTotal / limit),
      totalTaskPages: Math.ceil(taskTotal / limit),
      totalMeetings: meetingTotal,
      totalTasks: taskTotal,
    });
  } catch (error) {
    return responseSender(res, 500, false, null, error.message);
  }
};


export const getMeetingsAndTasksByDate = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const info = await getUserInfo(token);

    if (!info) return responseSender(res, 401, false, null, "Unauthorized");

    const orgId = info.user.organization_id || info.user._id;

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    // Get date from query or use today's date
    let selectedDate;
    if (req.query.date) {
      selectedDate = new Date(req.query.date);
    } else {
      const now = new Date();
      selectedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    if (isNaN(selectedDate.getTime())) {
      return responseSender(res, 400, false, null, "Invalid date format");
    }

    // Get start and end of the selected date (00:00 - 23:59)
    const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));

    // Queries
    const meetingQuery = {
      organization_id: orgId,
      from: { $gte: startOfDay, $lte: endOfDay },
    };

    const taskQuery = {
      organization_id: orgId,
      due_date: { $gte: startOfDay, $lte: endOfDay },
    };

    // Status filters
    if (req.query.statusCode !== undefined) {
      const status = parseInt(req.query.statusCode);
      meetingQuery.status = status;
      taskQuery.statusCode = status;
    } else {
      meetingQuery.status = { $in: [0, 1] };
      taskQuery.statusCode = { $in: [0, 1] };
    }

    // Fetch
    const [meetings, meetingTotal] = await Promise.all([
      Meeting.find(meetingQuery).sort({ from: -1 }).skip(skip).limit(limit),
      Meeting.countDocuments(meetingQuery),
    ]);

    const [tasks, taskTotal] = await Promise.all([
      Task.find(taskQuery).sort({ from: -1 }).skip(skip).limit(limit),
      Task.countDocuments(taskQuery),
    ]);

    return responseSender(res, 200, true, {
      meetings,
      tasks,
      currentPage: page,
      totalMeetingPages: Math.ceil(meetingTotal / limit),
      totalTaskPages: Math.ceil(taskTotal / limit),
      totalMeetings: meetingTotal,
      totalTasks: taskTotal,
    });
  } catch (error) {
    return responseSender(res, 500, false, null, error.message);
  }
};