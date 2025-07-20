import { TeamMemberPermission } from "../models/TeamMemberPermissionModel.js";
import responseSender from "../utilities/responseSender.js";

/**
 * Assign permission to a team member
 */
export const assignPermission = async (req, res) => {
  try {
    const { teamMemberId, permissionId } = req.body;

    if (!teamMemberId || !permissionId) {
      return responseSender(res, 400, false, null, "teamMemberId and permissionId are required");
    }

    const existing = await TeamMemberPermission.findOne({ teamMemberId, permissionId });
    if (existing) {
      return responseSender(res, 409, false, null, "Permission already assigned");
    }

    const assigned = await TeamMemberPermission.create({ teamMemberId, permissionId });
    return responseSender(res, 201, true, assigned, "Permission assigned");
  } catch (error) {
    console.error("assignPermission error:", error);
    return responseSender(res, 500, false, null, "Server error");
  }
};

/**
 * Get all permissions assigned to team members of this organization
 */
export const getAllAssignments = async (req, res) => {
  try {
    const { teamMemberId } = req.query;

    if (!teamMemberId) {
      return responseSender(res, 400, false, null, "teamMemberId query parameter is required");
    }

    const permissions = await TeamMemberPermission.find({ teamMemberId })
      .populate("teamMemberId", "name email")
      .populate("permissionId", "name description");

    return responseSender(res, 200, true, permissions, "Assignments fetched");
  } catch (error) {
    console.error("getAllAssignments error:", error);
    return responseSender(res, 500, false, null, "Server error");
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
      return responseSender(res, 404, false, null, "Assignment not found");
    }

    return responseSender(res, 200, true, assignment, "Assignment fetched");
  } catch (error) {
    console.error("getAssignmentById error:", error);
    return responseSender(res, 500, false, null, "Server error");
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
      return responseSender(res, 400, false, null, "permissionId is required");
    }

    const updated = await TeamMemberPermission.findByIdAndUpdate(
      id,
      { permissionId },
      { new: true }
    )
      .populate("teamMemberId", "name email")
      .populate("permissionId", "name description");

    if (!updated) {
      return responseSender(res, 404, false, null, "Assignment not found");
    }

    return responseSender(res, 200, true, updated, "Assignment updated");
  } catch (error) {
    console.error("updateAssignment error:", error);
    return responseSender(res, 500, false, null, "Server error");
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
      return responseSender(res, 404, false, null, "Assignment not found");
    }

    return responseSender(res, 200, true, null, "Assignment deleted");
  } catch (error) {
    console.error("deleteAssignment error:", error);
    return responseSender(res, 500, false, null, "Server error");
  }
};
