'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { BottomNav } from '@/app/components/BottomNav'
import { getIcon } from '@/lib/icons'

type GroupMember = {
  user_id: string
  username: string
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

function PodiumCard({ member, place }: { member: GroupMember; place: number }) {
  const c = PODIUM[place]
  const pct = member.totalHabits > 0 ? Math.round((member.completedToday / member.totalHabits) * 100) : 0
  return (
    <div
      className="rounded-2xl p-4 flex flex-col items-center gap-2 text-center"
      style={{ background: c.bg, backdropFilter: 'blur(10px)', border: `1.5px solid ${c.border}`, boxShadow: c.glow }}
    >
      <span className="text-3xl">{c.medal}</span>
      <p className="font-bold text-white text-sm leading-tight w-full truncate">{member.username}</p>
      <p className={`text-xs font-semibold ${c.score}`}>{member.completedToday}/{member.totalHabits}</p>
      {member.totalHabits > 0 && (
        <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.bar }} />
        </div>
      )}
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
        let todayLogs: { user_id: string; group_habit_id: string }[] = []
        if (allHabitIds.length > 0) {
          const { data } = await supabase
            .from('group_habit_logs').select('user_id, group_habit_id')
            .in('group_habit_id', allHabitIds).eq('completed_at', TODAY)
          todayLogs = data || []
        }

        const boards: GroupBoard[] = userGroups.map(group => {
          const habitIds = (allGroupHabits || []).filter(h => h.group_id === group.id).map(h => h.id)
          const groupLogs = todayLogs.filter(l => habitIds.includes(l.group_habit_id))
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const members: GroupMember[] = ((allMembers || []) as any[])
            .filter(m => m.group_id === group.id)
            .map(m => ({
              user_id: m.user_id,
              username: m.profiles?.username || 'Unknown',
              completedToday: groupLogs.filter(l => l.user_id === m.user_id).length,
              totalHabits: habitIds.length,
            }))
            .sort((a, b) => b.completedToday - a.completedToday)
          return { id: group.id, name: group.name, icon: group.icon || 'Users', members }
        })
        setGroupBoards(boards)
      }

      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div
      className="min-h-screen flex items-center justify-center text-white"
      style={{ background: 'linear-gradient(160deg, #0b2030 0%, #0e1a35 30%, #07080f 100%)' }}
    >
      Loading...
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

      <div className="max-w-md mx-auto px-5 pt-12 pb-36 relative z-10">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-3xl">🏆</span>
            <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
          </div>
          <p className="text-gray-500 text-sm">Who&apos;s on top today?</p>
        </div>

        {groupBoards.length === 0 && (
          <p className="text-gray-600 text-center py-16">Join a group to see rankings</p>
        )}

        {/* Per-group boards */}
        {groupBoards.map(board => {
          const GroupIcon = getIcon(board.icon)
          const first    = board.members[0]
          const silver   = board.members[1]
          const bronze   = board.members[2]
          const rest     = board.members.slice(3)

          return (
            <section key={board.id} className="mb-10">

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
                    <p className="text-yellow-400 text-sm font-semibold mt-0.5">
                      {first.completedToday}/{first.totalHabits} completed
                    </p>
                    {first.totalHabits > 0 && (
                      <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.round((first.completedToday / first.totalHabits) * 100)}%`,
                            background: 'linear-gradient(to right, #fbbf24, #f59e0b)',
                          }}
                        />
                      </div>
                    )}
                  </div>
                  {first.completedToday > 0 && (
                    <span className="text-yellow-300 text-2xl select-none flex-shrink-0">✦</span>
                  )}
                </div>
              )}

              {/* 2nd and 3rd — side by side */}
              {(silver || bronze) && (
                <div className={`grid gap-3 mb-3 ${silver && bronze ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {silver && <PodiumCard member={silver} place={1} />}
                  {bronze && <PodiumCard member={bronze} place={2} />}
                </div>
              )}

              {/* 4th+ — compact rows */}
              {rest.length > 0 && (
                <div className="space-y-2">
                  {rest.map((member, i) => {
                    const pct = member.totalHabits > 0 ? Math.round((member.completedToday / member.totalHabits) * 100) : 0
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
                          {member.totalHabits > 0 && (
                            <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${pct}%`, background: 'linear-gradient(to right, #3b82f6, #8b5cf6)' }}
                              />
                            </div>
                          )}
                          <p className="text-gray-500 text-xs font-semibold">
                            {member.completedToday}/{member.totalHabits}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

            </section>
          )
        })}

      </div>

      <BottomNav />
    </div>
  )
}
