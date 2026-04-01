import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mail',
  port: Number(process.env.SMTP_PORT || 1025),
  secure: false,
})

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'MULTI <noreply@multi.app>',
    to,
    subject,
    html,
  })
}

export function buildBusinessMdEmail(businessMd: string, businessName: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'

  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #0A0A0A;">
  <div style="border-bottom: 1px solid #E8E8E6; padding-bottom: 16px; margin-bottom: 24px;">
    <span style="font-size: 20px; font-weight: 500; color: #534AB7;">MULTI</span>
  </div>

  <h1 style="font-size: 20px; font-weight: 500; margin-bottom: 8px;">
    Votre BUSINESS.md est pret
  </h1>
  <p style="color: #6B6B6B; font-size: 14px; margin-bottom: 24px;">
    Voici le document strategique genere pour <strong>${businessName}</strong>.
  </p>

  <div style="background: #F8F8F6; border: 1px solid #E8E8E6; border-radius: 8px; padding: 20px; margin-bottom: 32px;">
    <pre style="white-space: pre-wrap; font-family: monospace; font-size: 12px; line-height: 1.6; margin: 0;">${businessMd}</pre>
  </div>

  <div style="background: #EEEDFE; border: 1px solid #534AB7; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
    <h2 style="font-size: 16px; font-weight: 500; color: #534AB7; margin: 0 0 8px 0;">
      Retrouvez votre BUSINESS.md a tout moment
    </h2>
    <p style="color: #6B6B6B; font-size: 13px; margin: 0 0 16px 0;">
      Creez votre compte pour acceder a votre dashboard, modifier votre document et activer vos agents IA.
    </p>
    <a href="${appUrl}/sign-up"
       style="display: inline-block; background: #534AB7; color: white; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 500;">
      Creer mon compte gratuit
    </a>
  </div>

  <p style="color: #A8A8A8; font-size: 11px; text-align: center;">
    MULTI — Generative Business Platform
  </p>
</body>
</html>`
}
