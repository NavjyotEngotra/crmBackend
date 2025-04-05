import mongoose from "mongoose";

const verifiedSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    verifiedAt: { type: Date, default: Date.now },
});

export default mongoose.model("VerifiedOrganization", verifiedSchema);