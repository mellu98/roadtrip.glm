import { useState } from 'react'
import { Button, Input, Card, CardBody } from '@heroui/react'
import pb from '../lib/pb'

export default function AuthScreen() {
  const [mode, setMode] = useState('login') // 'login' or 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required')
      return
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      if (mode === 'register') {
        await pb.collection('users').create({
          email: email.trim(),
          password: password,
          passwordConfirm: confirmPassword,
          username: email.trim().split('@')[0] + '_' + Date.now().toString(36),
        })
        // Auto-login after registration
        await pb.collection('users').authWithPassword(email.trim(), password)
      } else {
        await pb.collection('users').authWithPassword(email.trim(), password)
      }
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Authentication failed'
      if (message.includes('already exists') || message.includes('already registered')) {
        setError('This email is already registered. Try logging in.')
      } else if (message.includes('Invalid login')) {
        setError('Invalid email or password')
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setError('')
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🗺️</span>
          </div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">RoadTrip Planner</h1>
          <p className="text-sm text-default-500 mt-1">
            {mode === 'login' ? 'Sign in to continue' : 'Create your account'}
          </p>
        </div>

        {/* Form */}
        <Card className="border border-default-200">
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                label="Email"
                value={email}
                onValueChange={setEmail}
                placeholder="you@example.com"
                variant="bordered"
                autoComplete="email"
                isRequired
              />

              <Input
                type="password"
                label="Password"
                value={password}
                onValueChange={setPassword}
                placeholder="Min. 6 characters"
                variant="bordered"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                isRequired
              />

              {mode === 'register' && (
                <Input
                  type="password"
                  label="Confirm password"
                  value={confirmPassword}
                  onValueChange={setConfirmPassword}
                  placeholder="Repeat your password"
                  variant="bordered"
                  autoComplete="new-password"
                  isRequired
                />
              )}

              {error && (
                <div className="bg-danger/10 text-danger text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                color="primary"
                fullWidth
                isLoading={loading}
                className="font-semibold"
              >
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </Button>
            </form>
          </CardBody>
        </Card>

        {/* Switch mode */}
        <p className="text-center text-sm text-default-500 mt-4">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={switchMode}
            className="text-primary font-semibold hover:underline"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
