import express from 'express'
import Groq from 'groq-sdk'

const router = express.Router()

const SYSTEM_PROMPT = `You are Nayak, an intelligent AI assistant for SudharNayak — a Smart Civic Issue Reporting Platform for Indian cities.

Your role:
- Help citizens report civic issues (potholes, garbage, water leaks, electricity problems, sewage, noise, parks)
- Answer questions about how the platform works
- Guide users on how to submit complaints, track status, upvote issues
- Provide helpful civic information
- Be friendly, concise, and empathetic

Platform features you know about:
- Report issues with photo, location, and description
- AI auto-classifies category and priority (Low/Medium/High/Critical)
- SLA-based escalation (e.g., electricity: 6h, water: 12h, garbage: 24h)
- Upvote system — more upvotes = higher priority
- Duplicate detection — suggests existing issues to upvote
- Admin dashboard with analytics and charts
- Real-time status updates via notifications
- Before/After photo comparison for resolved issues

Always respond in a helpful, warm tone. Keep responses short and clear (2-4 sentences max unless explaining something complex). Use emojis occasionally to be friendly. If asked about something unrelated to civic issues or the platform, politely redirect.`

router.post('/chat', async (req, res) => {
    try {
        const { messages } = req.body
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ message: 'Messages array required' })
        }

        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

        const completion = await groq.chat.completions.create({
            model: 'llama3-8b-8192',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                ...messages.slice(-10) // keep last 10 messages for context
            ],
            max_tokens: 300,
            temperature: 0.7,
        })

        const reply = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process that. Please try again."
        res.json({ reply })
    } catch (error) {
        console.error('Nayak AI error:', error)
        // Fallback response if Groq fails
        res.json({ reply: "I'm Nayak, your civic assistant! 🏙️ I'm having a moment — please try again shortly. You can also directly report your issue using the Report Issue button." })
    }
})

export default router
