import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './pwa.ts'

// PWA installation detection
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    console.log('PWA Service Worker support detected')
  })
}

// Handle online/offline events
window.addEventListener('online', () => {
  console.log('App is online')
})

window.addEventListener('offline', () => {
  console.log('App is offline')
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)