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

// AI Image Scan — generate description from image + title in English or Marathi
router.post('/scan-image', async (req, res) => {
    try {
        const { imageBase64, title, language } = req.body
        if (!imageBase64) return res.status(400).json({ message: 'Image required' })

        const groq = new Groq({ apiKey: GROQ_KEY })
        const isMarathi = language === 'mr'

        const prompt = isMarathi
            ? `तुम्ही एक नागरी समस्या विश्लेषक आहात. ${title ? `या समस्येचे शीर्षक आहे: "${title}".` : ''}
या प्रतिमेचे विश्लेषण करा आणि खालील स्वरूपात फक्त मराठीत उत्तर द्या:

समस्या: [एका ओळीत समस्या सांगा]
तीव्रता: [सौम्य / मध्यम / गंभीर]
वर्णन: [2-3 वाक्यांत स्पष्ट वर्णन - काय दिसत आहे, किती गंभीर आहे, कोणाला धोका आहे]

फक्त वरील स्वरूपात उत्तर द्या. मार्कडाउन, हेडर, बुलेट पॉइंट वापरू नका.`
            : `You are a civic issue analyst. ${title ? `The issue title is: "${title}".` : ''}
Analyze this image and respond in this exact format only:

Issue: [one line summary]
Severity: [Minor / Moderate / Severe]
Description: [2-3 clear sentences — what is visible, how serious it is, any safety concerns]

No markdown, no bullet points, no numbered lists, no headers. Plain text only.`

        const completion = await groq.chat.completions.create({
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            messages: [{
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    { type: 'image_url', image_url: { url: imageBase64 } }
                ]
            }],
            max_tokens: 250,
            temperature: 0.3,
        })

        const raw = completion.choices[0]?.message?.content || ''

        const descKey = isMarathi ? 'वर्णन' : 'Description'
        const issueKey = isMarathi ? 'समस्या' : 'Issue'
        const severityKey = isMarathi ? 'तीव्रता' : 'Severity'

        const descMatch = raw.match(new RegExp(`${descKey}:\\s*(.+?)(?:\\n|$)`, 'is'))
        const issueMatch = raw.match(new RegExp(`${issueKey}:\\s*(.+?)(?:\\n|$)`, 'i'))
        const severityMatch = raw.match(new RegExp(`${severityKey}:\\s*(.+?)(?:\\n|$)`, 'i'))

        const rawDesc = descMatch ? descMatch[1].trim() : raw
        const description = rawDesc
            .replace(/##\s*/g, '')
            .replace(/\*\*/g, '')
            .replace(/^\d+\.\s*/gm, '')
            .replace(/^[-•]\s*/gm, '')
            .trim()

        res.json({
            description,
            suggestedTitle: !title && issueMatch ? issueMatch[1].trim() : '',
            severity: severityMatch ? severityMatch[1].trim() : ''
        })
    } catch (error) {
        res.status(500).json({ message: 'Failed to analyze image', description: '' })
    }
})

export default router
