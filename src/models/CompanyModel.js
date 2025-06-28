import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
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
        owner_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TeamMember",
        },
        // contacts: [
        //     {
        //         type: mongoose.Schema.Types.ObjectId,
        //         ref: "Contact",
        //     },
        // ],
        description: {
            type: String,
            trim: true,
        },
        email: {
            type: String,
            lowercase: true,
            trim: true,
            match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        },
        address: {
            type: String,
            trim: true,
        },
        pincode: {
            type: String,
        },
        phone: {
            type: String,
        },
        status: {
            type: Number,
            enum: [0, 1], // 0 = deleted, 1 = active
            default: 1,
        },
        website: {
            type: String,
            trim: true,
        },
        gstNo: {
            type: String,
            trim: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TeamMember",
            required: true,
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TeamMember",
            required: true,
        },
    },
    { timestamps: true }
);

// 🔹 Add this:
companySchema.virtual("contactList", {
    ref: "Contact",
    localField: "_id",
    foreignField: "company_id",
    justOne: false,
});

companySchema.set("toObject", { virtuals: true });
companySchema.set("toJSON", { virtuals: true });

export default mongoose.model("Company", companySchema);
