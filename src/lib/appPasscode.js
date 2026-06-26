const STORAGE_PREFIX = 'jiokoe_app_passcode_v1_'
const UNLOCK_PREFIX = 'jiokoe_app_unlocked_'

function storageKey(userId) {
  return `${STORAGE_PREFIX}${userId}`
}

function unlockKey(userId) {
  return `${UNLOCK_PREFIX}${userId}`
}

async function hashPasscode(userId, pin) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${userId}:${pin}:jiokoe`))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function isValidPin(pin) {
  return /^\d{4}$/.test(String(pin || ''))
}

export function hasPasscode(userId) {
  if (!userId) return false
  return Boolean(localStorage.getItem(storageKey(userId)))
}

export async function setPasscode(userId, pin) {
  if (!isValidPin(pin)) throw new Error('Passcode must be exactly 4 digits.')
  localStorage.setItem(storageKey(userId), await hashPasscode(userId, pin))
  clearUnlock(userId)
}

export async function verifyPasscode(userId, pin) {
  if (!hasPasscode(userId)) return true
  const stored = localStorage.getItem(storageKey(userId))
  return stored === (await hashPasscode(userId, pin))
}

export function removePasscode(userId) {
  localStorage.removeItem(storageKey(userId))
  clearUnlock(userId)
}

export function isUnlocked(userId) {
  if (!userId || !hasPasscode(userId)) return true
  return sessionStorage.getItem(unlockKey(userId)) === '1'
}

export function markUnlocked(userId) {
  sessionStorage.setItem(unlockKey(userId), '1')
}

export function clearUnlock(userId) {
  if (userId) sessionStorage.removeItem(unlockKey(userId))
}
