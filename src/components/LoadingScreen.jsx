import { useState, useEffect } from 'react'
import { Progress } from '@heroui/react'

const MESSAGES = [
  { icon: '🌍', text: 'Exploring the destination...' },
  { icon: '🔍', text: 'Finding hidden gems...' },
  { icon: '🍽️', text: 'Discovering the best restaurants...' },
  { icon: '🏛️', text: 'Planning attractions...' },
  { icon: '🗺️', text: 'Optimizing the route...' },
  { icon: '💰', text: 'Calculating budget...' },
  { icon: '⏰', text: 'Checking hours and availability...' },
  { icon: '✨', text: 'Adding finishing touches...' },
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
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="max-w-md w-full text-center">
        <div className="relative h-24 flex items-center justify-center mb-6">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] bg-gradient-to-r from-transparent via-primary to-transparent rounded-full animate-pulse-trail" />
          <span className="text-5xl animate-fly-plane relative z-10">✈️</span>
        </div>

        <h2 className="text-2xl font-bold mb-5 text-foreground">
          Creating your trip{destination ? ` to ${destination}` : ''}
        </h2>

        <div className="flex items-center justify-center gap-2 text-default-500 mb-6 min-h-6">
          <span className="text-xl">{msg.icon}</span>
          <span className="text-[15px]">{msg.text}{dots}</span>
        </div>

        <Progress
          isIndeterminate
          aria-label="Loading"
          color="primary"
          size="sm"
          className="mb-3"
        />

        <p className="text-sm text-default-400">
          This may take 30-60 seconds
        </p>
      </div>
    </div>
  )
}
