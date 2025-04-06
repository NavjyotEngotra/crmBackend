import mongoose from "mongoose";

const NoteSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    module_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    organization_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Organization" },
    status: { type: Number, enum: [0, 1], default: 1 }, // 1 = active, 0 = deleted
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "TeamMember" },
    editedBy: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "TeamMember" },
}, {
    timestamps: true // auto handles createdAt and updatedAt
});

export default mongoose.model("Note", NoteSchema);
