import Issue from "../models/issueModel.js";

export const createIssue = async (req, res) => {
    try {
        const { title, description, imageUrl, category, location } = req.body;

        // Validate required fields
        if (!title || !description) {
            return res.status(400).json({ message: "Title and description are required" });
        }

        // Check if imageUrl is too large (base64 images can be huge)
        if (imageUrl && imageUrl.length > 5000000) { // ~5MB limit
            return res.status(400).json({
                message: "Image is too large. Please use a smaller image or upload to an image hosting service."
            });
        }

        const issue = await Issue.create({
            title,
            description,
            imageUrl: imageUrl || '',
            category: category || 'Other',
            location: location || { address: '', lat: '', lng: '' },
            createdBy: req.user._id,
        });

        res.status(201).json(issue);
    } catch (error) {
        console.error('Create issue error:', error);
        res.status(500).json({ message: error.message || 'Failed to create issue' });
    }
};

export const getAllIssues = async (req, res) => {
    try {
        const { category, status } = req.query;
        const filter = {};

        if (category) filter.category = category;
        if (status) filter.status = status;

        const issues = await Issue.find(filter)
            .populate("createdBy", "name email")
            .sort({ createdAt: -1 });

        res.json(issues);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getIssueById = async (req, res) => {
    try {
        const issue = await Issue.findById(req.params.id).populate("createdBy", "name email");

        if (!issue) {
            return res.status(404).json({ message: "Issue not found" });
        }

        res.json(issue);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateIssue = async (req, res) => {
    try {
        const { status } = req.body;

        const issue = await Issue.findById(req.params.id);

        if (!issue) {
            return res.status(404).json({ message: "Issue not found" });
        }

        issue.status = status || issue.status;
        const updatedIssue = await issue.save();

        res.json(updatedIssue);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteIssue = async (req, res) => {
    try {
        const issue = await Issue.findById(req.params.id);

        if (!issue) {
            return res.status(404).json({ message: "Issue not found" });
        }

        await issue.deleteOne();
        res.json({ message: "Issue removed" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyIssues = async (req, res) => {
    try {
        const issues = await Issue.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
        res.json(issues);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const likeIssue = async (req, res) => {
    try {
        const issue = await Issue.findById(req.params.id);

        if (!issue) {
            return res.status(404).json({ message: "Issue not found" });
        }

        const userId = req.user._id;
        const likeIndex = issue.likes.indexOf(userId);

        if (likeIndex > -1) {
            // Unlike
            issue.likes.splice(likeIndex, 1);
            issue.likesCount = issue.likes.length;
            await issue.save();
            res.json({ message: "Issue unliked", liked: false, likesCount: issue.likesCount });
        } else {
            // Like
            issue.likes.push(userId);
            issue.likesCount = issue.likes.length;
            await issue.save();
            res.json({ message: "Issue liked", liked: true, likesCount: issue.likesCount });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
