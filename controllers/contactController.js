import nodemailer from 'nodemailer'

const createTransporter = () => nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.CONTACT_EMAIL_USER,
        pass: process.env.CONTACT_EMAIL_PASS.replace(/\s/g, ''),
    },
})

export const submitContact = async (req, res) => {
    const { name, email, subject, message } = req.body

    if (!name || !email || !subject || !message) {
        return res.status(400).json({ message: 'All fields are required.' })
    }

    try {
        const transporter = createTransporter()

        await transporter.sendMail({
            from: `"SudharNayak Contact" <${process.env.CONTACT_EMAIL_USER}>`,
            to: process.env.CONTACT_EMAIL_RECEIVER,
            replyTo: email,
            subject: `[Contact] ${subject}`,
            html: `
                <div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;background:#faf8ff;border-radius:16px;overflow:hidden;border:1px solid #c3c6d7;">
                    <div style="background:linear-gradient(135deg,#004ac6,#2563eb);padding:32px;text-align:center;">
                        <h1 style="color:#fff;margin:0;font-size:24px;">New Contact Message</h1>
                        <p style="color:#dbe1ff;margin:8px 0 0;">SudharNayak Platform</p>
                    </div>
                    <div style="padding:32px;">
                        <table style="width:100%;border-collapse:collapse;">
                            <tr><td style="padding:10px 0;color:#737686;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Name</td><td style="padding:10px 0;color:#191b23;font-weight:600;">${name}</td></tr>
                            <tr><td style="padding:10px 0;color:#737686;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Email</td><td style="padding:10px 0;color:#004ac6;">${email}</td></tr>
                            <tr><td style="padding:10px 0;color:#737686;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Subject</td><td style="padding:10px 0;color:#191b23;font-weight:600;">${subject}</td></tr>
                        </table>
                        <div style="margin-top:24px;background:#f3f3fe;border-radius:12px;padding:20px;">
                            <p style="color:#737686;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">Message</p>
                            <p style="color:#191b23;line-height:1.7;margin:0;">${message.replace(/\n/g, '<br/>')}</p>
                        </div>
                    </div>
                    <div style="background:#ededf9;padding:16px;text-align:center;">
                        <p style="color:#737686;font-size:12px;margin:0;">Sent via SudharNayak Contact Form</p>
                    </div>
                </div>
            `,
        })

        res.status(200).json({ message: 'Message sent successfully!' })
    } catch (err) {
        console.error('Contact email error:', err)
        res.status(500).json({ message: 'Failed to send message. Please try again.' })
    }
}

export const subscribeNewsletter = async (req, res) => {
    const { email } = req.body
    if (!email) return res.status(400).json({ message: 'Email is required.' })

    try {
        const transporter = createTransporter()
        await transporter.sendMail({
            from: `"SudharNayak" <${process.env.CONTACT_EMAIL_USER}>`,
            to: email,
            subject: `Welcome to SudharNayak Newsletter! 🏙️`,
            html: `
                <div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;background:#faf8ff;border-radius:16px;overflow:hidden;border:1px solid #c3c6d7;">
                    <div style="background:linear-gradient(135deg,#004ac6,#2563eb);padding:40px;text-align:center;">
                        <h1 style="color:#fff;margin:0;font-size:28px;font-weight:800;">SudharNayak</h1>
                        <p style="color:#dbe1ff;margin:8px 0 0;font-size:14px;">Empowering Citizens. Building Better Cities.</p>
                    </div>
                    <div style="padding:40px;text-align:center;">
                        <div style="width:64px;height:64px;background:#dbe1ff;border-radius:16px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:24px;">
                            <span style="font-size:32px;">🎉</span>
                        </div>
                        <h2 style="color:#191b23;font-size:22px;font-weight:700;margin:0 0 12px;">You're subscribed!</h2>
                        <p style="color:#434655;line-height:1.7;margin:0 0 24px;">Thanks for subscribing to the SudharNayak newsletter. You'll now receive updates on city-wide reports, resolution highlights, and platform news.</p>
                        <a href="https://sudharnayak.vercel.app" style="display:inline-block;background:linear-gradient(135deg,#004ac6,#2563eb);color:#fff;padding:14px 32px;border-radius:12px;font-weight:700;text-decoration:none;font-size:15px;">Explore Platform</a>
                    </div>
                    <div style="background:#ededf9;padding:16px;text-align:center;">
                        <p style="color:#737686;font-size:12px;margin:0;">© ${new Date().getFullYear()} SudharNayak — Making India Cleaner 🇮🇳</p>
                    </div>
                </div>
            `,
        })
        res.status(200).json({ message: 'Subscribed successfully!' })
    } catch (err) {
        console.error('Newsletter error:', err)
        res.status(500).json({ message: 'Failed to subscribe. Please try again.' })
    }
}
