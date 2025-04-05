import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const teamMemberSchema = new mongoose.Schema(
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
        full_name: {
            type: String,
            trim: true,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        },
        password: {
            type: String,
            required: true,
            minlength: 6,
            select: false,
        },
        phone: {
            type: String,
        },
        role: {
            type: String,
            enum: ["admin", "sales"],
            default: "sales",
        },
        domainName: {
            type: String,
        },
        organizationName: {
            type: String,
            required: true,
        },
        status: {
            type: Number,
            enum: [0, 1], // 0 = deleted, 1 = active
            default: 1,
        },
    },
    { timestamps: true }
);

// Hash password before saving
teamMemberSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

export default mongoose.model("TeamMember", teamMemberSchema);
