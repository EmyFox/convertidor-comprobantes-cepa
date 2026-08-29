import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

// PWA auto-update - Oficina 3006 lista offline
if ('serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        // Actualización disponible - se aplicará al recargar
        console.log('Nueva versión disponible - recarga para actualizar')
      },
      onOfflineReady() {
        console.log('App lista para trabajar sin internet')
      }
    })
  }).catch(() => {})
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)