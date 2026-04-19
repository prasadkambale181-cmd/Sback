import express from 'express'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

// multer v2 — storage is accessed differently
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
        if (allowed.includes(file.mimetype)) cb(null, true)
        else cb(new Error('Invalid file type. Only images allowed.'))
    }
})

// Upload image to Cloudinary
router.post('/media', protect, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file provided' })
        }

        // Convert buffer to base64 data URI
        const b64 = Buffer.from(req.file.buffer).toString('base64')
        const dataURI = `data:${req.file.mimetype};base64,${b64}`

        // Upload to Cloudinary using base64 (works with both v1 and v2)
        const result = await cloudinary.uploader.upload(dataURI, {
            folder: 'sudharnayak',
            resource_type: 'image',
            quality: 'auto:good',
            format: 'auto',
            width: 1200,
            crop: 'limit',
        })

        const url = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME.trim()}/image/upload/w_800,h_600,c_limit,q_auto:good,f_auto/${result.public_id}`

        res.json({ url, type: 'image', publicId: result.public_id })
    } catch (error) {
        console.error('Upload error:', error)
        res.status(500).json({
            message: error.message || 'Upload failed',
            detail: error.http_code ? `Cloudinary ${error.http_code}` : 'Server error'
        })
    }
})

// Keep old test endpoint
router.post('/test-cloudinary', protect, async (req, res) => {
    try {
        const { base64Image } = req.body
        if (!base64Image) return res.status(400).json({ message: 'Base64 image is required' })

        const result = await cloudinary.uploader.upload(base64Image, {
            folder: 'sudharnayak',
            resource_type: 'image',
            quality: 'auto:good',
            format: 'auto',
            width: 800,
            height: 600,
            crop: 'limit'
        })

        res.json({ message: 'Image uploaded successfully', url: result.secure_url })
    } catch (error) {
        console.error('Cloudinary test error:', error)
        res.status(500).json({ message: 'Failed to upload image' })
    }
})

export default router
