import Category from "../models/CategoryModel.js";
import { getUserInfo } from "../utilities/getUserInfo.js";

// Create category
export const createCategory = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.type !== "organization") {
            return res.status(401).json({ success: false, message: "Only organizations can create categories" });
        }

        const { name, description } = req.body;

        const existing = await Category.findOne({
            organization_id: info.user._id,
            name,
        });

        if (existing) {
            return res.status(400).json({ success: false, message: "Category with this name already exists" });
        }

        const category = new Category({
            organization_id: info.user._id,
            name,
            description,
        });

        await category.save();
        res.status(201).json({ success: true, category });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all categories for the logged-in organization
export const getCategories = async (req, res) => {
  try {
      const token = req.headers.authorization?.split(" ")[1];
      const info = await getUserInfo(token);

      if (!info) {
          return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const organizationId = info.user.organization_id || info.user._id;

      const filter = { organization_id: organizationId };

      if (req.query.status !== undefined) {
          const status = parseInt(req.query.status);
          if (![0, 1].includes(status)) {
              return res.status(400).json({ success: false, message: "Invalid status value. Must be 0 or 1." });
          }
          filter.status = status;
      }

      const categories = await Category.find(filter);

      res.json({ success: true, categories });
  } catch (error) {
      res.status(500).json({ success: false, message: error.message });
  }
};

// Get category by ID
export const getCategoryById = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        const organizationId = info.user.organization_id || info.user._id;

        const category = await Category.findOne({
            _id: req.params.id,
            organization_id: organizationId,
        });

        if (!category) return res.status(404).json({ success: false, message: "Category not found" });

        res.json({ success: true, category });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update category
export const updateCategory = async (req, res) => {
  try {
      const token = req.headers.authorization?.split(" ")[1];
      const info = await getUserInfo(token);

      const organizationId = info.user.organization_id || info.user._id;

      const { name, description, status } = req.body;

      // Prepare update object dynamically
      const updateFields = {};
      if (name !== undefined) updateFields.name = name;
      if (description !== undefined) updateFields.description = description;
      if (status !== undefined) updateFields.status = status;

      const updated = await Category.findOneAndUpdate(
          { _id: req.params.id, organization_id: organizationId },
          updateFields,
          { new: true }
      );

      if (!updated)
          return res.status(404).json({
              success: false,
              message: "Category not found or unauthorized",
          });

      res.json({ success: true, category: updated });
  } catch (error) {
      res.status(500).json({ success: false, message: error.message });
  }
};

