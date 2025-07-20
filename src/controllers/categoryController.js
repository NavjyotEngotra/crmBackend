import Category from "../models/CategoryModel.js";
import { getUserInfo } from "../utilities/getUserInfo.js";
import responseSender from "../utilities/responseSender.js";

// Create category
export const createCategory = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const info = await getUserInfo(token);

    if (!info || info.type !== "organization") {
      return responseSender(res, 401, false, null, "Only organizations can create categories");
    }

    const { name, description } = req.body;

    const existing = await Category.findOne({
      organization_id: info.user._id,
      name,
    });

    if (existing) {
      return responseSender(res, 400, false, null, "Category with this name already exists");
    }

    const category = new Category({
      organization_id: info.user._id,
      name,
      description,
    });

    await category.save();
    return responseSender(res, 201, true, category, "Category created successfully");
  } catch (error) {
    return responseSender(res, 500, false, null, error.message);
  }
};

// Get all categories for the logged-in organization
export const getCategories = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const info = await getUserInfo(token);

    if (!info) {
      return responseSender(res, 401, false, null, "Unauthorized");
    }

    const organizationId = info.user.organization_id || info.user._id;

    const filter = { organization_id: organizationId };

    if (req.query.status !== undefined) {
      const status = parseInt(req.query.status);
      if (![0, 1].includes(status)) {
        return responseSender(res, 400, false, null, "Invalid status value. Must be 0 or 1.");
      }
      filter.status = status;
    }

    const categories = await Category.find(filter);
    return responseSender(res, 200, true, categories, "Categories fetched successfully");
  } catch (error) {
    return responseSender(res, 500, false, null, error.message);
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

    if (!category) {
      return responseSender(res, 404, false, null, "Category not found");
    }

    return responseSender(res, 200, true, category, "Category fetched successfully");
  } catch (error) {
    return responseSender(res, 500, false, null, error.message);
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

    if (!updated) {
      return responseSender(res, 404, false, null, "Category not found or unauthorized");
    }

    return responseSender(res, 200, true, updated, "Category updated successfully");
  } catch (error) {
    return responseSender(res, 500, false, null, error.message);
  }
};
