import Note from "../models/NoteModel.js";
import TeamMember from "../models/TeamMemberModel.js";
import jwt from "jsonwebtoken";
import  responseSender  from "../utilities/responseSender.js";

// Create Note
export const createNote = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const teamMember = await TeamMember.findById(decoded.id);

    if (!teamMember || teamMember.status !== 1) {
      return responseSender(res, 401, false, "Unauthorized");
    }

    const { title, description, module_id } = req.body;

    const note = new Note({
      title,
      description,
      module_id,
      organization_id: teamMember.organization_id,
      createdBy: teamMember._id,
      editedBy: teamMember._id,
    });

    await note.save();
    return responseSender(res, 201, true, "Note created", { note });
  } catch (err) {
    return responseSender(res, 500, false, err.message);
  }
};

// Get Notes by module_id (paginated, newest first)
export const getNotesByModuleId = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const teamMember = await TeamMember.findById(decoded.id);

    if (!teamMember || teamMember.status !== 1) {
      return responseSender(res, 401, false, "Unauthorized");
    }

    const { module_id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const notes = await Note.find({
      module_id,
      organization_id: teamMember.organization_id,
      status: 1,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit + 1);

    const hasNextPage = notes.length > limit;
    const paginatedNotes = hasNextPage ? notes.slice(0, limit) : notes;

    return responseSender(res, 200, true, "Notes fetched", {
      notes: paginatedNotes,
      pagination: { hasNextPage },
    });
  } catch (err) {
    return responseSender(res, 500, false, err.message);
  }
};

// Update Note
export const updateNote = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const teamMember = await TeamMember.findById(decoded.id);

    const { id } = req.params;
    const note = await Note.findById(id);

    if (!note || note.organization_id.toString() !== teamMember.organization_id.toString()) {
      return responseSender(res, 404, false, "Note not found");
    }

    const updateData = { ...req.body };
    delete updateData.module_id;
    delete updateData.organization_id;
    delete updateData.status;
    updateData.editedBy = teamMember._id;

    const updatedNote = await Note.findByIdAndUpdate(id, updateData, { new: true });
    return responseSender(res, 200, true, "Note updated", { note: updatedNote });
  } catch (err) {
    return responseSender(res, 500, false, err.message);
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
      return responseSender(res, 404, false, "Note not found");
    }

    const { status } = req.body;
    note.status = status;
    note.editedBy = teamMember._id;
    await note.save();

    return responseSender(res, 200, true, "Note status updated", { note });
  } catch (err) {
    return responseSender(res, 500, false, err.message);
  }
};
