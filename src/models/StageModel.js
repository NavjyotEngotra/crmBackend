import mongoose from "mongoose";

const stageSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Stage name is required"],
            trim: true,
        },
        serialNumber: {
            type: Number,
            required: [true, "Serial number is required"],
            min: [1, "Serial number must be greater than 0"],
        },
        stageType: {
            type: String,
            enum: ["open", "closePositive", "closeNegative"],
            required: [true, "Stage type is required"],
        },
        status: {
            type: Number,
            default: 1,
            enum: [0, 1], // 0 for inactive, 1 for active
        },
        pipeline_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Pipeline",
            required: [true, "Pipeline ID is required"],
        },
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: [true, "Organization ID is required"],
        },
        created_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        updated_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
        },
    },
    {
        timestamps: true,
    }
);



// Check if the model exists before creating a new one
const Stage = mongoose.models.Stage || mongoose.model("Stage", stageSchema);

export default Stage;
