import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const organizationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 255,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // Email validation
        },
        password: {
            type: String,
            required: true,
            select: false, // Do not return password in queries
            minlength: 6, // Minimum 6 characters
        },
        plan_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Plan",
            default: null,
        },
        plan_expire_date: {
            type: Date,
            default: null,
        },
        pinCode: {
            type: String,
            required: true,
            match: /^[1-9][0-9]{5}$/, // 6-digit PIN code validation
        },
        address: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500,
        },
        status: {
            type: Number,
            enum: [0, 1], // 0 = Deleted (Inactive), 1 = Active
            default: 1,
        },
    },
    { timestamps: true }
);

//  Hash password before saving
organizationSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

//  Extend Plan Expiry Instead of Overwriting
organizationSchema.methods.extendPlan = function (additionalDays) {
    if (this.plan_expire_date && this.plan_expire_date > new Date()) {
        // If there's an active plan, extend from the current expiry date
        this.plan_expire_date = new Date(this.plan_expire_date.getTime() + additionalDays * 24 * 60 * 60 * 1000);
    } else {
        // If no active plan, start from today
        this.plan_expire_date = new Date(Date.now() + additionalDays * 24 * 60 * 60 * 1000);
    }
};

const Organization = mongoose.model("Organization", organizationSchema);
export default Organization;
