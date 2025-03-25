import mongoose from "mongoose";

const planSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            maxlength: 255,
        },
        price: {
            type: Number,
            required: true,
            min: 0, // Ensures price can't be negative
        },
        description: {
            type: String,
            maxlength: 5000,
        },
        duration: {
            type: Number,
            required: true,
            min: 1, // Minimum duration is 1 month
        }
    },
    { timestamps: true }
);

const Plan = mongoose.model("Plan", planSchema);

export default Plan;
