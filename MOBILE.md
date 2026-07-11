# Jiokoe — Mobile apps (Android & iOS)

Jiokoe ships as **one React codebase** on three surfaces:

| Surface | How |
|---------|-----|
| **Web** | Vite build → Vercel |
| **Android** | Capacitor shell → Google Play |
| **iOS** | Capacitor shell → App Store |

Payments always go through **Supabase edge functions + M-Pesa STK** — the native shell never holds Daraja secrets.

---

## Prerequisites

### All platforms
- Node 18+
- `npm install`
- `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### Android
- [Android Studio](https://developer.android.com/studio) (SDK 34+)
- JDK 17

### iOS (Mac only)
- Xcode 15+
- CocoaPods: `sudo gem install cocoapods`
- Apple Developer account (for device testing & App Store)

---

## Quick commands

```bash
# Web (unchanged)
npm run dev
npm run build

# Sync web build into native projects
npm run build:mobile

# Open in Android Studio / Xcode
npm run cap:open:android
npm run cap:open:ios

# Run on connected device or emulator
npm run cap:run:android
npm run cap:run:ios   # Mac + Xcode only
```

After changing React code, always run `npm run build:mobile` before testing native.

---

## Security on mobile

| Feature | Implementation |
|---------|----------------|
| Money movement | Server-only (edge functions) |
| App lock | 4-digit passcode (`AppPasscodeGate`) |
| Biometric unlock | Fingerprint / Face ID (`capacitor-native-biometric`) |
| Background lock | Re-locks when app goes to background (native) |
| Inactivity logout | 15 min (`useInactivityLogout`) |
| PWA install prompt | Hidden in native shell |

Enable biometrics: **Profile → Security** (requires app passcode first).

---

## Android release (Play Store)

1. `npm run build:mobile`
2. Open Android Studio: `npm run cap:open:android`
3. **Build → Generate Signed Bundle / APK** (AAB for Play Store)
4. Create app in [Google Play Console](https://play.google.com/console)
5. Complete **Data safety** form + privacy policy URL
6. Upload AAB to **Internal testing** first

**App ID:** `com.jiokoe.app`

### Android permissions (auto from plugins)
- `USE_BIOMETRIC` / `USE_FINGERPRINT` — optional unlock
- Internet — Supabase + M-Pesa

---

## iOS release (App Store)

1. On a Mac: `npm run build:mobile`
2. `npm run cap:open:ios`
3. In Xcode: set **Team** + **Bundle ID** `com.jiokoe.app`
4. Add **Privacy - Face ID Usage Description** in `Info.plist` (Capacitor may add via plugin)
5. Archive → **Distribute App** → App Store Connect
6. Submit for review

M-Pesa STK payments are **external** (Safaricom UI on device) — not Apple IAP.

---

## Web hosting (production)

```bash
npm run build
# Deploy dist/ to Vercel (already configured in vercel.json)
```

Custom domain → set `VITE_SUPABASE_URL` in Vercel env vars → redeploy.

---

## Store checklist (Betika-style)

- [ ] Production Daraja credentials (not sandbox)
- [ ] Privacy policy live at public URL
- [ ] Terms of service live
- [ ] Support email in store listing
- [ ] App screenshots (phone + tablet)
- [ ] Company registration / Kenya compliance review
- [ ] Safaricom Paybill production (Customer Bouquet)

---

## Project structure

```
capacitor.config.ts   App ID, splash, plugins
android/              Android Studio project (generated)
ios/                  Xcode project (generated)
src/lib/native.js     Capacitor init, status bar, back button
src/lib/biometrics.js Fingerprint / Face ID helpers
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| White screen on device | Run `npm run build:mobile` then retry |
| Supabase calls fail | Check `.env` vars are baked into build (`VITE_*`) |
| Biometrics not showing | Set app passcode first; enable toggle in Profile |
| iOS build fails | `cd ios/App && pod install` |
| Android Gradle sync fails | Open Android Studio → SDK Manager → install API 34 |

---

_Jiokoe mobile · Capacitor · July 2026_
