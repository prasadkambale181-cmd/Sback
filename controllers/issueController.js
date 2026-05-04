import Issue from "../models/issueModel.js";
import { classifyIssue, detectPriority, getSLADeadline, checkSLAStatus, findDuplicates, generateAIDescription } from '../services/aiService.js';

const isBase64 = (str) => str && typeof str === 'string' && str.startsWith('data:') && str.includes('base64,');

const isValidUrl = (str) => {
    try { new URL(str); return true; } catch { return false; }
};

const processImageUrl = (imageUrl) => {
    if (!imageUrl) return '';
    // Reject base64 — frontend must upload to Cloudinary directly
    if (isBase64(imageUrl)) {
        throw new Error('Please upload the image before submitting. Base64 images are not accepted.');
    }
    // Accept any valid URL (Cloudinary, direct links, etc.)
    if (isValidUrl(imageUrl)) return imageUrl;
    return '';
};

export const createIssue = async (req, res) => {
    try {
        const { title, description, imageUrl, category, location } = req.body;
        if (!title || !description) return res.status(400).json({ message: "Title and description are required" });

        let processedImageUrl = '';
        if (imageUrl) {
            try {
                processedImageUrl = processImageUrl(imageUrl);
            } catch (error) {
                return res.status(400).json({ message: error.message });
            }
        }

        // AI Classification
        const aiResult = classifyIssue(title, description);
        const finalCategory = category && category !== 'Other' ? category : aiResult.category;
        const priority = detectPriority(title, description, finalCategory);
        const slaData = getSLADeadline(finalCategory);

        // Duplicate detection
        const lat = location?.lat;
        const lng = location?.lng;
        const duplicates = await findDuplicates(Issue, title, description, lat, lng);

        const issue = await Issue.create({
            title,
            description,
            imageUrl: processedImageUrl,
            category: finalCategory,
            location: location || { address: '', lat: null, lng: null },
            priority,
            aiClassification: { category: aiResult.category, confidence: aiResult.confidence, suggestedPriority: priority, keywords: aiResult.keywords },
            sla: { deadline: slaData.deadline, hoursAllowed: slaData.hoursAllowed },
            createdBy: req.user._id,
        });

        // Emit socket event
        if (req.app.get('io')) {
            req.app.get('io').emit('newIssue', issue);
        }

        res.status(201).json({ issue, duplicates: duplicates.length > 0 ? duplicates : [] });
    } catch (error) {
        console.error('Create issue error:', error);
        res.status(500).json({ message: error.message || 'Failed to create issue' });
    }
};

export const getAllIssues = async (req, res) => {
    try {
        const { category, status, priority, sort } = req.query;
        const filter = {};
        if (category) filter.category = category;
        if (status) filter.status = status;
        if (priority) filter.priority = priority;

        let sortOption = { createdAt: -1 };
        if (sort === 'upvotes') sortOption = { upvoteCount: -1 };
        if (sort === 'priority') sortOption = { priority: -1, createdAt: -1 };

        const issues = await Issue.find(filter)
            .populate("createdBy", "name email")
            .sort(sortOption);

        // Attach SLA status
        const issuesWithSLA = issues.map(issue => {
            const slaStatus = checkSLAStatus(issue);
            return { ...issue.toObject(), slaStatus };
        });

        res.json(issuesWithSLA);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getIssueById = async (req, res) => {
    try {
        const issue = await Issue.findById(req.params.id).populate("createdBy", "name email");
        if (!issue) return res.status(404).json({ message: "Issue not found" });
        const slaStatus = checkSLAStatus(issue);
        res.json({ ...issue.toObject(), slaStatus });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateIssue = async (req, res) => {
    try {
        const { status, adminNote, afterImageUrl } = req.body;
        const issue = await Issue.findById(req.params.id);
        if (!issue) return res.status(404).json({ message: "Issue not found" });

        if (status) issue.status = status;
        if (adminNote) issue.adminNote = adminNote;
        if (status === 'Resolved') issue.resolvedAt = new Date();

        if (afterImageUrl) {
            issue.afterImageUrl = processImageUrl(afterImageUrl);
        }

        // Update SLA escalation
        const slaStatus = checkSLAStatus(issue);
        if (slaStatus?.isOverdue && !issue.sla.isEscalated) {
            issue.sla.isEscalated = true;
            issue.sla.escalatedAt = new Date();
            issue.sla.delayHours = slaStatus.delayHours;
            issue.status = 'Escalated';
        }

        const updatedIssue = await issue.save();

        if (req.app.get('io')) {
            req.app.get('io').emit('issueUpdated', { issueId: issue._id, status: issue.status, adminNote });
        }

        res.json(updatedIssue);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteIssue = async (req, res) => {
    try {
        const issue = await Issue.findById(req.params.id);
        if (!issue) return res.status(404).json({ message: "Issue not found" });
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
        if (!issue) return res.status(404).json({ message: "Issue not found" });

        const userId = req.user._id;
        const likeIndex = issue.likes.indexOf(userId);
        if (likeIndex > -1) {
            issue.likes.splice(likeIndex, 1);
        } else {
            issue.likes.push(userId);
        }
        issue.likesCount = issue.likes.length;
        await issue.save();
        res.json({ liked: likeIndex === -1, likesCount: issue.likesCount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const upvoteIssue = async (req, res) => {
    try {
        const issue = await Issue.findById(req.params.id);
        if (!issue) return res.status(404).json({ message: "Issue not found" });

        const userId = req.user._id.toString();
        const upvoteIndex = issue.upvotes.findIndex(id => id.toString() === userId);

        if (upvoteIndex > -1) {
            issue.upvotes.splice(upvoteIndex, 1);
        } else {
            issue.upvotes.push(req.user._id);
        }
        issue.upvoteCount = issue.upvotes.length;

        // Recalculate priority based on upvotes
        issue.priority = detectPriority(issue.title, issue.description, issue.category, issue.upvoteCount);

        await issue.save();

        if (req.app.get('io')) {
            req.app.get('io').emit('issueUpvoted', { issueId: issue._id, upvoteCount: issue.upvoteCount, priority: issue.priority });
        }

        res.json({ upvoted: upvoteIndex === -1, upvoteCount: issue.upvoteCount, priority: issue.priority });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const aiAssist = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ message: "Text is required" });
        const result = generateAIDescription(text);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const checkDuplicates = async (req, res) => {
    try {
        const { title, description, lat, lng } = req.body;
        const duplicates = await findDuplicates(Issue, title, description, lat, lng);
        res.json(duplicates);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getAnalytics = async (req, res) => {
    try {
        const total = await Issue.countDocuments();
        const byStatus = await Issue.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
        const byCategory = await Issue.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]);
        const byPriority = await Issue.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]);
        const resolved = await Issue.countDocuments({ status: 'Resolved' });
        const escalated = await Issue.countDocuments({ status: 'Escalated' });
        const pending = await Issue.countDocuments({ status: 'Pending' });

        // Total users
        const User = (await import('../models/userModel.js')).default;
        const totalUsers = await User.countDocuments();
        const totalAdmins = await User.countDocuments({ role: 'admin' });
        const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5).select('name email role createdAt');

        // Monthly trend (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const monthlyTrend = await Issue.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, count: { $sum: 1 } } },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Top locations
        const topLocations = await Issue.aggregate([
            { $match: { 'location.address': { $ne: '' } } },
            { $group: { _id: '$location.address', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        // Top reporters
        const topReporters = await Issue.aggregate([
            { $match: { createdBy: { $ne: null } } },
            { $group: { _id: '$createdBy', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            { $project: { name: '$user.name', email: '$user.email', count: 1 } }
        ]);

        const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
        const avgResolutionTime = await Issue.aggregate([
            { $match: { status: 'Resolved', resolvedAt: { $ne: null } } },
            { $project: { diff: { $subtract: ['$resolvedAt', '$createdAt'] } } },
            { $group: { _id: null, avg: { $avg: '$diff' } } }
        ]);
        const avgHours = avgResolutionTime[0] ? Math.round(avgResolutionTime[0].avg / (1000 * 60 * 60)) : 0;

        res.json({ total, resolved, escalated, pending, resolutionRate, totalUsers, totalAdmins, recentUsers, byStatus, byCategory, byPriority, monthlyTrend, topLocations, topReporters, avgResolutionHours: avgHours });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getHeatmapData = async (req, res) => {
    try {
        const issues = await Issue.find({
            'location.lat': { $ne: null },
            'location.lng': { $ne: null }
        }).select('location category priority status');
        res.json(issues);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const escalateOverdueIssues = async () => {
    try {
        const now = new Date();
        const overdueIssues = await Issue.find({
            status: { $in: ['Pending', 'In Progress'] },
            'sla.deadline': { $lt: now },
            'sla.isEscalated': false,
        });

        for (const issue of overdueIssues) {
            const delayMs = now - new Date(issue.sla.deadline);
            issue.sla.isEscalated = true;
            issue.sla.escalatedAt = now;
            issue.sla.delayHours = Math.round(delayMs / (1000 * 60 * 60));
            issue.status = 'Escalated';
            await issue.save();
        }

        return overdueIssues.length;
    } catch (error) {
        console.error('Escalation error:', error);
    }
};
