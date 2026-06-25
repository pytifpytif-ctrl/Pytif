// Africa's Talking SMS sender. Returns true if a send was attempted (creds set).

export function smsConfigured(): boolean {
  return Boolean(Deno.env.get('AT_API_KEY') && Deno.env.get('AT_USERNAME'))
}

export async function sendSms(to: string, message: string): Promise<boolean> {
  const apiKey = Deno.env.get('AT_API_KEY')
  const username = Deno.env.get('AT_USERNAME')
  if (!apiKey || !username) return false
  try {
    const recipient = to.startsWith('+') ? to : `+254${to.replace(/^0/, '')}`
    await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({ username, to: recipient, message }),
    })
    return true
  } catch (_) {
    return false
  }
}
