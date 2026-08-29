import { Download, Share, Smartphone, X } from 'lucide-react'
import { useEffect, useState } from 'react'

function isIOS() {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
}

function isStandalone() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export default function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showIOS, setShowIOS] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true)
      return
    }

    const onBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    const onAppInstalled = () => {
      setInstalled(true)
      setDeferredPrompt(null)
      setShowIOS(false)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onAppInstalled)

    // iOS: muestra ayuda si no está instalada y es iOS
    if (isIOS() && !isStandalone()) {
      const timer = setTimeout(() => {
        const seen = localStorage.getItem('pwa-ios-seen')
        if (!seen) setShowIOS(true)
      }, 1200)
      return () => {
        clearTimeout(timer)
        window.removeEventListener('beforeinstallprompt', onBeforeInstall)
        window.removeEventListener('appinstalled', onAppInstalled)
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }

  const handleDismissIOS = () => {
    setShowIOS(false)
    setDismissed(true)
    localStorage.setItem('pwa-ios-seen', '1')
  }

  if (installed) return null
  if (dismissed && !deferredPrompt) return null

  // Android / desktop: mostrar botón instalar cuando hay prompt
  if (deferredPrompt) {
    return (
      <div className="pwa-install-banner" role="region" aria-label="Instalar aplicación">
        <span className="pwa-install-icon">
          <Smartphone size={18} />
        </span>
        <div className="pwa-install-copy">
          <strong>Instala la app Oficina 3006</strong>
          <span>Un toque y la tienes como app en tu celular — funciona sin internet</span>
        </div>
        <button type="button" className="pwa-install-btn" onClick={handleInstall}>
          <Download size={16} /> Instalar
        </button>
        <button type="button" className="pwa-install-close" onClick={() => setDeferredPrompt(null)} aria-label="Cerrar">
          <X size={16} />
        </button>
      </div>
    )
  }

  // iOS: instrucciones
  if (showIOS) {
    return (
      <div className="pwa-install-banner pwa-install-ios" role="region" aria-label="Instalar en iPhone">
        <span className="pwa-install-icon" style={{ background: '#1E5B4F' }}>
          <Share size={18} />
        </span>
        <div className="pwa-install-copy">
          <strong>Instala en tu iPhone</strong>
          <span>
            Toca <b>Compartir <Share size={12} style={{ display: 'inline', verticalAlign: '-2px' }} /></b> abajo y luego <b>“Agregar a pantalla de inicio”</b> <span style={{ fontSize: '13px' }}>＋</span>
          </span>
        </div>
        <button type="button" className="pwa-install-close" onClick={handleDismissIOS} aria-label="Cerrar">
          <X size={16} />
        </button>
      </div>
    )
  }

  return null
}
