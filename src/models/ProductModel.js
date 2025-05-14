import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
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
        code: {
            type: String,
            required: true,
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },
        price: {
            type: Number,
            required: true,
        },
        description: {
            type: String,
            trim: true,
        },
        owner_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TeamMember",
        },
        status: {
            type: Number,
            enum: [0, 1], // 0 = deleted, 1 = active
            default: 1,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Product", productSchema);
