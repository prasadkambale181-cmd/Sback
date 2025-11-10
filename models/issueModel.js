import mongoose from "mongoose";

const issueSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    imageUrl: { type: String },
    category: {
        type: String,
        enum: ["Road", "Garbage", "Water", "Electricity", "Other"],
        default: "Other"
    },
    location: {
        address: { type: String },
        lat: { type: Number },
        lng: { type: Number },
    },
    status: {
        type: String,
        enum: ["Pending", "In Progress", "Resolved"],
        default: "Pending"
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Issue", issueSchema);
