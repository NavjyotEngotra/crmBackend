
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
        tax: {
            type: Number,
            required: true,
            default: 0,
        },
        stockQuantity: {
            type: Number,
            required: true,
            default: 0,
        },
        commissionRate: {
            type: Number,
            required: true,
            default: 0,
        },
        tentativeDate: {
            type: Date,
        },
        owner_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TeamMember",
        },
        status: {
            type: Number,
            enum: [0, 1],
            default: 1,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Product", productSchema);
