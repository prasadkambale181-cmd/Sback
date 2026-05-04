import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
    cloud_name: (process.env.CLOUDINARY_CLOUD_NAME || 'dqmktpekh').trim(),
    api_key: (process.env.CLOUDINARY_API_KEY || '945117624673387').trim(),
    api_secret: (process.env.CLOUDINARY_API_SECRET || 'KLllKPPf1gqr4ejLNdWe4xM5KU0').trim(),
});

console.log('Cloudinary cloud_name:', (process.env.CLOUDINARY_CLOUD_NAME || 'dqmktpekh').trim());

/**
 * Upload base64 image to Cloudinary
 * @param {string} base64String - Base64 encoded image
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise<string>} - Cloudinary secure URL
 */
export const uploadBase64ToCloudinary = async (base64String, folder = 'sudharnayak') => {
    try {
        const result = await cloudinary.uploader.upload(base64String, {
            folder: folder,
            resource_type: 'image',
            quality: 'auto:good',
            format: 'auto',
            width: 800,
            height: 600,
            crop: 'limit'
        });

        // Return optimized URL instead of the original secure_url
        const optimizedUrl = generateOptimizedUrl(result.public_id);
        return optimizedUrl;
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw new Error('Failed to upload image to Cloudinary');
    }
};

/**
 * Generate optimized Cloudinary URL
 * @param {string} publicId - Cloudinary public ID
 * @returns {string} - Optimized URL
 */
const generateOptimizedUrl = (publicId) => {
    return cloudinary.url(publicId, {
        width: 800,
        height: 600,
        crop: 'limit',
        quality: 'auto:good',
        format: 'auto',
        secure: true
    });
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<object>} - Deletion result
 */
export const deleteFromCloudinary = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        throw new Error('Failed to delete image from Cloudinary');
    }
};

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string} - Public ID
 */
export const extractPublicId = (url) => {
    if (!url || !url.includes('cloudinary.com')) return null;

    const parts = url.split('/');
    const uploadIndex = parts.findIndex(part => part === 'upload');
    if (uploadIndex === -1) return null;

    const publicIdWithExtension = parts.slice(uploadIndex + 2).join('/');
    return publicIdWithExtension.split('.')[0];
};

export default cloudinary;