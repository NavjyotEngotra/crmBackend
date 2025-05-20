import mongoose from "mongoose";

const pipelineSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    users_has_access: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TeamMember'
    }],
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    status: {
        type: Number,
        enum: [0, 1],
        default: 1
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TeamMember',
        required: true
    },
    updated_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TeamMember'
    }
}, {
    timestamps: true
});

// Index for faster queries
pipelineSchema.index({ organization_id: 1, status: 1 });
pipelineSchema.index({ name: 'text' });

// Compound unique index for name and organization_id
pipelineSchema.index({ name: 1, organization_id: 1 }, { unique: true });

export default mongoose.model('Pipeline', pipelineSchema); 