'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { BottomNav } from '@/app/components/BottomNav'
import { PageTransition } from '@/app/components/PageTransition'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'

type Stats = {
  username: string
  personalDone: number
  groupDone: number
  bestStreak: number
  groupCount: number
}

const SPRING = { type: 'spring' as const, stiffness: 300, damping: 26 }

const BADGES = [
  { emoji: '🔥', name: 'First Flame',   desc: 'Complete your first habit',      check: (s: Stats) => s.personalDone >= 1 },
  { emoji: '⚡', name: 'Week Warrior',   desc: '7-day streak on any habit',      check: (s: Stats) => s.bestStreak >= 7 },
  { emoji: '👥', name: 'Team Player',    desc: 'Complete 50 group habits',       check: (s: Stats) => s.groupDone >= 50 },
  { emoji: '💯', name: 'Century Club',   desc: 'Complete 100 personal habits',   check: (s: Stats) => s.personalDone >= 100 },
  { emoji: '💎', name: 'Diamond Mind',   desc: '30-day streak on any habit',     check: (s: Stats) => s.bestStreak >= 30 },
  { emoji: '🌟', name: 'Legend',         desc: '500 total habits completed',     check: (s: Stats) => (s.personalDone + s.groupDone) >= 500 },
]

function fmtXP(xp: number) {
  if (xp >= 1000) return `${(xp / 1000).toFixed(xp >= 10000 ? 0 : 1)}k`
  return `${xp}`
}

function initials(name: string) {
  return name.slice(0, 2).toUpperCase() || '??'
}

export default function ProfilePage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [newBadges, setNewBadges] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [
        { data: profile },
        { count: personalTotal },
        { count: groupTotal },
        { data: streakRows },
        { count: groupCount },
      ] = await Promise.all([
        supabase.from('profiles').select('username').eq('id', user.id).single(),
        supabase.from('habit_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('group_habit_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('streaks').select('longest_streak').eq('user_id', user.id),
        supabase.from('group_members').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      ])

      const personalDone = personalTotal ?? 0
      const groupDone = groupTotal ?? 0
      const bestStreak = Math.max(0, ...((streakRows || []).map(s => s.longest_streak ?? 0)))
      const computed: Stats = {
        username: profile?.username || 'Adventurer',
        personalDone,
        groupDone,
        bestStreak,
        groupCount: groupCount ?? 0,
      }
      setStats(computed)

      // Detect newly earned badges
      const earned = new Set(BADGES.filter(b => b.check(computed)).map(b => b.name))
      const seen = new Set<string>(JSON.parse(localStorage.getItem('seen_badges') || '[]'))
      const fresh = new Set([...earned].filter(n => !seen.has(n)))
      setNewBadges(fresh)
      localStorage.setItem('seen_badges', JSON.stringify([...earned]))
      if (fresh.size > 0) {
        setTimeout(() => {
          confetti({ particleCount: 90, spread: 80, origin: { y: 0.55 }, colors: ['#fbbf24', '#f59e0b', '#fde68a', '#fff'] })
        }, 350)
      }

      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const BG = 'linear-gradient(160deg, #0b2535 0%, #0d1830 25%, #0a0c1e 60%, #07080f 100%)'
  const STAR = { backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.85) 1px, transparent 1px)', backgroundSize: '55px 55px', opacity: 0.07 }

  if (loading) return (
    <div className="min-h-screen text-white relative" style={{ background: BG }}>
      <div className="fixed inset-0 pointer-events-none" style={STAR} />
      <div className="max-w-md mx-auto px-5 pt-12 pb-36 relative z-10 flex flex-col items-center gap-6 animate-pulse">
        <div className="w-24 h-24 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="h-6 w-40 rounded-xl" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="grid grid-cols-2 gap-3 w-full">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-20 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3 w-full">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-24 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
          ))}
        </div>
      </div>
    </div>
  )

  if (!stats) return null

  const totalDone = stats.personalDone + stats.groupDone
  const totalXP = totalDone * 10
  const earnedCount = BADGES.filter(b => b.check(stats)).length

  return (
    <div className="min-h-screen text-white relative" style={{ background: BG }}>
      <div className="fixed inset-0 pointer-events-none" style={STAR} />

      <PageTransition>
        <div className="max-w-md mx-auto px-5 pt-12 pb-36 relative z-10">

          {/* Avatar + Username */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={SPRING}
            className="flex flex-col items-center mb-8"
          >
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold mb-3 select-none"
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                boxShadow: '0 0 32px rgba(139,92,246,0.35)',
              }}
            >
              {initials(stats.username)}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{stats.username}</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {earnedCount}/{BADGES.length} badges earned
            </p>
          </motion.div>

          {/* Stats grid */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.06 }}
            className="grid grid-cols-2 gap-3 mb-6"
          >
            {[
              { label: 'Total XP',     value: fmtXP(totalXP),          sub: `${totalDone} completions`,  color: '#facc15' },
              { label: 'Best Streak',  value: `${stats.bestStreak}d`,   sub: 'consecutive days',          color: '#f97316' },
              { label: 'Personal',     value: `${stats.personalDone}`,  sub: 'habits completed',          color: '#4ade80' },
              { label: 'Groups',       value: `${stats.groupCount}`,    sub: 'groups joined',             color: '#60a5fa' },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...SPRING, delay: 0.08 + i * 0.04 }}
                className="rounded-2xl p-4 flex flex-col gap-1"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.09)',
                }}
              >
                <p className="text-gray-500 text-xs font-medium">{item.label}</p>
                <p className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</p>
                <p className="text-gray-600 text-xs">{item.sub}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Badges */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.22 }}
          >
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">Achievements</p>
            <div className="grid grid-cols-3 gap-3">
              {BADGES.map((badge, i) => {
                const earned = badge.check(stats)
                const isNew  = newBadges.has(badge.name)
                return (
                  <motion.div
                    key={badge.name}
                    initial={{ opacity: 0, scale: isNew ? 0.5 : 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={isNew
                      ? { type: 'spring', stiffness: 500, damping: 16, delay: 0.3 + i * 0.05 }
                      : { ...SPRING, delay: 0.26 + i * 0.05 }
                    }
                    className="relative rounded-2xl p-3 flex flex-col items-center text-center gap-1"
                    style={{
                      background: earned ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
                      border: isNew ? '1px solid rgba(251,191,36,0.6)' : earned ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.06)',
                      boxShadow: isNew ? '0 0 20px rgba(251,191,36,0.25)' : 'none',
                      filter: earned ? 'none' : 'grayscale(1)',
                      opacity: earned ? 1 : 0.45,
                    }}
                  >
                    {/* Unlock ring pulse */}
                    <AnimatePresence>
                      {isNew && (
                        <motion.div
                          className="absolute inset-0 rounded-2xl pointer-events-none"
                          initial={{ opacity: 0.8, scale: 1 }}
                          animate={{ opacity: 0, scale: 1.35 }}
                          exit={{}}
                          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.35 + i * 0.05 }}
                          style={{ border: '2px solid rgba(251,191,36,0.7)' }}
                        />
                      )}
                    </AnimatePresence>
                    <span className="text-3xl leading-none">{badge.emoji}</span>
                    <p className="text-white text-xs font-bold leading-tight mt-1">{badge.name}</p>
                    <p className="text-gray-500 text-[10px] leading-tight">{badge.desc}</p>
                    {isNew && (
                      <span className="text-yellow-400 text-[9px] font-bold uppercase tracking-wide">New!</span>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </motion.div>

          {/* Group habits stat */}
          {stats.groupDone > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.5 }}
              className="mt-6 rounded-2xl px-4 py-3 flex items-center justify-between"
              style={{
                background: 'rgba(59,130,246,0.08)',
                border: '1px solid rgba(59,130,246,0.2)',
              }}
            >
              <div>
                <p className="text-blue-300 text-sm font-semibold">Group habits done</p>
                <p className="text-gray-500 text-xs">Completed with your teams</p>
              </div>
              <p className="text-blue-400 text-2xl font-bold">{stats.groupDone}</p>
            </motion.div>
          )}

        </div>
      </PageTransition>

      <BottomNav />
    </div>
  )
}
