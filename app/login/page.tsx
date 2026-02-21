'use client'

import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<'login' | 'signup'>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'login'
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push('/dashboard')
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({ id: data.user.id, username: username.trim() })
        if (profileError) setError(profileError.message)
        else router.push('/dashboard')
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black px-6">
      <div className="w-full max-w-md">
        <button
          onClick={() => router.push('/')}
          className="text-gray-500 text-sm mb-8 hover:text-gray-300 transition"
        >
          ← Back
        </button>

        <h1 className="text-3xl font-bold text-white mb-1">
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h1>
        <p className="text-gray-500 mb-8 text-sm">
          {mode === 'login' ? 'Sign in to your HabitFlow account' : 'Start building better habits today'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              minLength={3}
              className="w-full px-4 py-4 bg-gray-950 text-white rounded-2xl border border-gray-800 focus:outline-none focus:border-green-500 placeholder-gray-600 transition"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-4 py-4 bg-gray-950 text-white rounded-2xl border border-gray-800 focus:outline-none focus:border-green-500 placeholder-gray-600 transition"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-4 bg-gray-950 text-white rounded-2xl border border-gray-800 focus:outline-none focus:border-green-500 placeholder-gray-600 transition"
          />

          {error && <p className="text-red-400 text-sm px-1">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-green-500 hover:bg-green-400 text-black font-bold rounded-2xl transition disabled:opacity-50 mt-2"
          >
            {loading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <p className="text-gray-500 text-center mt-6 text-sm">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
            className="text-green-400 hover:underline font-semibold"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <LoginForm />
    </Suspense>
  )
}
