// Africa's Talking SMS sender. Returns true when the API accepted the send.

function toE164(to: string): string {
  if (to.startsWith('+')) return to
  const digits = to.replace(/\D/g, '')
  if (digits.startsWith('254')) return `+${digits}`
  return `+254${digits.replace(/^0/, '')}`
}

export function smsConfigured(): boolean {
  return Boolean(Deno.env.get('AT_API_KEY') && Deno.env.get('AT_USERNAME'))
}

export async function sendSms(to: string, message: string): Promise<boolean> {
  const apiKey = Deno.env.get('AT_API_KEY')
  const username = Deno.env.get('AT_USERNAME')
  if (!apiKey || !username) return false
  try {
    const res = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({ username, to: toE164(to), message }),
    })
    return res.ok
  } catch (_) {
    return false
  }
}
