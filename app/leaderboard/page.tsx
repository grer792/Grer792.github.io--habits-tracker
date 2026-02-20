'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { BottomNav } from '@/app/components/BottomNav'
import { getIcon } from '@/lib/icons'

type GlobalEntry = {
  user_id: string
  current_streak: number
  longest_streak: number
  profiles: { username: string } | null
  habits: { name: string; icon: string } | null
}

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

const medals = ['🥇', '🥈', '🥉']
const TODAY = new Date().toISOString().split('T')[0]

export default function LeaderboardPage() {
  const [global, setGlobal] = useState<GlobalEntry[]>([])
  const [groupBoards, setGroupBoards] = useState<GroupBoard[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: globalData } = await supabase
        .from('streaks')
        .select('user_id, current_streak, longest_streak, profiles(username), habits(name, icon)')
        .gt('current_streak', 0)
        .order('current_streak', { ascending: false })
        .limit(50)

      setGlobal((globalData as unknown as GlobalEntry[]) || [])

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

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-md mx-auto px-5 pt-12 pb-36">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Leaderboard</h1>
          <p className="text-gray-500 mt-1 text-sm">Who&apos;s on top?</p>
        </div>

        {/* Global */}
        <section className="mb-10">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-3">🏆 Global Streaks</p>
          {global.length === 0 ? (
            <p className="text-gray-700 text-center py-8">No streaks yet — keep tracking!</p>
          ) : (
            <div className="space-y-2">
              {global.map((entry, i) => {
                const Icon = entry.habits?.icon ? getIcon(entry.habits.icon) : null
                return (
                  <div key={`${entry.user_id}-${i}`} className={`flex items-center gap-3 p-4 rounded-2xl border ${
                    i === 0 ? 'bg-yellow-950/50 border-yellow-900' :
                    i === 1 ? 'bg-gray-900 border-gray-800' :
                    i === 2 ? 'bg-orange-950/50 border-orange-900' :
                    'bg-gray-950 border-gray-900'
                  }`}>
                    <span className="text-xl w-8 text-center">{medals[i] ?? `#${i + 1}`}</span>
                    {Icon && <Icon size={18} className="text-gray-500 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{entry.profiles?.username ?? 'Unknown'}</p>
                      <p className="text-gray-500 text-xs truncate">{entry.habits?.name ?? ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-orange-400 font-bold">🔥 {entry.current_streak}</p>
                      <p className="text-gray-600 text-xs">best {entry.longest_streak}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Group leaderboards */}
        {groupBoards.map(board => {
          const GroupIcon = getIcon(board.icon)
          return (
            <section key={board.id} className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <GroupIcon size={16} className="text-blue-400" />
                <p className="text-blue-300 text-xs font-medium uppercase tracking-wider">{board.name}</p>
              </div>
              <div className="space-y-2">
                {board.members.map((member, i) => (
                  <div key={member.user_id} className={`flex items-center gap-3 p-4 rounded-2xl border ${
                    i === 0 && member.completedToday > 0 ? 'bg-blue-950/50 border-blue-900' : 'bg-gray-950 border-gray-900'
                  }`}>
                    <span className="text-xl w-8 text-center">
                      {member.completedToday > 0 && medals[i] ? medals[i] : `#${i + 1}`}
                    </span>
                    <p className="flex-1 font-semibold text-blue-100">{member.username}</p>
                    <div className="text-right">
                      <p className={`font-bold text-sm ${member.completedToday > 0 ? 'text-blue-300' : 'text-gray-700'}`}>
                        {member.completedToday}/{member.totalHabits}
                      </p>
                      {member.totalHabits > 0 && (
                        <div className="flex gap-0.5 justify-end mt-1">
                          {Array.from({ length: Math.min(member.totalHabits, 8) }).map((_, j) => (
                            <div key={j} className={`w-2 h-2 rounded-full ${j < member.completedToday ? 'bg-blue-400' : 'bg-gray-800'}`} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        })}

        <button onClick={logout} className="w-full py-3 text-gray-700 hover:text-red-400 transition text-sm mt-4">
          Sign out
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
