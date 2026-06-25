// Shared auth helpers for edge functions.

/** True when the caller presents the Supabase service role key (cron / internal). */
export function verifyServiceRole(req: Request): boolean {
  const expected = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!expected) return false
  const auth = req.headers.get('Authorization') ?? ''
  return auth === `Bearer ${expected}`
}

/** Optional shared secret for non-Safaricom internal webhooks. */
export function verifyWebhookSecret(req: Request): boolean {
  const secret = Deno.env.get('INTERNAL_WEBHOOK_SECRET') ?? ''
  if (!secret) {
    const env = (Deno.env.get('MPESA_ENV') ?? 'sandbox').toLowerCase()
    return env !== 'production'
  }
  return (req.headers.get('x-pytif-webhook-secret') ?? '') === secret
}

export function clientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

export async function auditLog(
  supabase: ReturnType<typeof import('./supabaseAdmin.ts').adminClient>,
  eventType: string,
  metadata: Record<string, unknown> = {},
  actorId?: string | null,
  req?: Request,
) {
  try {
    await supabase.from('security_audit_log').insert({
      event_type: eventType,
      actor_id: actorId ?? null,
      ip_address: req ? clientIp(req) : null,
      metadata,
    })
  } catch {
    // Never block the request path on audit failure.
  }
}

export async function enforceRateLimit(
  supabase: ReturnType<typeof import('./supabaseAdmin.ts').adminClient>,
  key: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  })
  if (error) return false
  return data === true
}
