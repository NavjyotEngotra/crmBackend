import { Permission } from "../models/PermissionModel.js";

/**
 * Create a new permission (superadmin only)
 */
export const createPermission = async (req, res) => {
    try {
        const payload = req.body;

        // If an array, bulk insert
        if (Array.isArray(payload)) {
            // Validate all entries
            const invalid = payload.find(
                p => !p.name || !/^[a-zA-Z0-9]+\.(create|update|read|delete)$/.test(p.name)
            );
            if (invalid) {
                return res.status(400).json({ message: "Each permission must have a valid name" });
            }

            // Check for duplicates in DB
            const names = payload.map(p => p.name);
            const existing = await Permission.find({ name: { $in: names } });
            if (existing.length > 0) {
                return res
                    .status(409)
                    .json({ message: "Some permissions already exist", existing });
            }

            const created = await Permission.insertMany(payload);
            return res.status(201).json({
                message: "Permissions created",
                permissions: created
            });
        }

        // If single
        const { name, description } = payload;

        if (!name) {
            return res.status(400).json({ message: "Permission name is required" });
        }

        const existing = await Permission.findOne({ name });
        if (existing) {
            return res.status(409).json({ message: "Permission already exists" });
        }

        const permission = new Permission({ name, description });
        await permission.save();

        return res.status(201).json({ message: "Permission created", permission });
    } catch (error) {
        console.error("createPermission error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * Get all permissions (superadmin + organization/team member)
 */
export const getAllPermissions = async (req, res) => {
    try {
        const permissions = await Permission.find();
        res.status(200).json(permissions);
    } catch (error) {
        console.error("getAllPermissions error:", error);
        res.status(500).json({ message: "Server error" });
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
            return res.status(404).json({ message: "Permission not found" });
        }
        res.status(200).json(permission);
    } catch (error) {
        console.error("getPermissionById error:", error);
        res.status(500).json({ message: "Server error" });
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
            return res.status(404).json({ message: "Permission not found" });
        }

        res.status(200).json({ message: "Permission updated", permission });
    } catch (error) {
        console.error("updatePermission error:", error);
        res.status(500).json({ message: "Server error" });
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
            return res.status(404).json({ message: "Permission not found" });
        }
        res.status(200).json({ message: "Permission deleted" });
    } catch (error) {
        console.error("deletePermission error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
