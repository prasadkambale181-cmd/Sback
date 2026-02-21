import Issue from "../models/issueModel.js";
import { uploadBase64ToCloudinary } from '../config/cloudinary.js';

// Helper function to check if string is base64
const isBase64 = (str) => {
    if (!str || typeof str !== 'string') return false;
    return str.startsWith('data:image/') && str.includes('base64,');
};

// Helper function to process image URLs
const processImageUrl = async (imageUrl) => {
    if (!imageUrl) return '';

    console.log('Processing image URL, type:', typeof imageUrl, 'length:', imageUrl.length);

    // If it's already a Cloudinary URL, return as is
    if (imageUrl.includes('cloudinary.com')) {
        console.log('Image is already a Cloudinary URL');
        return imageUrl;
    }

    // If it's a base64 string, upload to Cloudinary
    if (isBase64(imageUrl)) {
        console.log('Image is base64, uploading to Cloudinary...');
        try {
            const cloudinaryUrl = await uploadBase64ToCloudinary(imageUrl);
            console.log('Successfully uploaded to Cloudinary:', cloudinaryUrl);
            return cloudinaryUrl;
        } catch (error) {
            console.error('Failed to upload base64 to Cloudinary:', error);
            throw new Error('Failed to process image. Please try again.');
        }
    }

    // If it's a regular URL, return as is
    console.log('Image is a regular URL');
    return imageUrl;
};

export const createIssue = async (req, res) => {
    try {
        const { title, description, imageUrl, category, location } = req.body;

        // Validate required fields
        if (!title || !description) {
            return res.status(400).json({ message: "Title and description are required" });
        }

        // Process image URL (convert base64 to Cloudinary URL if needed)
        let processedImageUrl = '';
        if (imageUrl) {
            try {
                processedImageUrl = await processImageUrl(imageUrl);
            } catch (error) {
                return res.status(400).json({ message: error.message });
            }
        }

        const issue = await Issue.create({
            title,
            description,
            imageUrl: processedImageUrl,
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
