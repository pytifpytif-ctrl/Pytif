import { Capacitor } from '@capacitor/core'
import { NativeBiometric } from 'capacitor-native-biometric'

const STORAGE_PREFIX = 'jiokoe_biometric_v1_'

function storageKey(userId) {
  return `${STORAGE_PREFIX}${userId}`
}

export function isBiometricSupportedPlatform() {
  return Capacitor.isNativePlatform()
}

export function isBiometricEnabled(userId) {
  if (!userId) return false
  return localStorage.getItem(storageKey(userId)) === '1'
}

export function setBiometricEnabled(userId, enabled) {
  if (!userId) return
  if (enabled) localStorage.setItem(storageKey(userId), '1')
  else localStorage.removeItem(storageKey(userId))
}

export function clearBiometricPreference(userId) {
  if (userId) localStorage.removeItem(storageKey(userId))
}

export async function checkBiometricHardware() {
  if (!Capacitor.isNativePlatform()) {
    return { available: false, biometryType: null }
  }
  try {
    const result = await NativeBiometric.isAvailable()
    return {
      available: Boolean(result?.isAvailable),
      biometryType: result?.biometryType ?? null,
    }
  } catch {
    return { available: false, biometryType: null }
  }
}

export function biometricLabel(biometryType) {
  const t = String(biometryType || '').toLowerCase()
  if (t.includes('face')) return 'Face ID'
  if (t.includes('touch') || t.includes('finger')) return 'Fingerprint'
  if (Capacitor.getPlatform() === 'ios') return 'Face ID / Touch ID'
  return 'Biometrics'
}

/** Device biometric gate — unlocks app session only; passcode remains the backup. */
export async function authenticateWithBiometric(reason = 'Unlock Jiokoe') {
  if (!Capacitor.isNativePlatform()) return false
  try {
    await NativeBiometric.verifyIdentity({
      reason,
      title: 'Jiokoe',
      subtitle: reason,
      description: 'Confirm it is you to open your wallet',
      useFallback: true,
      fallbackTitle: 'Use device passcode',
    })
    return true
  } catch {
    return false
  }
}
