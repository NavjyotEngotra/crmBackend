import { Permission } from "../models/PermissionModel.js";
import  responseSender  from "../utilities/responseSender.js";

/**
 * Create a new permission (superadmin only)
 */
export const createPermission = async (req, res) => {
  try {
    const payload = req.body;

    if (Array.isArray(payload)) {
      const invalid = payload.find(
        (p) => !p.name || !/^[a-zA-Z0-9]+\.(create|update|read|delete)$/.test(p.name)
      );
      if (invalid) {
        return responseSender(res, false, 400, "Each permission must have a valid name");
      }

      const names = payload.map((p) => p.name);
      const existing = await Permission.find({ name: { $in: names } });
      if (existing.length > 0) {
        return responseSender(res, false, 409, "Some permissions already exist", { existing });
      }

      const created = await Permission.insertMany(payload);
      return responseSender(res, true, 201, "Permissions created", { permissions: created });
    }

    const { name, description } = payload;

    if (!name) {
      return responseSender(res, false, 400, "Permission name is required");
    }

    const existing = await Permission.findOne({ name });
    if (existing) {
      return responseSender(res, false, 409, "Permission already exists");
    }

    const permission = new Permission({ name, description });
    await permission.save();

    return responseSender(res, true, 201, "Permission created", { permission });
  } catch (error) {
    console.error("createPermission error:", error);
    return responseSender(res, false, 500, "Server error");
  }
};

/**
 * Get all permissions (superadmin + organization/team member)
 */
export const getAllPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find();
    return responseSender(res, true, 200, "Permissions fetched", { permissions });
  } catch (error) {
    console.error("getAllPermissions error:", error);
    return responseSender(res, false, 500, "Server error");
  }
};

/**
 * Get a permission by ID
 */
export const getPermissionById = async (req, res) => {
  try {
    const { id } = req.params;
    const permission = await Permission.findById(id);

    if (!permission) {
      return responseSender(res, false, 404, "Permission not found");
    }

    return responseSender(res, true, 200, "Permission fetched", { permission });
  } catch (error) {
    console.error("getPermissionById error:", error);
    return responseSender(res, false, 500, "Server error");
  }
};

/**
 * Update permission (superadmin only)
 */
export const updatePermission = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const permission = await Permission.findByIdAndUpdate(
      id,
      { name, description },
      { new: true }
    );

    if (!permission) {
      return responseSender(res, false, 404, "Permission not found");
    }

    return responseSender(res, true, 200, "Permission updated", { permission });
  } catch (error) {
    console.error("updatePermission error:", error);
    return responseSender(res, false, 500, "Server error");
  }
};

/**
 * Delete permission (superadmin only)
 */
export const deletePermission = async (req, res) => {
  try {
    const { id } = req.params;
    const permission = await Permission.findByIdAndDelete(id);

    if (!permission) {
      return responseSender(res, false, 404, "Permission not found");
    }

    return responseSender(res, true, 200, "Permission deleted");
  } catch (error) {
    console.error("deletePermission error:", error);
    return responseSender(res, false, 500, "Server error");
  }
};
