import { useState } from 'react'
import { copyShareLink } from '../utils/share'

export default function ShareModal({ trip, onClose }) {
  const [copied, setCopied] = useState(false)
  const [shareError, setShareError] = useState(false)

  const handleCopy = async () => {
    const success = await copyShareLink(trip)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } else {
      setShareError(true)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Condividi Viaggio</h2>
          <p className="modal-subtitle">Genera un link di sola lettura per questo itinerario</p>
        </div>

        <div className="share-info">
          <i className="fas fa-link"></i>
          <p>Il link contiene tutto l'itinerario. Chi lo apre potrà visualizzarlo ma non modificarlo.</p>
        </div>

        <div className="share-actions">
          <button
            className={`btn-primary ${copied ? 'btn-success' : ''}`}
            onClick={handleCopy}
          >
            {copied ? (
              <><i className="fas fa-check"></i> Link copiato!</>
            ) : (
              <><i className="fas fa-copy"></i> Copia link</>
            )}
          </button>
        </div>

        {shareError && (
          <div className="share-error">
            <i className="fas fa-exclamation-triangle"></i>
            Impossibile generare il link. Il viaggio potrebbe essere troppo lungo per essere condiviso via URL.
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Chiudi</button>
        </div>
      </div>
    </div>
  )
}
