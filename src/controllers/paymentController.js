import Razorpay from "razorpay";
import crypto from "crypto";
import mongoose from "mongoose";
import Payment from "../models/paymentModel.js";
import Organization from "../models/OrganizationModel.js";
import Plan from "../models/Plan.js";
import responseSender from "../utilities/responseSender.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ✅ Create Razorpay Order
export const createOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return responseSender(res, 400, false, null, "Invalid amount");
    }

    const options = {
      amount: amount * 100,
      currency: "INR",
      payment_capture: 1,
    };

    const order = await razorpay.orders.create(options);
    return responseSender(res, 201, true, { order }, "Order created successfully");
  } catch (error) {
    return responseSender(res, 500, false, { error: error.message }, "Failed to create order");
  }
};

// ✅ Verify Payment
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, organizationId, planId, amount } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !organizationId || !planId) {
      return responseSender(res, 400, false, null, "Missing required payment details");
    }

    const existingPayment = await Payment.findOne({ razorpay_payment_id });
    if (existingPayment) {
      return responseSender(res, 400, false, null, "Payment already processed");
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return responseSender(res, 400, false, null, "Payment verification failed");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const plan = await Plan.findById(planId).session(session);
      if (!plan) {
        await session.abortTransaction();
        return responseSender(res, 404, false, null, "Plan not found");
      }

      const organization = await Organization.findById(organizationId).session(session);
      if (!organization) {
        await session.abortTransaction();
        return responseSender(res, 404, false, null, "Organization not found");
      }

      let currentExpireDate = new Date();
      if (organization.plan_expire_date && new Date(organization.plan_expire_date) > new Date()) {
        currentExpireDate = new Date(organization.plan_expire_date);
      }

      const additionalDays = plan.duration * 30;
      currentExpireDate.setDate(currentExpireDate.getDate() + additionalDays);

      const payment = new Payment({
        organizationId,
        planId,
        razorpay_order_id,
        razorpay_payment_id,
        amount,
        status: "Paid",
      });
      await payment.save({ session });

      organization.plan_id = planId;
      organization.plan_expire_date = currentExpireDate;
      await organization.save({ session });

      await session.commitTransaction();
      session.endSession();

      return responseSender(res, 200, true, {
        expireDate: organization.plan_expire_date,
      }, "Payment verified & plan activated");
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    return responseSender(res, 500, false, { error: error.message }, "Payment verification failed");
  }
};

// ✅ Get All Payments
export const getPayments = async (req, res) => {
  try {
    const { page = 1 } = req.query;

    const limit = 50;
    const skip = (page - 1) * limit;

    const payments = await Payment.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("organizationId")
      .populate("planId");

    const total = await Payment.countDocuments();

    return responseSender(res, 200, true, {
      payments,
      pagination: {
        total,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
      },
    }, "Payments fetched");
  } catch (error) {
    return responseSender(res, 500, false, { error: error.message }, "Failed to fetch payments");
  }
};

// ✅ Search Payments by Organization
export const searchPayments = async (req, res) => {
  try {
    const { organizationId } = req.query;

    if (!organizationId) {
      return responseSender(res, 400, false, null, "organizationId is required for search");
    }

    const payments = await Payment.find({ organizationId })
      .sort({ createdAt: -1 })
      .populate("organizationId")
      .populate("planId");

    return responseSender(res, 200, true, { payments }, "Payments found");
  } catch (error) {
    return responseSender(res, 500, false, { error: error.message }, "Failed to search payments");
  }
};
