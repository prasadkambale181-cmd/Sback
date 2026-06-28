import express from 'express'
import Groq from 'groq-sdk'

const router = express.Router()

const GROQ_KEY = process.env.GROQ_API_KEY

if (!GROQ_KEY) {
    console.error('❌ GROQ_API_KEY not found in environment variables')
}

const SYSTEM_PROMPT = `You are Nayak, a helpful assistant for SudharNayak — a civic issue reporting platform for Indian cities.

About SudharNayak:
- Citizens can report civic problems like potholes, garbage, water leaks, broken streetlights, sewage issues, noise complaints, and park damage
- Each report gets AI-classified by category and priority (Low / Medium / High / Critical)
- SLA timelines: Electricity = 6 hours, Water = 12 hours, Garbage = 24 hours, Road = 48 hours
- Citizens can upvote issues — more upvotes raises the priority
- Users can EDIT their own issues (title, description, category, location, image) as long as they're not resolved or escalated
- Duplicate detection prevents repeat reports of the same issue
- Admins manage and resolve issues via a dashboard
- Real-time notifications when issue status changes
- Before/After photo comparison for resolved issues

Development Team:
- Prashant Ghodke (Chief Design Officer) - Crafted the SudharNayak design language
- Smitesh Kumbhar (Database Administrator) - Designs and maintains the data architecture
- Om Ghule (DevOps Lead) - Manages cloud infrastructure and deployment reliability
- Utkarsh Kadu (Software Developer) - Architect of the platform, leads full-stack development and AI integration

Team Family Information (only answer if specifically asked about family relationships):
- Smitesh Kumbhar is the father of Om Ghule
- Utkarsh Kadu is the father of Prashant Ghodke
- IMPORTANT: Before sharing family relationship information, always ask for verification code first
- If user asks about family relationships, respond: "To access family relationship information, please provide the verification code."
- Only share family details if user provides the correct code: 1234
- If incorrect code is provided, say: "Sorry, that's not the correct verification code. I cannot share family relationship information."

How to use the platform:
1. Register or login at sudharnayak.vercel.app
2. Click "Report Issue" and fill in title, description, category, photo, and location
3. Submit — AI will classify and route it automatically
4. Track your issue status in "My Reports"
5. Edit your issues if needed (click edit button on your issues)
6. Upvote other issues you agree with to raise their priority

Rules:
- Keep answers short (2-4 sentences)
- Be friendly and helpful
- If asked something unrelated to civic issues or this platform, politely say you can only help with civic matters
- If asked about the team or developers, mention the four team members by name and their roles
- If asked about family relationships, ALWAYS ask for verification code first before sharing any family information
- Only share family relationship details after user provides the correct verification code (1234)
- If verification code is incorrect, politely refuse to share family information
- Only mention family relationships when directly asked about them, not in general team discussions
- Do not make up information not listed above`

// Chat endpoint
router.post('/chat', async (req, res) => {
    try {
        const { messages } = req.body
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ reply: 'Invalid request.' })
        }

        const groq = new Groq({ apiKey: GROQ_KEY })

        const completion = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                ...messages.slice(-8).map(m => ({
                    role: m.role === 'assistant' ? 'assistant' : 'user',
                    content: String(m.content || m.text || '')
                }))
            ],
            max_tokens: 250,
            temperature: 0.6,
        })

        const reply = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process that. Please try again."
        res.json({ reply })
    } catch (error) {
        console.error('Nayak chat error:', error.message)
        console.error('Error details:', error)
        res.status(500).json({ reply: "I'm having trouble right now. Please try again in a moment! 🔄" })
    }
})

// AI Image Scan — generate professional civic report from image + title + location
router.post('/scan-image', async (req, res) => {
    try {
        const { imageBase64, title, language, location } = req.body
        if (!imageBase64) return res.status(400).json({ message: 'Image required' })

        const groq = new Groq({ apiKey: GROQ_KEY })
        const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
        const todayMr = new Date().toLocaleDateString('mr-IN', { day: 'numeric', month: 'long', year: 'numeric' })
        const loc = location || 'India'

        const prompt = `You are an AI civic issue analyst. Analyze the image${title ? ` with the issue title: "${title}"` : ''} and generate a professional civic report.

Location: ${loc}
Date: ${today}

FIRST, check if the image actually matches the issue title. If the image clearly does NOT match the title (e.g., title says "pothole" but image shows a person, food, animal, or unrelated scene), return ONLY this:

MISMATCH: true
MISMATCH_REASON: (one sentence explaining what the image actually shows vs what the title says)

If the image DOES match or is relevant to the title, return EXACTLY this structure with no markdown, no asterisks, no bullet points:

MISMATCH: false

SUGGESTED_TITLE: (one line, news-style English title)

SEVERITY: (one of: Low / Medium / High / Critical)

CONFIDENCE: (number between 70 and 95)

ENGLISH_DESCRIPTION:
(Write 4-5 sentences in formal English describing: what the issue is, where it is, what impact it has on citizens, and what action is needed. Be specific and professional.)

MARATHI_DESCRIPTION:
(Write the same description in natural formal Marathi. Do not translate word by word — write as a native Marathi speaker would write an official complaint. 4-5 sentences.)

Do not add anything outside this structure.`

        const completion = await groq.chat.completions.create({
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            messages: [{
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    { type: 'image_url', image_url: { url: imageBase64 } }
                ]
            }],
            max_tokens: 1000,
            temperature: 0.3,
        })

        const raw = completion.choices[0]?.message?.content || ''

        const extract = (key) => {
            const match = raw.match(new RegExp(`${key}:\\s*([^\\n]+)`, 'i'))
            return match ? match[1].trim() : ''
        }

        const extractBlock = (key) => {
            const match = raw.match(new RegExp(`${key}:\\s*([\\s\\S]*?)(?=\\n[A-Z_]+:|$)`, 'i'))
            return match ? match[1].trim() : ''
        }

        // Check for mismatch first
        const mismatch = extract('MISMATCH').toLowerCase() === 'true'
        if (mismatch) {
            const reason = extract('MISMATCH_REASON')
            return res.json({ mismatch: true, mismatchReason: reason })
        }

        const titleEn = extract('SUGGESTED_TITLE')
        const severityEn = extract('SEVERITY')
        const confidence = extract('CONFIDENCE').replace('%', '').trim()
        const descriptionEn = extractBlock('ENGLISH_DESCRIPTION')
        const descriptionMr = extractBlock('MARATHI_DESCRIPTION')

        res.json({
            mismatch: false,
            descriptionEn,
            descriptionMr,
            description: descriptionEn,
            suggestedTitle: titleEn || '',
            severity: severityEn || '',
            confidence: confidence || '85',
            raw
        })
    } catch (error) {
        res.status(500).json({ message: 'Failed to analyze image', description: '' })
    }
})

export default router
