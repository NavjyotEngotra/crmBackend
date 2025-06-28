import mongoose from "mongoose";

const teamMemberPermissionSchema = new mongoose.Schema(
  {
    teamMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeamMember",
      required: true,
    },
    permissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Permission",
      required: true,
    },
  },
  { timestamps: true }
);

// Ensure unique combination (one permission per team member)
teamMemberPermissionSchema.index({ teamMemberId: 1, permissionId: 1 }, { unique: true });

export const TeamMemberPermission = mongoose.model(
  "TeamMemberPermission",
  teamMemberPermissionSchema
);
