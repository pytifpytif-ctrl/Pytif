// Transactional email (passcode reset). Configure RESEND_API_KEY + EMAIL_FROM in production.

export function emailConfigured(): boolean {
  return Boolean(Deno.env.get('RESEND_API_KEY') && Deno.env.get('EMAIL_FROM'))
}

export async function sendPasscodeResetEmail(to: string, resetUrl: string): Promise<boolean> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('EMAIL_FROM') ?? 'Jiokoe <onboarding@resend.dev>'
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set; passcode reset link not emailed')
    return false
  }

  const subject = 'Reset your Jiokoe app passcode'
  const html = `
    <p>You requested to reset your 4-digit Jiokoe app passcode.</p>
    <p><a href="${resetUrl}">Set a new passcode</a></p>
    <p>This link expires in 15 minutes. If you did not request this, ignore this email.</p>
    <p style="color:#666;font-size:12px">Or copy this link: ${resetUrl}</p>
  `.trim()

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    })
    return res.ok
  } catch {
    return false
  }
}
