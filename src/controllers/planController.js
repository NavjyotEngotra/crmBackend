import Plan from "../models/Plan.js";
import responseSender from "../utilities/responseSender.js";

export const createPlan = async (req, res) => {
    try {
        const { title, price, description, duration } = req.body;

        if (!title || !price || !duration) {
            return responseSender(res, 400, false, null, "Title, price, and duration are required");
        }

        const newPlan = new Plan({ title, price, description, duration });
        await newPlan.save();

        return responseSender(res, 201, true, { plan: newPlan }, "Plan created successfully");
    } catch (error) {
        return responseSender(res, 500, false, { error: error.message }, "Server error");
    }
};

export const getAllPlans = async (req, res) => {
    try {
        const plans = await Plan.find();
        return responseSender(res, 200, true, { plans }, "All plans retrieved");
    } catch (error) {
        return responseSender(res, 500, false, { error: error.message }, "Server error");
    }
};

export const getActivePlans = async (req, res) => {
    try {
        const plans = await Plan.find({ status: 1 });
        return responseSender(res, 200, true, { plans }, "Active plans retrieved");
    } catch (error) {
        return responseSender(res, 500, false, { error: error.message }, "Server error");
    }
};

export const getPlanById = async (req, res) => {
    try {
        const plan = await Plan.findById(req.params.id);
        if (!plan) {
            return responseSender(res, 404, false, null, "Plan not found");
        }
        return responseSender(res, 200, true, { plan }, "Plan found");
    } catch (error) {
        return responseSender(res, 500, false, { error: error.message }, "Server error");
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
            return responseSender(res, 404, false, null, "Plan not found");
        }

        return responseSender(res, 200, true, { plan: updatedPlan }, "Plan updated successfully");
    } catch (error) {
        return responseSender(res, 500, false, { error: error.message }, "Server error");
    }
};

export const deletePlan = async (req, res) => {
    try {
        const deletedPlan = await Plan.findByIdAndDelete(req.params.id);
        if (!deletedPlan) {
            return responseSender(res, 404, false, null, "Plan not found");
        }

        return responseSender(res, 200, true, null, "Plan deleted successfully");
    } catch (error) {
        return responseSender(res, 500, false, { error: error.message }, "Server error");
    }
};

export const softDeletePlan = async (req, res) => {
    try {
        const updatedPlan = await Plan.findByIdAndUpdate(
            req.params.id,
            { status: 0 },
            { new: true }
        );

        if (!updatedPlan) {
            return responseSender(res, 404, false, null, "Plan not found");
        }

        return responseSender(res, 200, true, { plan: updatedPlan }, "Plan status updated to inactive");
    } catch (error) {
        return responseSender(res, 500, false, { error: error.message }, "Server error");
    }
};

export const recoverPlan = async (req, res) => {
    try {
        const updatedPlan = await Plan.findByIdAndUpdate(
            req.params.id,
            { status: 1 },
            { new: true }
        );

        if (!updatedPlan) {
            return responseSender(res, 404, false, null, "Plan not found");
        }

        return responseSender(res, 200, true, { plan: updatedPlan }, "Plan recovered successfully");
    } catch (error) {
        return responseSender(res, 500, false, { error: error.message }, "Server error");
    }
};
