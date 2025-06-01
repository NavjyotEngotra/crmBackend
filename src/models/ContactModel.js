import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
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
        designation:{
             type: String,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        },
        phoneno: {
            type: [String], // multiple numbers allowed
            default: [],
        },
        owner_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TeamMember",
        },
        title: {
            type: String,
            trim: true,
        },
        company_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
        },
        address: {
            type: String,
            trim: true,
        },
        pincode: {
            type: String,
        },
        status: {
            type: Number,
            enum: [0, 1], // 0 = deleted, 1 = active
            default: 1,
        },
        createdBy:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "TeamMember",
            required: true,
        },
        updatedBy:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "TeamMember",
            required: true,
        }
    },
    { timestamps: true }
);

export default mongoose.model("Contact", contactSchema);
