// models/InviteToken.js
import mongoose from "mongoose";

const inviteTokenSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    token: {
        type: String,
        required: true,
        unique: true,
    },
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
}, {
    timestamps: true
});

export default mongoose.model("InviteToken", inviteTokenSchema);
