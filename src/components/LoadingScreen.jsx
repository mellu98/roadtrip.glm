import { useState, useEffect } from 'react'

const MESSAGES = [
  { icon: '🌍', text: 'Esplorando la destinazione...' },
  { icon: '🔍', text: 'Cercando le gemme nascoste...' },
  { icon: '🍽️', text: 'Scoprendo i migliori ristoranti...' },
  { icon: '🏛️', text: 'Pianificando le attrazioni...' },
  { icon: '🗺️', text: 'Ottimizzando il percorso...' },
  { icon: '💰', text: 'Calcolando il budget...' },
  { icon: '⏰', text: 'Verificando orari e disponibilità...' },
  { icon: '✨', text: 'Aggiungendo i tocchi finali...' },
]

export default function LoadingScreen({ destination }) {
  const [msgIndex, setMsgIndex] = useState(0)
  const [dots, setDots] = useState('')

  useEffect(() => {
    const msgInterval = setInterval(() => {
      setMsgIndex(i => (i + 1) % MESSAGES.length)
    }, 3000)
    return () => clearInterval(msgInterval)
  }, [])

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.')
    }, 500)
    return () => clearInterval(dotInterval)
  }, [])

  const msg = MESSAGES[msgIndex]

  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-animation">
          <div className="loading-plane">✈️</div>
          <div className="loading-trail"></div>
        </div>

        <h2 className="loading-title">
          Sto creando il tuo viaggio{destination ? ` a ${destination}` : ''}
        </h2>

        <div className="loading-message">
          <span className="loading-icon">{msg.icon}</span>
          <span>{msg.text}{dots}</span>
        </div>

        <div className="loading-bar">
          <div className="loading-bar-fill"></div>
        </div>

        <p className="loading-hint">
          Questo potrebbe richiedere 30-60 secondi
        </p>
      </div>
    </div>
  )
}
