import { useEffect, useState } from 'react'
import { Icon } from './icons.jsx'
import { dismissPwaPrompt, isIos, isPwaDismissed, isStandalonePwa } from '../lib/pwa.js'

export default function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  const [visible, setVisible] = useState(false)
  const [iosHint, setIosHint] = useState(false)

  useEffect(() => {
    if (isStandalonePwa() || isPwaDismissed()) return undefined

    if (isIos()) {
      const t = setTimeout(() => setVisible(true), 1200)
      return () => clearTimeout(t)
    }

    const onBip = (e) => {
      e.preventDefault()
      setDeferred(e)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', onBip)
    return () => window.removeEventListener('beforeinstallprompt', onBip)
  }, [])

  const close = () => {
    dismissPwaPrompt()
    setVisible(false)
    setIosHint(false)
  }

  const install = async () => {
    if (isIos()) {
      if (iosHint) {
        close()
        return
      }
      setIosHint(true)
      return
    }
    if (!deferred) return
    deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
    setVisible(false)
  }

  if (!visible || isStandalonePwa()) return null

  return (
    <div className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] z-40 px-4 lg:bottom-6 lg:left-auto lg:right-6 lg:max-w-sm lg:px-0">
      <div className="animate-slide-up overflow-hidden rounded-2xl border border-line bg-surface shadow-float ring-1 ring-black/5 dark:ring-white/10">
        <div className="flex items-start gap-3 p-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-rich text-white shadow-glow">
            <Icon name="download" size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink">Install Pytif</p>
            <p className="mt-0.5 text-xs leading-snug text-ink-muted">
              {iosHint
                ? 'Tap Share, then “Add to Home Screen” for app-like access.'
                : 'Add to your home screen for instant opens and live balance updates.'}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Dismiss"
            className="press grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-surface-soft hover:text-ink"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="flex gap-2 border-t border-line bg-surface-soft/80 px-4 py-3">
          <button type="button" onClick={close} className="btn-ghost flex-1 py-2 text-sm">
            Not now
          </button>
          <button type="button" onClick={install} className="btn-primary flex-1 py-2 text-sm">
            {isIos() ? (iosHint ? 'Got it' : 'How to install') : 'Install app'}
          </button>
        </div>
      </div>
    </div>
  )
}
