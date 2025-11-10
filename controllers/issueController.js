import Issue from "../models/issueModel.js";

export const createIssue = async (req, res) => {
    try {
        const { title, description, imageUrl, category, location } = req.body;

        const issue = await Issue.create({
            title,
            description,
            imageUrl,
            category,
            location,
            createdBy: req.user._id,
        });

        res.status(201).json(issue);
    } catch (error) {
        res.status(500).json({ message: error.message });
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
