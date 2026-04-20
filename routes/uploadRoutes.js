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
        const allowed = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
            'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'
        ]
        if (allowed.includes(file.mimetype)) cb(null, true)
        else cb(new Error(`Invalid file type: ${file.mimetype}`))
    }
})

// Debug endpoint — check if env vars are loaded
router.get('/debug', (req, res) => {
    res.json({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING',
        api_key: process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING',
        api_secret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING',
    })
})

router.post('/media', protect, (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            console.error('Multer error:', err.message)
            return res.status(400).json({ message: err.message })
        }
        next()
    })
}, async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file provided' })

        const cloudName = process.env.CLOUDINARY_CLOUD_NAME
        const apiKey = process.env.CLOUDINARY_API_KEY
        const apiSecret = process.env.CLOUDINARY_API_SECRET

        if (!cloudName || !apiKey || !apiSecret) {
            console.error('Missing Cloudinary env vars:', { cloudName: !!cloudName, apiKey: !!apiKey, apiSecret: !!apiSecret })
            return res.status(500).json({ message: 'Cloudinary not configured on server' })
        }

        cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret })

        const isVideo = req.file.mimetype.startsWith('video/')
        const resourceType = isVideo ? 'video' : 'image'

        console.log(`Uploading ${resourceType}, size: ${req.file.size}, mimetype: ${req.file.mimetype}`)

        const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: 'sudharnayak',
                    resource_type: resourceType,
                    quality: isVideo ? 'auto' : 'auto:good',
                    ...(isVideo ? {} : { width: 1200, crop: 'limit' })
                },
                (error, result) => {
                    if (error) {
                        console.error('Cloudinary stream error:', JSON.stringify(error))
                        reject(error)
                    } else {
                        resolve(result)
                    }
                }
            )
            stream.end(req.file.buffer)
        })

        const url = isVideo
            ? result.secure_url
            : `https://res.cloudinary.com/${cloudName}/image/upload/w_800,h_600,c_limit,q_auto:good,f_auto/${result.public_id}`

        console.log('Upload success:', url)
        res.json({ url, type: resourceType, publicId: result.public_id })
    } catch (error) {
        console.error('Upload route error:', error.message, error.http_code)
        res.status(500).json({ message: error.message || 'Upload failed', detail: 'Server error' })
    }
})

export default router
