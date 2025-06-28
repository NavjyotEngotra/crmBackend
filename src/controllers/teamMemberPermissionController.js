import { TeamMemberPermission } from "../models/TeamMemberPermissionModel.js";

/**
 * Assign permission to a team member
 */
export const assignPermission = async (req, res) => {
  try {
    const { teamMemberId, permissionId } = req.body;

    if (!teamMemberId || !permissionId) {
      return res
        .status(400)
        .json({ message: "teamMemberId and permissionId are required" });
    }

    const existing = await TeamMemberPermission.findOne({ teamMemberId, permissionId });
    if (existing) {
      return res.status(409).json({ message: "Permission already assigned" });
    }

    const assigned = await TeamMemberPermission.create({ teamMemberId, permissionId });
    res.status(201).json({ message: "Permission assigned", assigned });
  } catch (error) {
    console.error("assignPermission error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get all permissions assigned to team members of this organization
 */
export const getAllAssignments = async (req, res) => {
  try {
    const { teamMemberId } = req.query;

    if (!teamMemberId) {
      return res
        .status(400)
        .json({ message: "teamMemberId query parameter is required" });
    }

    const permissions = await TeamMemberPermission.find({ teamMemberId })
      .populate("teamMemberId", "name email")
      .populate("permissionId", "name description");

    res.status(200).json(permissions);
  } catch (error) {
    console.error("getAllAssignments error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


/**
 * Get one assignment by ID
 */
export const getAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const assignment = await TeamMemberPermission.findById(id)
      .populate("teamMemberId", "name email")
      .populate("permissionId", "name description");
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }
    res.status(200).json(assignment);
  } catch (error) {
    console.error("getAssignmentById error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Update an assignment (change permission of a team member)
 */
export const updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissionId } = req.body;

    if (!permissionId) {
      return res.status(400).json({ message: "permissionId is required" });
    }

    const updated = await TeamMemberPermission.findByIdAndUpdate(
      id,
      { permissionId },
      { new: true }
    ).populate("teamMemberId", "name email")
     .populate("permissionId", "name description");

    if (!updated) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    res.status(200).json({ message: "Assignment updated", updated });
  } catch (error) {
    console.error("updateAssignment error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Delete an assignment
 */
export const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await TeamMemberPermission.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Assignment not found" });
    }
    res.status(200).json({ message: "Assignment deleted" });
  } catch (error) {
    console.error("deleteAssignment error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
