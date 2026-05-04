import express from 'express'
import Groq from 'groq-sdk'

const router = express.Router()

const GROQ_KEY = process.env.GROQ_API_KEY || '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'

const SYSTEM_PROMPT = `You are Nayak, a helpful assistant for SudharNayak — a civic issue reporting platform for Indian cities.

About SudharNayak:
- Citizens can report civic problems like potholes, garbage, water leaks, broken streetlights, sewage issues, noise complaints, and park damage
- Each report gets AI-classified by category and priority (Low / Medium / High / Critical)
- SLA timelines: Electricity = 6 hours, Water = 12 hours, Garbage = 24 hours, Road = 48 hours
- Citizens can upvote issues — more upvotes raises the priority
- Duplicate detection prevents repeat reports of the same issue
- Admins manage and resolve issues via a dashboard
- Real-time notifications when issue status changes
- Before/After photo comparison for resolved issues

How to use the platform:
1. Register or login at sudharnayak.vercel.app
2. Click "Report Issue" and fill in title, description, category, photo, and location
3. Submit — AI will classify and route it automatically
4. Track your issue status in "My Reports"
5. Upvote other issues you agree with to raise their priority

Rules:
- Keep answers short (2-4 sentences)
- Be friendly and helpful
- If asked something unrelated to civic issues or this platform, politely say you can only help with civic matters
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
            model: 'llama3-8b-8192',
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

        const prompt = `Generate a professional civic issue report based on the uploaded image${title ? ` and the issue title: "${title}"` : ''}${loc ? ` at location: ${loc}` : ''}.

The output must be clean, formal, and realistic like an official government report.
Do NOT use symbols such as #, *, bullets, or markdown.
Generate content in BOTH English and Marathi.
Today's date is ${today} / ${todayMr}.

Follow this EXACT structure with no deviations:

Title (English):
Title (Marathi):

Location (English): ${loc}
Location (Marathi):

Date (English): ${today}
Date (Marathi): ${todayMr}

Civic Issue Type (English):
Civic Issue Type (Marathi):

Problem Summary (English):
Problem Summary (Marathi):

Detailed Description (English):
Detailed Description (Marathi):

Impact Analysis (English):
Impact Analysis (Marathi):

Severity Level (English):
Severity Level (Marathi):

Suggested Action (English):
Suggested Action (Marathi):

AI Confidence Score:

Instructions:
- Title should be news-style and impactful
- Language must be formal and professional
- Marathi should be natural and clear, not a literal translation
- Severity must be one of: Low / Medium / High / Critical (with Marathi: कमी / मध्यम / उच्च / अत्यंत गंभीर)
- Confidence score between 70% and 95%
- Keep output structured and readable
- Do not add any extra text outside the structure above`

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

        // Extract key fields for form auto-fill
        const extract = (key) => {
            const match = raw.match(new RegExp(`${key}:\\s*([^\\n]+)`, 'i'))
            return match ? match[1].trim() : ''
        }

        const titleEn = extract('Title \\(English\\)')
        const severityEn = extract('Severity Level \\(English\\)')
        const confidence = extract('AI Confidence Score').replace('%', '').trim()

        // Build clean formatted description for the form
        const description = raw
            .replace(/\*\*/g, '')
            .replace(/##/g, '')
            .trim()

        res.json({
            description,           // full formatted report
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
