import mongoose from "mongoose";

const planSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            maxlength: 255,
            trim: true, // Removes leading/trailing spaces
        },
        price: { // in INR
            type: Number,
            required: true,
            min: 0, // Ensures price can't be negative
            index: true, // Optimizes queries filtering by price
        },
        description: {
            type: String,
            maxlength: 5000,
            trim: true,
        },
        status: {
            type: Number,
            enum: [0, 1], // 0 = Inactive, 1 = Active
            default: 1, //  Sets default value to 1
        },
        duration: { // in days
            type: Number,
            required: true,
            min: 1, // Minimum duration is 1 day
            index: true, // Optimize searches based on duration
        }
    },
    { timestamps: true }
);

const Plan = mongoose.model("Plan", planSchema);

export default Plan;
