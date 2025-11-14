import express from 'express';
import { uploadBase64ToCloudinary } from '../config/cloudinary.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Test endpoint for Cloudinary upload
router.post('/test-cloudinary', protect, async (req, res) => {
    try {
        const { base64Image } = req.body;

        if (!base64Image) {
            return res.status(400).json({ message: 'Base64 image is required' });
        }

        const cloudinaryUrl = await uploadBase64ToCloudinary(base64Image);

        res.json({
            message: 'Image uploaded successfully',
            url: cloudinaryUrl
        });
    } catch (error) {
        console.error('Cloudinary test error:', error);
        res.status(500).json({ message: 'Failed to upload image' });
    }
});

export default router;