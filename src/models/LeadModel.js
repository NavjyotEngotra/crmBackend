import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Lead name is required"],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        pipeline_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Pipeline",
            required: [true, "Pipeline is required"],
        },
        stage_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Stage",
            required: [true, "Stage is required"],
        },
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: [true, "Organization is required"],
        },
        assigned_to: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TeamMember",
        },
        created_by: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'created_by_model',
            required: true,
        },
        created_by_model: {
            type: String,
            required: true,
            enum: ['Organization', 'TeamMember'],
        },
        updated_by: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'updated_by_model',
            required: true,
        },
        updated_by_model: {
            type: String,
            required: true,
            enum: ['Organization', 'TeamMember'],
        },
        product_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
        },
        company_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
        },
        contact_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Contact",
        },
        amount: {
            type: Number,
            required: [true, "Amount is required"],
            min: [0, "Amount cannot be negative"],
        },
        tax: {
            type: Number,
            default: 0,
            min: [0, "Tax cannot be negative"],
        },
        discount: {
            type: Number,
            default: 0,
            min: [0, "Discount cannot be negative"],
        },
        meeting_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Meeting",
        },
        status: {
            type: Number,
            enum: [0, 1], // 0 = inactive/deleted, 1 = active
            default: 1,
        },
    },
    { timestamps: true }
);

// Indexes for better query performance
leadSchema.index({ organization_id: 1, status: 1 });
leadSchema.index({ pipeline_id: 1, stage_id: 1 });
leadSchema.index({ name: 'text' });
leadSchema.index({ assigned_to: 1 });

export default mongoose.model("Lead", leadSchema); 