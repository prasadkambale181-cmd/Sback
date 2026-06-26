import nodemailer from 'nodemailer'

export const submitContact = async (req, res) => {
    const { name, email, subject, message } = req.body

    if (!name || !email || !subject || !message) {
        return res.status(400).json({ message: 'All fields are required.' })
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.CONTACT_EMAIL_USER,
                pass: process.env.CONTACT_EMAIL_PASS.replace(/\s/g, ''),
            },
        })

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
