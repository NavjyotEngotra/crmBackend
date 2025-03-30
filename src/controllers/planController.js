import Plan from "../models/Plan.js";

export const createPlan = async (req, res) => {
    try {
        const { title, price, description, duration } = req.body;

        // Validate input
        if (!title || !price || !duration) {
            return res.status(400).json({ message: "Title, price, and duration are required" });
        }

        // Create new plan
        const newPlan = new Plan({ title, price, description, duration });
        await newPlan.save();

        return res.status(201).json({
            message: "Plan created successfully",
            plan: newPlan,
        });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};


export const getAllPlans = async (req, res) => {
    try {
        const plans = await Plan.find();
        return res.status(200).json(plans);
    } catch (error) {
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const getActivePlans = async (req, res) => {
    try {
        const plans = await Plan.find({ status: 1 }); // ✅ Fetch only active plans

        return res.status(200).json(plans);
    } catch (error) {
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const getPlanById = async (req, res) => {
    try {
        const plan = await Plan.findById(req.params.id);
        if (!plan) {
            return res.status(404).json({ message: "Plan not found" });
        }
        return res.status(200).json(plan);
    } catch (error) {
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const updatePlan = async (req, res) => {
    try {
        const { title, price, description, duration } = req.body;

        const updatedPlan = await Plan.findByIdAndUpdate(
            req.params.id,
            { title, price, description, duration, updatedAt: Date.now() },
            { new: true, runValidators: true }
        );

        if (!updatedPlan) {
            return res.status(404).json({ message: "Plan not found" });
        }

        return res.status(200).json({
            message: "Plan updated successfully",
            plan: updatedPlan,
        });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const deletePlan = async (req, res) => {
    try {
        const deletedPlan = await Plan.findByIdAndDelete(req.params.id);
        if (!deletedPlan) {
            return res.status(404).json({ message: "Plan not found" });
        }

        return res.status(200).json({ message: "Plan deleted successfully" });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const softDeletePlan = async (req, res) => {
    try {
        const updatedPlan = await Plan.findByIdAndUpdate(
            req.params.id,
            { status: 0 },  // ✅ Sets status to 0 instead of deleting
            { new: true }   // ✅ Returns the updated document
        );

        if (!updatedPlan) {
            return res.status(404).json({ message: "Plan not found" });
        }

        return res.status(200).json({ message: "Plan status updated to inactive (0)", plan: updatedPlan });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const recoverPlan = async (req, res) => {
    try {
        const updatedPlan = await Plan.findByIdAndUpdate(
            req.params.id,
            { status: 1 },  // ✅ Reactivates the plan
            { new: true }
        );

        if (!updatedPlan) {
            return res.status(404).json({ message: "Plan not found" });
        }

        return res.status(200).json({ message: "Plan recovered successfully", plan: updatedPlan });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};