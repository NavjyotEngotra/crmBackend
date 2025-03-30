import Organization from "../models/organizationModel.js";

export const ensurePaymentVerified = async (req, res, next) => {
    try {
      const organization = await Organization.findById(req.body.organizationId);
  
      if (!organization || !organization.plan_expire_date) {
        return res.status(403).json({ success: false, message: "No active plan found!" });
      }
  
      if (new Date(organization.plan_expire_date) < new Date()) {
        return res.status(403).json({ success: false, message: "Plan expired! Renew required." });
      }
  
      next();
    } catch (error) {
      res.status(500).json({ success: false, message: "Unauthorized access", error: error.message });
    }
  };