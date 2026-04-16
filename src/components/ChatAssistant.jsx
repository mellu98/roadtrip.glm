import { useState, useRef, useEffect } from 'react'
import { Button, Input, Chip } from '@heroui/react'
import { useTripStore } from '../store/tripStore'
import { sendChatMessage } from '../utils/ai'

const QUICK_SUGGESTIONS = [
  { icon: '🌧️', text: 'What to do if it rains?' },
  { icon: '🌱', text: 'Nearby vegan restaurants' },
  { icon: '💶', text: 'How to save money?' },
  { icon: '🎭', text: 'Local events or festivals' },
  { icon: '👨‍👩‍👧‍👦', text: 'Family-friendly activities' },
  { icon: '📸', text: 'Instagrammable spots' },
]

export default function ChatAssistant() {
  const { currentItinerary: itinerary } = useTripStore()
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hi! I'm your travel assistant for **${itinerary?.title || 'your trip'}**. Ask me anything — weather, restaurants, alternatives, tips!` }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return

    const userMessage = { role: 'user', content: text.trim() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const tripId = itinerary?.id || itinerary?.pbId
      const chatHistory = messages.filter(m => m.role !== 'system').slice(-6).concat(userMessage)

      const content = await sendChatMessage(tripId, chatHistory)
      setMessages(prev => [...prev, { role: 'assistant', content }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Error: ${err.message}` }])
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
    <div className="flex flex-col h-[calc(100vh-240px)] min-h-[400px] max-h-[700px] rounded-large bg-content1 border border-default-200 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-base flex-shrink-0">
                🤖
              </span>
            )}
            <div
              className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-default-100 text-foreground rounded-bl-sm'
              }`}
            >
              {msg.content.split('**').map((part, j) =>
                j % 2 === 1 ? <strong key={j}>{part}</strong> : part
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 justify-start">
            <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-base flex-shrink-0">
              🤖
            </span>
            <div className="bg-default-100 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-default-400 animate-typing-bounce" />
              <span className="w-2 h-2 rounded-full bg-default-400 animate-typing-bounce" style={{ animationDelay: '0.2s' }} />
              <span className="w-2 h-2 rounded-full bg-default-400 animate-typing-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2 overflow-x-auto px-3 py-2 border-t border-default-200 scrollbar-none">
        {QUICK_SUGGESTIONS.map((s, i) => (
          <Chip
            key={i}
            size="sm"
            variant="flat"
            className="cursor-pointer hover:bg-primary/10 flex-shrink-0 whitespace-nowrap"
            onClick={() => !loading && sendMessage(s.text)}
          >
            {s.icon} {s.text}
          </Chip>
        ))}
      </div>

      <div className="flex gap-2 p-3 border-t border-default-200 bg-content2">
        <Input
          value={input}
          onValueChange={setInput}
          onKeyDown={handleKeyDown}
          placeholder="Ask me something about your trip..."
          isDisabled={loading}
          variant="bordered"
          size="md"
        />
        <Button
          isIconOnly
          color="primary"
          onPress={() => sendMessage(input)}
          isDisabled={!input.trim() || loading}
          aria-label="Send"
        >
          <i className="fas fa-paper-plane" />
        </Button>
      </div>
    </div>
  )
}
