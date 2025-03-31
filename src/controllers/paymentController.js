import Razorpay from "razorpay";
import crypto from "crypto";
import Payment from "../models/paymentModel.js"; // Payment Model
import Organization from "../models/OrganizationModel.js";
import Plan from "../models/Plan.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ✅ Create Razorpay Order
export const createOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    // Validate input
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    const options = {
      amount: amount * 100, // Convert INR to paise
      currency: "INR",
      payment_capture: 1, // Auto-capture payment
    };

    const order = await razorpay.orders.create(options);
    // res.redirect(`https://checkout.razorpay.com/v1/checkout.js?order_id=${order.id}`);
    res.status(201).json({ success: true, order });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ success: false, message: "Failed to create order", error: error.message });
  }
};


export const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, organizationId, planId, amount } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !organizationId || !planId) {
            return res.status(400).json({ success: false, message: "Missing required payment details" });
        }

        // ✅ Check if payment already exists (Prevents duplicate processing)
        const existingPayment = await Payment.findOne({ razorpay_payment_id });
        if (existingPayment) {
            return res.status(400).json({ success: false, message: "Payment already processed!" });
        }

        // ✅ Verify Signature (to prevent fraud)
        const generatedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: "Payment verification failed!" });
        }

        // ✅ Start MongoDB transaction
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // ✅ Check if plan is valid
            const plan = await Plan.findById(planId).session(session);
            if (!plan) {
                await session.abortTransaction();
                return res.status(404).json({ success: false, message: "Plan not found" });
            }

            // ✅ Check if the organization exists
            const organization = await Organization.findById(organizationId).session(session);
            if (!organization) {
                await session.abortTransaction();
                return res.status(404).json({ success: false, message: "Organization not found" });
            }

            // ✅ Prevent multiple purchases (if the plan is already active)
            let currentExpireDate = new Date();
            if (organization.plan_expire_date && new Date(organization.plan_expire_date) > new Date()) {
                currentExpireDate = new Date(organization.plan_expire_date); // Extend from current expiry
            }

            // ✅ Convert plan duration (months) to days for accuracy
            const additionalDays = plan.duration * 30; // Approximate month-to-days conversion

            // ✅ Extend expiry date instead of overwriting
            currentExpireDate.setDate(currentExpireDate.getDate() + additionalDays);

            // ✅ Save Payment to Database
            const payment = new Payment({
                organizationId,
                planId,
                razorpay_order_id,
                razorpay_payment_id,
                amount,
                status: "Paid",
            });
            await payment.save({ session });

            // ✅ Activate the plan and save changes
            organization.plan_id = planId;
            organization.plan_expire_date = currentExpireDate;
            await organization.save({ session });

            // ✅ Commit transaction
            await session.commitTransaction();
            session.endSession();

            res.json({ success: true, message: "Payment verified & plan activated!", expireDate: organization.plan_expire_date });
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Payment verification failed", error: error.message });
    }
};


export const getPayments = async (req, res) => {
    try {
        const { page = 1 } = req.query;

        // Pagination setup
        const limit = 50;
        const skip = (page - 1) * limit;

        // Fetch payments with sorting and pagination
        const payments = await Payment.find()
            .sort({ createdAt: -1 })  // Newest first
            .skip(skip)
            .limit(limit)
            .populate("organizationId")
            .populate("planId");

        // Total payments count (for pagination info)
        const total = await Payment.countDocuments();

        res.json({
            success: true,
            payments,
            pagination: {
                total,
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Search payments by organizationId
export const searchPayments = async (req, res) => {
    try {
        const { organizationId } = req.query;

        if (!organizationId) {
            return res.status(400).json({ success: false, message: "organizationId is required for search" });
        }

        // Search payments by organizationId
        const payments = await Payment.find({ organizationId })
            .sort({ createdAt: -1 })  // Newest first
            .populate("organizationId")
            .populate("planId");

        res.json({ success: true, payments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};