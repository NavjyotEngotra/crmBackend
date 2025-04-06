import Note from "../models/NoteModel.js";
import TeamMember from "../models/TeamMemberModel.js";
import jwt from "jsonwebtoken";

// Create Note
export const createNote = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const teamMember = await TeamMember.findById(decoded.id);

    if (!teamMember || teamMember.status !== 1) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
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
    res.status(201).json({ success: true, message: "Note created", note });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get Notes by module_id (paginated, newest first)
export const getNotesByModuleId = async (req, res) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const teamMember = await TeamMember.findById(decoded.id);
  
      if (!teamMember || teamMember.status !== 1)
        return res.status(401).json({ success: false, message: "Unauthorized" });
  
      const { module_id } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const skip = (page - 1) * limit;
  
      // Fetch one extra to determine if next page exists
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
  
      res.json({
        success: true,
        notes: paginatedNotes,
        pagination: {
          hasNextPage,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
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
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    const updateData = { ...req.body };
    delete updateData.module_id
    delete updateData.organization_id
    delete updateData.status
    updateData.editedBy = teamMember._id;

    const updatedNote = await Note.findByIdAndUpdate(id, updateData, { new: true });
    res.json({ success: true, message: "Note updated", note: updatedNote });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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
      return res.status(404).json({ success: false, message: "Note not found" });
    }
    const {status} =  req.body ;
    note.status = status;
    note.editedBy = teamMember._id;
    await note.save();

    res.json({ success: true, message: "Note status updated", note });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
