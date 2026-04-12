import mongoose from "mongoose";

const issueSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    imageUrl: { type: String },
    images: [{ type: String }],
    afterImageUrl: { type: String }, // Before/After validation
    category: {
        type: String,
        enum: ["Road", "Garbage", "Water", "Electricity", "Sewage", "Parks", "Noise", "Other"],
        default: "Other"
    },
    location: {
        address: { type: String },
        lat: { type: Number },
        lng: { type: Number },
    },
    status: {
        type: String,
        enum: ["Pending", "In Progress", "Resolved", "Escalated", "Rejected"],
        default: "Pending"
    },
    priority: {
        type: String,
        enum: ["Low", "Medium", "High", "Critical"],
        default: "Medium"
    },
    aiClassification: {
        category: { type: String },
        confidence: { type: Number },
        suggestedPriority: { type: String },
        keywords: [{ type: String }]
    },
    sla: {
        deadline: { type: Date },
        hoursAllowed: { type: Number },
        isEscalated: { type: Boolean, default: false },
        escalatedAt: { type: Date },
        delayHours: { type: Number, default: 0 }
    },
    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    upvoteCount: { type: Number, default: 0 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    likesCount: { type: Number, default: 0 },
    isDuplicate: { type: Boolean, default: false },
    duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: "Issue" },
    adminNote: { type: String },
    resolvedAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now },
});

// Index for geospatial duplicate detection
issueSchema.index({ "location.lat": 1, "location.lng": 1 });
issueSchema.index({ category: 1, status: 1 });

export default mongoose.model("Issue", issueSchema);
