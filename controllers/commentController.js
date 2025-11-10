import Comment from "../models/commentModel.js";
import Issue from "../models/issueModel.js";

export const addComment = async (req, res) => {
    try {
        const { text } = req.body;
        const { issueId } = req.params;

        const issue = await Issue.findById(issueId);
        if (!issue) {
            return res.status(404).json({ message: "Issue not found" });
        }

        const comment = await Comment.create({
            issueId,
            userId: req.user._id,
            text,
        });

        const populatedComment = await Comment.findById(comment._id).populate("userId", "name email");

        res.status(201).json(populatedComment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getComments = async (req, res) => {
    try {
        const { issueId } = req.params;

        const comments = await Comment.find({ issueId })
            .populate("userId", "name email")
            .sort({ createdAt: -1 });

        res.json(comments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
