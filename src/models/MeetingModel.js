
import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema(
    {
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true
        },
        from: {
            type: Date,
            required: true
        },
        to: {
            type: Date,
            required: true
        },
        meeting_status: {
            type: String,
            enum: ['scheduled', 'complete', 'cancelled'],
            default: 'scheduled'
        },
        meeting_type: {
            type: String,
            enum: ['person', 'on-call', 'virtual'],
            required: true
        },
        location: {
            type: String,
            required: true
        },
        description: {
            type: String,
            trim: true
        },
        status: {
            type: Number,
            enum: [0, 1],
            default: 1
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'createdByModel',
            required: true
        },
        createdByModel: {
            type: String,
            required: true,
            enum: ['Organization', 'TeamMember']
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'updatedByModel',
            required: true
        },
        updatedByModel: {
            type: String,
            required: true,
            enum: ['Organization', 'TeamMember']
        }
    },
    { timestamps: true }
);

export default mongoose.model("Meeting", meetingSchema);
