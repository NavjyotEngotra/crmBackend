import Note from "../models/NoteModel.js";
import TeamMember from "../models/TeamMemberModel.js";
import jwt from "jsonwebtoken";
import responseSender from "../utilities/responseSender.js";
import { getUserInfo } from "../utilities/getUserInfo.js";

// Create Note
export const createNote = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const info = await getUserInfo(token);

    if (!info || info.user.status !== 1) {
      return responseSender(res, 401, false, null, "Unauthorized");
    }
    const organizationId = info.user.organization_id || info.user._id;

    const { title, description, module_id, module_name } = req.body;

    const note = new Note({
      title,
      description,
      module_id,
      module_name,
      organization_id: organizationId,
      createdBy: info.user._id,
      editedBy: info.user._id,
    });

    await note.save();
    return responseSender(res, 201, true, { note });
  } catch (err) {
    return responseSender(res, 500, false, null, err.message);
  }
};


// Get Notes by module_id + module_name (paginated, newest first)
export const getNotesByModuleId = async (req, res) => {
  try {

    const token = req.headers.authorization?.split(" ")[1];
    const info = await getUserInfo(token);

    if (!info || info.user.status !== 1) {
      return responseSender(res, 401, false, null, "Unauthorized");
    }
    const organizationId = info.user.organization_id || info.user._id;

    const { module_id, module_name } = req.query; // <-- both required
    if (!module_id || !module_name) {
      return responseSender(res, 400, false, null, "module_id and module_name are required");
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const notes = await Note.find({
      module_id,
      module_name,
      organization_id: organizationId,
      status: 1,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit + 1);

    const hasNextPage = notes.length > limit;
    const paginatedNotes = hasNextPage ? notes.slice(0, limit) : notes;

    return responseSender(res, 200, true, {
      notes: paginatedNotes,
      pagination: { hasNextPage, currentPage: page },
    });
  } catch (err) {
    return responseSender(res, 500, false, null, err.message);
  }
};


// Update Note
export const updateNote = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const info = await getUserInfo(token);

    if (!info || info.user.status !== 1) {
      return responseSender(res, 401, false, null, "Unauthorized");
    }
    const organizationId = info.user.organization_id || info.user._id;

    const updateData = { ...req.body };
    delete updateData.module_id;
    delete updateData.organizationId;
    delete updateData.status;
    updateData.editedBy = info.user._id;

    const updatedNote = await Note.findByIdAndUpdate(id, updateData, { new: true });
    return responseSender(res, 200, true, { note: updatedNote });
  } catch (err) {
    return responseSender(res, 500, false, null, err.message);
  }
};

// Soft delete Note
export const updateStatus = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const teamMember = await TeamMember.findById(decoded.id);

    const { id } = req.params;
    const note = await Note.findById(id);

    if (!note || note.organization_id.toString() !== teamMember.organization_id.toString()) {
      return responseSender(res, 404, false, null, "Note not found");
    }

    const { status } = req.body;
    note.status = status;
    note.editedBy = teamMember._id;
    await note.save();

    return responseSender(res, 200, true, { note });
  } catch (err) {
    return responseSender(res, 500, false, null, err.message);
  }
};
