import mongoose from "mongoose";

const permissionSchema = new mongoose.Schema(
  {
    // e.g. contacts.create, deals.delete
    name: {
      type: String,
      required: true,
      unique: true,
      match: /^[a-zA-Z0-9]+\.(create|update|read|delete)$/, // basic format validation
    },
    description: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export const Permission = mongoose.model("Permission", permissionSchema);
