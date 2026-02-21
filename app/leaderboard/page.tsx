'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { BottomNav } from '@/app/components/BottomNav'
import { PageTransition } from '@/app/components/PageTransition'
import { SkeletonLeaderboard } from '@/app/components/SkeletonCard'
import { getIcon } from '@/lib/icons'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Compass } from 'lucide-react'

type GroupMember = {
  user_id: string
  username: string
  xp: number            // all-time completions × 10
  completedToday: number
  totalHabits: number
}

type GroupBoard = {
  id: string
  name: string
  icon: string
  members: GroupMember[]
}

const TODAY = new Date().toISOString().split('T')[0]

const XP_PER_HABIT = 10

const PODIUM = [
  {
    medal: '🥇',
    border: 'rgba(251,191,36,0.55)',
    glow: '0 0 28px rgba(251,191,36,0.25)',
    bg: 'rgba(251,191,36,0.08)',
    bar: 'linear-gradient(to right, #fbbf24, #f59e0b)',
    score: 'text-yellow-400',
  },
  {
    medal: '🥈',
    border: 'rgba(156,163,175,0.45)',
    glow: '0 0 16px rgba(156,163,175,0.15)',
    bg: 'rgba(156,163,175,0.06)',
    bar: 'linear-gradient(to right, #9ca3af, #6b7280)',
    score: 'text-gray-300',
  },
  {
    medal: '🥉',
    border: 'rgba(180,120,60,0.45)',
    glow: '0 0 16px rgba(180,120,60,0.15)',
    bg: 'rgba(180,120,60,0.06)',
    bar: 'linear-gradient(to right, #d97706, #b45309)',
    score: 'text-orange-400',
  },
]

function fmtXP(xp: number) {
  if (xp >= 1000) return `${(xp / 1000).toFixed(xp >= 10000 ? 0 : 1)}k`
  return `${xp}`
}

function PodiumCard({ member, place, maxXp }: { member: GroupMember; place: number; maxXp: number }) {
  const c = PODIUM[place]
  const xpPct = maxXp > 0 ? Math.round((member.xp / maxXp) * 100) : 0
  const todayDone = member.totalHabits > 0 && member.completedToday === member.totalHabits
  return (
    <div
      className="rounded-2xl p-4 flex flex-col items-center gap-2 text-center"
      style={{ background: c.bg, backdropFilter: 'blur(10px)', border: `1.5px solid ${c.border}`, boxShadow: c.glow }}
    >
      <span className="text-3xl">{c.medal}</span>
      <p className="font-bold text-white text-sm leading-tight w-full truncate">{member.username}</p>
      <p className={`text-lg font-bold ${c.score}`}>{fmtXP(member.xp)} <span className="text-xs font-semibold opacity-70">XP</span></p>
      {member.totalHabits > 0 && (
        <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div className="h-full rounded-full" style={{ width: `${xpPct}%`, background: c.bar }} />
        </div>
      )}
      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
        {todayDone ? '✓ all done today' : `${member.completedToday}/${member.totalHabits} today`}
      </p>
    </div>
  )
}

export default function LeaderboardPage() {
  const [groupBoards, setGroupBoards] = useState<GroupBoard[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: memberRows } = await supabase
        .from('group_members').select('group_id, groups(id,name,icon)').eq('user_id', user.id)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userGroups = (memberRows || []).map((r: any) => r.groups).filter(Boolean) as { id: string; name: string; icon: string }[]

      if (userGroups.length > 0) {
        const groupIds = userGroups.map(g => g.id)
        const [{ data: allMembers }, { data: allGroupHabits }] = await Promise.all([
          supabase.from('group_members').select('group_id, user_id, profiles(username)').in('group_id', groupIds),
          supabase.from('group_habits').select('id, group_id').in('group_id', groupIds),
        ])

        const allHabitIds = (allGroupHabits || []).map(h => h.id)

        // Fetch ALL logs (not just today) — one query, filter client-side for today
        let allLogs: { user_id: string; group_habit_id: string; completed_at: string }[] = []
        if (allHabitIds.length > 0) {
          const { data } = await supabase
            .from('group_habit_logs')
            .select('user_id, group_habit_id, completed_at')
            .in('group_habit_id', allHabitIds)
          allLogs = data || []
        }

        const todayLogs = allLogs.filter(l => l.completed_at === TODAY)

        const boards: GroupBoard[] = userGroups.map(group => {
          const habitIds = (allGroupHabits || []).filter(h => h.group_id === group.id).map(h => h.id)
          const groupAllLogs   = allLogs.filter(l => habitIds.includes(l.group_habit_id))
          const groupTodayLogs = todayLogs.filter(l => habitIds.includes(l.group_habit_id))

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const members: GroupMember[] = ((allMembers || []) as any[])
            .filter(m => m.group_id === group.id)
            .map(m => {
              const totalCompletions = groupAllLogs.filter(l => l.user_id === m.user_id).length
              return {
                user_id: m.user_id,
                username: m.profiles?.username || 'Unknown',
                xp: totalCompletions * XP_PER_HABIT,
                completedToday: groupTodayLogs.filter(l => l.user_id === m.user_id).length,
                totalHabits: habitIds.length,
              }
            })
            .sort((a, b) => b.xp - a.xp || b.completedToday - a.completedToday)

          return { id: group.id, name: group.name, icon: group.icon || 'Users', members }
        })
        setGroupBoards(boards)
      }

      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) return (
    <div
      className="min-h-screen text-white relative"
      style={{ background: 'linear-gradient(160deg, #0b2535 0%, #0d1830 25%, #0a0c1e 60%, #07080f 100%)' }}
    >
      <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.85) 1px, transparent 1px)', backgroundSize: '55px 55px', opacity: 0.07 }} />
      <div className="max-w-md mx-auto px-5 pt-12 pb-36 relative z-10">
        <div className="text-center mb-8 animate-pulse">
          <div className="h-9 w-52 rounded-xl mx-auto mb-2" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <div className="h-4 w-36 rounded-lg mx-auto" style={{ background: 'rgba(255,255,255,0.05)' }} />
        </div>
        <SkeletonLeaderboard />
      </div>
    </div>
  )

  return (
    <div
      className="min-h-screen text-white relative"
      style={{ background: 'linear-gradient(160deg, #0b2535 0%, #0d1830 25%, #0a0c1e 60%, #07080f 100%)' }}
    >
      {/* Star field */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.85) 1px, transparent 1px)',
          backgroundSize: '55px 55px',
          opacity: 0.07,
        }}
      />

      <PageTransition>
      <div className="max-w-md mx-auto px-5 pt-12 pb-36 relative z-10">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-3xl">🏆</span>
            <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
          </div>
          <p className="text-gray-500 text-sm">All-time XP · ranked by total habits completed</p>
        </div>

        {/* Empty state */}
        {groupBoards.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.1 }}
            className="flex flex-col items-center text-center py-14 px-4"
          >
            <span className="text-5xl mb-4">🏆</span>
            <h2 className="text-lg font-bold mb-1">No groups yet</h2>
            <p className="text-gray-500 text-sm mb-6">Join or discover a group to compete<br />with friends on the leaderboard</p>
            <Link
              href="/discover"
              className="flex items-center gap-2 px-7 py-3 rounded-2xl font-bold text-white text-sm"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', boxShadow: '0 0 24px rgba(59,130,246,0.3)' }}
            >
              <Compass size={16} />
              Discover Groups
            </Link>
          </motion.div>
        )}

        {/* Per-group boards */}
        {groupBoards.map((board, bi) => {
          const GroupIcon = getIcon(board.icon)
          const first  = board.members[0]
          const silver = board.members[1]
          const bronze = board.members[2]
          const rest   = board.members.slice(3)
          const maxXp  = first?.xp ?? 0

          return (
            <motion.section
              key={board.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26, delay: bi * 0.08 }}
              className="mb-10"
            >
              {/* Group label */}
              <div className="flex items-center gap-2 mb-4">
                <GroupIcon size={15} className="text-blue-400" />
                <p className="text-blue-300 text-xs font-semibold uppercase tracking-wider">{board.name}</p>
                <div className="flex-1 h-px" style={{ background: 'rgba(59,130,246,0.2)' }} />
              </div>

              {/* 1st place — full-width hero card */}
              {first && (
                <div
                  className="rounded-2xl p-5 flex items-center gap-4 mb-3"
                  style={{
                    background: 'rgba(251,191,36,0.08)',
                    backdropFilter: 'blur(12px)',
                    border: '1.5px solid rgba(251,191,36,0.55)',
                    boxShadow: '0 0 32px rgba(251,191,36,0.2)',
                  }}
                >
                  <span className="text-4xl flex-shrink-0">🥇</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-xl truncate">{first.username}</p>
                    <p className="text-yellow-400 text-lg font-bold mt-0.5">
                      {fmtXP(first.xp)} <span className="text-sm font-semibold opacity-70">XP</span>
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {first.completedToday === first.totalHabits && first.totalHabits > 0
                        ? '✓ all done today'
                        : `${first.completedToday}/${first.totalHabits} today`}
                    </p>
                  </div>
                  {first.xp > 0 && (
                    <span className="text-yellow-300 text-2xl select-none flex-shrink-0">✦</span>
                  )}
                </div>
              )}

              {/* 2nd and 3rd — side by side */}
              {(silver || bronze) && (
                <div className={`grid gap-3 mb-3 ${silver && bronze ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {silver && <PodiumCard member={silver} place={1} maxXp={maxXp} />}
                  {bronze && <PodiumCard member={bronze} place={2} maxXp={maxXp} />}
                </div>
              )}

              {/* 4th+ — compact rows */}
              {rest.length > 0 && (
                <div className="space-y-2">
                  {rest.map((member, i) => {
                    const xpPct = maxXp > 0 ? Math.round((member.xp / maxXp) * 100) : 0
                    return (
                      <div
                        key={member.user_id}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          backdropFilter: 'blur(6px)',
                          border: '1px solid rgba(255,255,255,0.07)',
                        }}
                      >
                        <span className="text-gray-500 text-sm font-bold w-6 text-center flex-shrink-0">
                          #{i + 4}
                        </span>
                        <p className="flex-1 font-semibold text-sm text-gray-300 truncate">{member.username}</p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {maxXp > 0 && (
                            <div className="w-14 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${xpPct}%`, background: 'linear-gradient(to right, #3b82f6, #8b5cf6)' }}
                              />
                            </div>
                          )}
                          <p className="text-gray-400 text-xs font-bold w-16 text-right">
                            {fmtXP(member.xp)} XP
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

            </motion.section>
          )
        })}

        {/* Always-visible discover link */}
        <Link
          href="/discover"
          className="flex items-center justify-center gap-2 mt-8 py-3 rounded-2xl text-gray-600 hover:text-gray-400 text-xs font-semibold transition-colors"
          style={{ border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <Compass size={14} />
          Discover public groups
        </Link>

      </div>
      </PageTransition>

      <BottomNav />
    </div>
  )
}
