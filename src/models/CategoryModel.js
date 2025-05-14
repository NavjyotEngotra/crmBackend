import mongoose from "mongoose";
const categorySchema = new mongoose.Schema(
    {
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        status: {
            type: Number,
            enum: [0, 1], // 0 = inactive, 1 = active
            default: 1,
        },
    },
    {
        timestamps: true,
    }
);

// Enforce unique category name per organization
categorySchema.index({ organization_id: 1, name: 1 }, { unique: true });

export default mongoose.model("Category", categorySchema);