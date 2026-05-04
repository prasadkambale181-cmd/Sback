import express from 'express'
import User from '../models/userModel.js'
import { protect, admin } from '../middleware/authMiddleware.js'

const router = express.Router()

// GET all users (admin only)
router.get('/', protect, admin, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 })
        res.json(users)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

// GET user by ID
router.get('/:id', protect, admin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password')
        if (!user) return res.status(404).json({ message: 'User not found' })
        res.json(user)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

// PUT update user role
router.put('/:id/role', protect, admin, async (req, res) => {
    try {
        const { role } = req.body
        if (!['citizen', 'admin'].includes(role)) return res.status(400).json({ message: 'Invalid role' })
        const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password')
        if (!user) return res.status(404).json({ message: 'User not found' })
        res.json(user)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

// DELETE user
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
        if (!user) return res.status(404).json({ message: 'User not found' })
        if (user._id.toString() === req.user._id.toString()) return res.status(400).json({ message: 'Cannot delete yourself' })
        await user.deleteOne()
        res.json({ message: 'User removed' })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

export default router
