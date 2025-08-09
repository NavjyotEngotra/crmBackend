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
        return responseSender(res, false, 400,null, "Each permission must have a valid name");
      }

      const names = payload.map((p) => p.name);
      const existing = await Permission.find({ name: { $in: names } });
      if (existing.length > 0) {
        return responseSender(res, false, 409, {existing}, "Some permissions already exist");
      }

      const created = await Permission.insertMany(payload);
      return responseSender(res, true, 201,  { permissions: created });
    }

    const { name, description } = payload;

    if (!name) {
      return responseSender(res, false, 400, "Permission name is required");
    }

    const existing = await Permission.findOne({ name });
    if (existing) {
      return responseSender(res, false, 409,null, "Permission already exists");
    }

    const permission = new Permission({ name, description });
    await permission.save();

    return responseSender(res, true, 201,  { permission });
  } catch (error) {
    console.error("createPermission error:", error);
    return responseSender(res, false, 500,null, "Server error");
  }
};

/**
 * Get all permissions (superadmin + organization/team member)
 */
export const getAllPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find();
    return responseSender(res, true, 200,  { permissions });
  } catch (error) {
    console.error("getAllPermissions error:", error);
    return responseSender(res, false, 500, null,"Server error");
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
      return responseSender(res, false, 404, null,"Permission not found");
    }

    return responseSender(res, true, 200, { permission });
  } catch (error) {
    console.error("getPermissionById error:", error);
    return responseSender(res, false, 500,null, "Server error");
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
      return responseSender(res, false, 404,null, "Permission not found");
    }

    return responseSender(res, true, 200,  { permission });
  } catch (error) {
    console.error("updatePermission error:", error);
    return responseSender(res, false, 500,null, "Server error");
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
      return responseSender(res, false, 404,null, "Permission not found");
    }

    return responseSender(res, true, 200,null, "Permission deleted");
  } catch (error) {
    console.error("deletePermission error:", error);
    return responseSender(res, false, 500,null, "Server error");
  }
};
