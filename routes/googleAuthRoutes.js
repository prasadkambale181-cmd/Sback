import express from 'express'
import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import jwt from 'jsonwebtoken'
import User from '../models/userModel.js'

const router = express.Router()

// Configure Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails[0].value
        const name = profile.displayName

        // Find or create user
        let user = await User.findOne({ email })
        if (!user) {
            user = await User.create({
                name,
                email,
                password: `google_${profile.id}_${Date.now()}`, // random password for Google users
                role: 'citizen',
            })
        }
        return done(null, user)
    } catch (err) {
        return done(err, null)
    }
}))

passport.serializeUser((user, done) => done(null, user._id))
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id).select('-password')
        done(null, user)
    } catch (err) {
        done(err, null)
    }
})

// Initiate Google OAuth
router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'], session: false })
)

// Google OAuth Callback
router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_failed` }),
    (req, res) => {
        const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '30d' })
        const userData = {
            _id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
            token,
        }
        // Redirect to frontend with token in query param
        const frontendURL = process.env.FRONTEND_URL || 'https://sudharnayak.vercel.app'
        res.redirect(`${frontendURL}/auth/google/success?data=${encodeURIComponent(JSON.stringify(userData))}`)
    }
)

export default router
