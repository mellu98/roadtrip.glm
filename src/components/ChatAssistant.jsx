import { useState, useRef, useEffect } from 'react'
import { useTripStore } from '../store/tripStore'
import { useApiStore } from '../store/apiStore'
import { getApiConfig } from '../utils/storage'

const QUICK_SUGGESTIONS = [
  { icon: '🌧️', text: 'Cosa fare se piove?' },
  { icon: '🌱', text: 'Ristoranti vegani vicini' },
  { icon: '💶', text: 'Come risparmiare?' },
  { icon: '🎭', text: 'Eventi o feste locali' },
  { icon: '👨‍👩‍👧‍👦', text: 'Attività per famiglie' },
  { icon: '📸', text: 'Posti instagrammabili' },
]

export default function ChatAssistant() {
  const { currentItinerary: itinerary } = useTripStore()
  const { config } = useApiStore()
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Ciao! Sono il tuo assistente di viaggio per **${itinerary?.title || 'il tuo viaggio'}**. Chiedimi qualsiasi cosa — meteo, ristoranti, alternative, consigli!` }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const buildContext = () => {
    if (!itinerary) return ''
    const days = itinerary.days?.map(d => 
      `Giorno ${d.dayNumber} (${d.date}): ${d.activities?.map(a => `${a.time} ${a.name} (${a.type})`).join(', ')}`
    ).join('\n') || ''

    return `Sei un assistente di viaggio esperto. L'utente sta pianificando questo viaggio:

Destinazione: ${itinerary.destination}
Titolo: ${itinerary.title}
Date: ${itinerary.startDate} → ${itinerary.endDate}
Budget: ${itinerary.formData?.currency} ${itinerary.formData?.budget}
Stile: ${itinerary.formData?.travelStyle?.join(', ') || 'vario'}
Interessi: ${itinerary.formData?.interests?.join(', ') || 'generali'}

ITINERARIO:
${days}

Rispondi in italiano. Sii conciso ma utile. Se suggerisci un posto, includi il nome reale.`
  }

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return

    const userMessage = { role: 'user', content: text.trim() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const apiConfig = getApiConfig()
      const chatMessages = [
        { role: 'system', content: buildContext() },
        ...messages.filter(m => m.role !== 'system').slice(-6), // Ultimi 6 messaggi per contesto
        userMessage,
      ]

      const response = await fetch(apiConfig.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.key}`,
        },
        body: JSON.stringify({
          model: apiConfig.model,
          messages: chatMessages,
          temperature: 0.7,
          max_tokens: 1000,
        }),
      })

      if (!response.ok) throw new Error('Errore API')

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || 'Mi dispiace, non sono riuscito a generare una risposta.'

      setMessages(prev => [...prev, { role: 'assistant', content }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Errore: ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="chat-assistant">
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.role}`}>
            {msg.role === 'assistant' && <span className="chat-avatar">🤖</span>}
            <div className="chat-bubble">
              {msg.content.split('**').map((part, j) => 
                j % 2 === 1 ? <strong key={j}>{part}</strong> : part
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-message assistant">
            <span className="chat-avatar">🤖</span>
            <div className="chat-bubble typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-suggestions">
        {QUICK_SUGGESTIONS.map((s, i) => (
          <button
            key={i}
            className="chat-suggestion"
            onClick={() => sendMessage(s.text)}
            disabled={loading}
          >
            {s.icon} {s.text}
          </button>
        ))}
      </div>

      <div className="chat-input-area">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Chiedimi qualcosa sul tuo viaggio..."
          disabled={loading}
        />
        <button
          className="chat-send-btn"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
        >
          <i className="fas fa-paper-plane"></i>
        </button>
      </div>
    </div>
  )
}
