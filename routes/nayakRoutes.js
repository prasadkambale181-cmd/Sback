import express from 'express'
import Groq from 'groq-sdk'

const router = express.Router()

// Debug — check if Groq key is set
router.get('/debug', (req, res) => {
    res.json({ groq_key: process.env.GROQ_API_KEY ? `SET (starts with ${process.env.GROQ_API_KEY.slice(0, 8)}...)` : 'MISSING' })
})
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

        if (!process.env.GROQ_API_KEY) {
            console.error('GROQ_API_KEY is not set')
            return res.status(500).json({ reply: 'Groq API key not configured on server.' })
        }

        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

        const completion = await groq.chat.completions.create({
            model: 'llama3-8b-8192',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                ...messages.slice(-10)
            ],
            max_tokens: 300,
            temperature: 0.7,
        })

        const reply = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process that. Please try again."
        res.json({ reply })
    } catch (error) {
        console.error('Nayak AI error:', error?.message, error?.status, error?.error)
        res.json({ reply: "I'm Nayak, your civic assistant! 🏙️ I'm having a moment — please try again shortly. You can also directly report your issue using the Report Issue button." })
    }
})

// AI Image Scan — analyze image and generate description based on title
router.post('/scan-image', async (req, res) => {
    try {
        const { imageBase64, title } = req.body
        if (!imageBase64) return res.status(400).json({ message: 'Image required' })

        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

        const prompt = title
            ? `You are a civic issue analyst. The user has titled this issue: "${title}". Analyze this image and write a clear, factual 2-3 sentence description of the civic problem visible. Focus on: what the problem is, how severe it looks, and any immediate safety concerns. Be specific and professional.`
            : `You are a civic issue analyst. Analyze this image and: 1) Identify the civic problem (pothole, garbage, water leak, broken streetlight, etc.), 2) Write a 2-3 sentence description of what you see, 3) Suggest a suitable title. Be specific and professional.`

        const completion = await groq.chat.completions.create({
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            messages: [{
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    { type: 'image_url', image_url: { url: imageBase64 } }
                ]
            }],
            max_tokens: 200,
            temperature: 0.4,
        })

        const result = completion.choices[0]?.message?.content || ''

        // Parse out title suggestion if no title was provided
        let description = result
        let suggestedTitle = ''
        if (!title && result.includes('title')) {
            const lines = result.split('\n').filter(Boolean)
            const titleLine = lines.find(l => l.toLowerCase().includes('title'))
            if (titleLine) {
                suggestedTitle = titleLine.replace(/.*title[:\s]*/i, '').trim().replace(/["']/g, '')
                description = lines.filter(l => !l.toLowerCase().includes('title')).join(' ').trim()
            }
        }

        res.json({ description, suggestedTitle })
    } catch (error) {
        console.error('Image scan error:', error)
        res.status(500).json({ message: 'Failed to analyze image', description: '' })
    }
})

export default router
