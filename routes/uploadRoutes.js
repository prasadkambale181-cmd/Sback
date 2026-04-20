import express from 'express'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

const storage = multer.memoryStorage()
const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
            'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
        if (allowed.includes(file.mimetype)) cb(null, true)
        else cb(new Error('Invalid file type'))
    }
})

router.post('/media', protect, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file provided' })

        // Configure cloudinary using process.env directly
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        })

        const isVideo = req.file.mimetype.startsWith('video/')
        const resourceType = isVideo ? 'video' : 'image'

        const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: 'sudharnayak',
                    resource_type: resourceType,
                    quality: isVideo ? 'auto' : 'auto:good',
                    format: isVideo ? undefined : 'auto',
                    ...(isVideo ? {} : { width: 1200, crop: 'limit' })
                },
                (error, result) => {
                    if (error) reject(error)
                    else resolve(result)
                }
            )
            stream.end(req.file.buffer)
        })

        const url = isVideo
            ? result.secure_url
            : `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/w_800,h_600,c_limit,q_auto:good,f_auto/${result.public_id}`

        res.json({ url, type: resourceType, publicId: result.public_id })
    } catch (error) {
        console.error('Upload error:', error.message)
        res.status(500).json({ message: error.message || 'Upload failed' })
    }
})

export default router
