'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Flame, Trophy, Users, ChevronRight, Sparkles } from 'lucide-react'

export default function LandingPage() {
  const [checking, setChecking] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.replace('/dashboard')
      } else {
        setChecking(false)
      }
    })
  }, [])

  if (checking) {
    return <div className="min-h-screen bg-black" />
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="flex-1 max-w-md mx-auto w-full px-6 flex flex-col justify-between py-16">

        {/* Hero */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-green-500/30">
            <Flame size={32} className="text-black" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-3">HabitFlow</h1>
          <p className="text-gray-400 text-lg leading-relaxed mb-12">
            Build streaks, compete with friends, and level up your daily routine.
          </p>

          {/* Feature pills */}
          <div className="space-y-3 mb-12">
            <div className="flex items-center gap-3 bg-gray-950 border border-gray-900 rounded-2xl px-4 py-3">
              <div className="w-8 h-8 bg-green-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Flame size={16} className="text-green-400" />
              </div>
              <div>
                <p className="text-sm font-semibold">Daily Streaks</p>
                <p className="text-xs text-gray-500">Stay consistent, build momentum</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gray-950 border border-gray-900 rounded-2xl px-4 py-3">
              <div className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Users size={16} className="text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold">Group Challenges</p>
                <p className="text-xs text-gray-500">Compete and grow with friends</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gray-950 border border-gray-900 rounded-2xl px-4 py-3">
              <div className="w-8 h-8 bg-yellow-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Sparkles size={16} className="text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-semibold">Daily Quests</p>
                <p className="text-xs text-gray-500">New challenges every day</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gray-950 border border-gray-900 rounded-2xl px-4 py-3">
              <div className="w-8 h-8 bg-purple-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Trophy size={16} className="text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-semibold">Leaderboard</p>
                <p className="text-xs text-gray-500">See who&apos;s on top today</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="space-y-3">
          <button
            onClick={() => router.push('/login?mode=signup')}
            className="w-full py-4 bg-green-500 hover:bg-green-400 active:scale-95 text-black font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
          >
            Get Started
            <ChevronRight size={20} />
          </button>
          <button
            onClick={() => router.push('/login')}
            className="w-full py-4 bg-gray-950 hover:bg-gray-900 active:scale-95 text-white font-semibold rounded-2xl transition-all border border-gray-800"
          >
            Sign In
          </button>
        </div>

      </div>
    </div>
  )
}
