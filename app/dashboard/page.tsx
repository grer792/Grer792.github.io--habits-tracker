'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Check, X, Trash2, LogOut, Users } from 'lucide-react'
import { BottomNav } from '@/app/components/BottomNav'
import { ICONS, getIcon } from '@/lib/icons'
import confetti from 'canvas-confetti'

function playCompletionSound() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(523.25, ctx.currentTime)
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08)
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.18)
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.45)
  } catch { /* ignore */ }
}

function triggerEffects(isGroup: boolean) {
  if (typeof window === 'undefined') return
  if (localStorage.getItem('sound') !== 'false') playCompletionSound()
  if (localStorage.getItem('vibration') !== 'false') navigator.vibrate?.(50)
  if (localStorage.getItem('confetti') !== 'false') {
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
      colors: isGroup
        ? ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe']
        : ['#22c55e', '#4ade80', '#86efac', '#bbf7d0'],
    })
  }
}

type Habit         = { id: string; name: string; icon: string }
type HabitLog      = { habit_id: string; completed_at: string }
type Group         = { id: string; name: string; owner_id: string; code: string; icon: string }
type GroupHabit    = { id: string; group_id: string; name: string }
type GroupHabitLog = { group_habit_id: string; completed_at: string }

function streakFor(id: string, logs: { completed_at: string; [k: string]: string }[], key: string): number {
  const dates = new Set(logs.filter(l => l[key] === id).map(l => l.completed_at))
  let n = 0; const d = new Date()
  while (dates.has(d.toISOString().split('T')[0])) { n++; d.setDate(d.getDate() - 1) }
  return n
}

const TODAY_LABEL = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
const TODAY       = new Date().toISOString().split('T')[0]
const genCode     = () => Math.floor(100000 + Math.random() * 900000).toString()

export default function DashboardPage() {
  const [habits, setHabits]       = useState<Habit[]>([])
  const [logs, setLogs]           = useState<HabitLog[]>([])
  const [groups, setGroups]       = useState<Group[]>([])
  const [gHabits, setGHabits]     = useState<GroupHabit[]>([])
  const [gLogs, setGLogs]         = useState<GroupHabitLog[]>([])
  const [userId, setUserId]       = useState<string | null>(null)
  const [username, setUsername]   = useState('')
  const [loading, setLoading]     = useState(true)
  const [gHabitInputs, setGHabitInputs] = useState<Record<string, string>>({})

  // Modals
  const [showAdd, setShowAdd]         = useState(false)
  const [showGroups, setShowGroups]   = useState(false)
  const [groupTab, setGroupTab]       = useState<'create' | 'join'>('create')
  const [newHabitName, setNewHabitName]     = useState('')
  const [newHabitIcon, setNewHabitIcon]     = useState('Star')
  const [newGroupName, setNewGroupName]     = useState('')
  const [newGroupIcon, setNewGroupIcon]     = useState('Users')
  const [joinCode, setJoinCode]             = useState('')
  const [joinError, setJoinError]           = useState('')
  const [createError, setCreateError]       = useState('')

  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const [
        { data: habitsData },
        { data: logsData },
        { data: profile },
        { data: memberRows },
      ] = await Promise.all([
        supabase.from('habits').select('id,name,icon').eq('user_id', user.id).order('created_at'),
        supabase.from('habit_logs').select('habit_id,completed_at').eq('user_id', user.id),
        supabase.from('profiles').select('username').eq('id', user.id).single(),
        supabase.from('group_members').select('group_id, groups(id,name,owner_id,code,icon)').eq('user_id', user.id),
      ])

      setHabits(habitsData || [])
      setLogs(logsData || [])
      setUsername(profile?.username || '')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const loaded = (memberRows || []).map((r: any) => r.groups).filter(Boolean) as Group[]
      setGroups(loaded)

      if (loaded.length > 0) {
        const ids = loaded.map(g => g.id)
        const [{ data: gh }, { data: gl }] = await Promise.all([
          supabase.from('group_habits').select('*').in('group_id', ids).order('created_at'),
          supabase.from('group_habit_logs').select('group_habit_id,completed_at').eq('user_id', user.id),
        ])
        setGHabits(gh || [])
        setGLogs(gl || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  // ── Personal habits ────────────────────────────────────────────────────────
  async function addHabit() {
    if (!newHabitName.trim() || !userId) return
    const { data } = await supabase.from('habits')
      .insert({ user_id: userId, name: newHabitName.trim(), icon: newHabitIcon })
      .select('id,name,icon').single()
    if (data) { setHabits(p => [...p, data]); setNewHabitName(''); setNewHabitIcon('Star'); setShowAdd(false) }
  }

  async function toggleHabit(habitId: string) {
    if (!userId) return
    const done = logs.some(l => l.habit_id === habitId && l.completed_at === TODAY)
    let next: HabitLog[]
    if (done) {
      await supabase.from('habit_logs').delete().eq('habit_id', habitId).eq('completed_at', TODAY)
      next = logs.filter(l => !(l.habit_id === habitId && l.completed_at === TODAY))
    } else {
      await supabase.from('habit_logs').insert({ habit_id: habitId, user_id: userId, completed_at: TODAY })
      next = [...logs, { habit_id: habitId, completed_at: TODAY }]
      triggerEffects(false)
    }
    setLogs(next)
    const streak = streakFor(habitId, next as { habit_id: string; completed_at: string }[], 'habit_id')
    const { data: ex } = await supabase.from('streaks').select('longest_streak').eq('user_id', userId).eq('habit_id', habitId).single()
    await supabase.from('streaks').upsert(
      { user_id: userId, habit_id: habitId, current_streak: streak, longest_streak: Math.max(streak, ex?.longest_streak || 0) },
      { onConflict: 'user_id,habit_id' }
    )
  }

  async function deleteHabit(habitId: string) {
    await supabase.from('habits').delete().eq('id', habitId)
    setHabits(p => p.filter(h => h.id !== habitId))
    setLogs(p => p.filter(l => l.habit_id !== habitId))
  }

  // ── Groups ─────────────────────────────────────────────────────────────────
  async function createGroup() {
    if (!newGroupName.trim() || !userId) return
    setCreateError('')
    const code = genCode()
    const { data: group, error: err } = await supabase.from('groups')
      .insert({ name: newGroupName.trim(), owner_id: userId, code, icon: newGroupIcon }).select().single()
    if (err) { setCreateError(err.message); return }
    await supabase.from('group_members').insert({ group_id: group.id, user_id: userId })
    setGroups(p => [...p, group])
    setNewGroupName(''); setNewGroupIcon('Users')
    setShowGroups(false)
  }

  async function joinGroup() {
    const code = joinCode.trim()
    if (code.length < 6 || !userId) return
    setJoinError('')
    const { data: group, error: err } = await supabase.from('groups').select('*').eq('code', code).single()
    if (err || !group) { setJoinError('Group not found. Check the code.'); return }
    if (groups.find(g => g.id === group.id)) { setJoinError('You are already in this group.'); return }
    const { error: joinErr } = await supabase.from('group_members').insert({ group_id: group.id, user_id: userId })
    if (joinErr) { setJoinError(joinErr.message); return }
    const { data: gh } = await supabase.from('group_habits').select('*').eq('group_id', group.id)
    setGroups(p => [...p, group])
    setGHabits(p => [...p, ...(gh || [])])
    setJoinCode('')
    setShowGroups(false)
  }

  async function leaveGroup(groupId: string) {
    if (!userId) return
    await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId)
    const ids = gHabits.filter(h => h.group_id === groupId).map(h => h.id)
    setGroups(p => p.filter(g => g.id !== groupId))
    setGHabits(p => p.filter(h => h.group_id !== groupId))
    setGLogs(p => p.filter(l => !ids.includes(l.group_habit_id)))
  }

  async function addGroupHabit(groupId: string) {
    const name = gHabitInputs[groupId]?.trim()
    if (!name) return
    const { data, error: err } = await supabase.from('group_habits').insert({ group_id: groupId, name }).select().single()
    if (err || !data) return
    setGHabits(p => [...p, data])
    setGHabitInputs(p => ({ ...p, [groupId]: '' }))
  }

  async function toggleGroupHabit(habitId: string) {
    if (!userId) return
    const done = gLogs.some(l => l.group_habit_id === habitId && l.completed_at === TODAY)
    if (done) {
      await supabase.from('group_habit_logs').delete().eq('group_habit_id', habitId).eq('user_id', userId).eq('completed_at', TODAY)
      setGLogs(p => p.filter(l => !(l.group_habit_id === habitId && l.completed_at === TODAY)))
    } else {
      const { error } = await supabase.from('group_habit_logs').insert({ group_habit_id: habitId, user_id: userId, completed_at: TODAY })
      if (!error) {
        setGLogs(p => [...p, { group_habit_id: habitId, completed_at: TODAY }])
        triggerEffects(true)
      }
    }
  }

  async function deleteGroupHabit(habitId: string) {
    await supabase.from('group_habits').delete().eq('id', habitId)
    setGHabits(p => p.filter(h => h.id !== habitId))
    setGLogs(p => p.filter(l => l.group_habit_id !== habitId))
  }

  function openGroups(tab: 'create' | 'join') {
    setGroupTab(tab)
    setJoinCode(''); setJoinError(''); setCreateError('')
    setShowGroups(true)
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-md mx-auto px-5 pt-12 pb-36">

        {/* Header */}
        <div className="relative text-center mb-8">
          <h1 className="text-3xl font-bold">Daily Habits</h1>
          <p className="text-gray-500 mt-1 text-sm">Hey {username} · {TODAY_LABEL}</p>
          {/* Groups icon — top right */}
          <button
            onClick={() => openGroups('join')}
            className="absolute right-0 top-1 text-gray-600 hover:text-white transition p-1"
            title="Groups"
          >
            <Users size={22} />
          </button>
        </div>

        {/* ── Personal habits ── */}
        <div className="divide-y divide-gray-900">
          {habits.length === 0 && groups.length === 0 && (
            <p className="text-gray-600 text-center py-12">No habits yet — tap + to add one</p>
          )}
          {habits.map(habit => {
            const done   = logs.some(l => l.habit_id === habit.id && l.completed_at === TODAY)
            const streak = streakFor(habit.id, logs as { habit_id: string; completed_at: string }[], 'habit_id')
            const Icon   = getIcon(habit.icon || 'Star')
            return (
              <div key={habit.id} className="flex items-center gap-4 py-4 group">
                <Icon size={22} className={done ? 'text-green-400' : 'text-gray-600'} />
                <span className={`flex-1 font-semibold text-lg ${done ? 'text-gray-600 line-through' : 'text-white'}`}>
                  {habit.name}
                </span>
                {streak > 0 && <span className="text-orange-400 text-xs font-semibold">🔥{streak}</span>}
                <button onClick={() => deleteHabit(habit.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-700 hover:text-red-500 mr-1">
                  <Trash2 size={15} />
                </button>
                <button
                  onClick={() => toggleHabit(habit.id)}
                  className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center transition-all active:scale-90 ${done ? 'bg-green-500 shadow-lg shadow-green-500/25' : 'border-2 border-gray-800'}`}
                >
                  {done && <Check size={22} className="text-black" strokeWidth={3} />}
                </button>
              </div>
            )
          })}
        </div>

        {/* ── Group sections ── */}
        {groups.map(group => {
          const habits  = gHabits.filter(h => h.group_id === group.id)
          const isOwner = group.owner_id === userId
          const GroupIcon = getIcon(group.icon || 'Users')
          return (
            <div key={group.id} className="mt-8">
              {/* Group header */}
              <div className="flex items-center gap-2 pb-2 mb-1 border-b border-gray-900">
                <GroupIcon size={16} className="text-blue-400 flex-shrink-0" />
                <span className="text-blue-300 font-semibold flex-1">{group.name}</span>
                <span className="font-mono text-xs text-gray-700 bg-gray-900 px-2 py-0.5 rounded tracking-widest">{group.code}</span>
                {!isOwner && (
                  <button onClick={() => leaveGroup(group.id)} className="text-gray-700 hover:text-red-400 transition ml-1" title="Leave group">
                    <LogOut size={14} />
                  </button>
                )}
              </div>

              {/* Habits */}
              <div className="divide-y divide-gray-900/50">
                {habits.length === 0 && (
                  <p className="text-gray-700 text-sm py-3">{isOwner ? 'Add habits below.' : 'No habits yet.'}</p>
                )}
                {habits.map(habit => {
                  const done   = gLogs.some(l => l.group_habit_id === habit.id && l.completed_at === TODAY)
                  const streak = streakFor(habit.id, gLogs as { group_habit_id: string; completed_at: string }[], 'group_habit_id')
                  return (
                    <div key={habit.id} className="flex items-center gap-4 py-3 group">
                      <span className={`flex-1 font-medium ${done ? 'text-gray-600 line-through' : 'text-blue-100'}`}>
                        {habit.name}
                      </span>
                      {streak > 0 && <span className="text-orange-400 text-xs font-semibold">🔥{streak}</span>}
                      {isOwner && (
                        <button onClick={() => deleteGroupHabit(habit.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-700 hover:text-red-400 mr-1">
                          <Trash2 size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => toggleGroupHabit(habit.id)}
                        className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center transition-all active:scale-90 ${done ? 'bg-blue-500 shadow-md shadow-blue-500/30' : 'border-2 border-gray-800'}`}
                      >
                        {done && <Check size={18} className="text-black" strokeWidth={3} />}
                      </button>
                    </div>
                  )
                })}
              </div>

              {isOwner && (
                <div className="flex gap-2 mt-2">
                  <input
                    value={gHabitInputs[group.id] || ''}
                    onChange={e => setGHabitInputs(p => ({ ...p, [group.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addGroupHabit(group.id)}
                    placeholder="Add habit to group..."
                    className="flex-1 px-3 py-2 bg-gray-950 text-white rounded-xl border border-gray-900 focus:outline-none focus:border-blue-500 placeholder-gray-700 text-sm"
                  />
                  <button onClick={() => addGroupHabit(group.id)} className="px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded-xl text-sm font-semibold transition">
                    Add
                  </button>
                </div>
              )}
            </div>
          )
        })}

      </div>

      <BottomNav onAdd={() => setShowAdd(true)} />

      {/* ── Add habit modal ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setShowAdd(false) }}>
          <div className="bg-gray-950 rounded-t-3xl w-full max-w-md p-6 pb-12 border-t border-gray-800">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold">New Habit</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-600 hover:text-white"><X size={22} /></button>
            </div>
            <input
              autoFocus value={newHabitName} onChange={e => setNewHabitName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addHabit()}
              placeholder="Habit name..."
              className="w-full px-4 py-3 bg-gray-900 text-white rounded-xl border border-gray-800 focus:outline-none focus:border-green-500 placeholder-gray-600 mb-5 text-lg"
            />
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-3">Choose icon</p>
            <div className="grid grid-cols-6 gap-2 mb-6 max-h-44 overflow-y-auto pr-1">
              {ICONS.map(({ name, component: Icon }) => (
                <button key={name} type="button" onClick={() => setNewHabitIcon(name)}
                  className={`aspect-square rounded-xl flex items-center justify-center transition-all active:scale-90 ${newHabitIcon === name ? 'bg-green-500 text-black' : 'bg-gray-900 text-gray-500 hover:bg-gray-800 hover:text-white border border-gray-800'}`}>
                  <Icon size={20} />
                </button>
              ))}
            </div>
            <button onClick={addHabit} disabled={!newHabitName.trim()}
              className="w-full py-4 bg-green-500 hover:bg-green-400 disabled:bg-gray-900 disabled:text-gray-600 text-black font-bold rounded-2xl transition-all active:scale-95 text-lg">
              Add Habit
            </button>
          </div>
        </div>
      )}

      {/* ── Groups modal (Create / Join) ── */}
      {showGroups && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setShowGroups(false) }}>
          <div className="bg-gray-950 rounded-t-3xl w-full max-w-md p-6 pb-12 border-t border-gray-800">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold">Groups</h3>
              <button onClick={() => setShowGroups(false)} className="text-gray-600 hover:text-white"><X size={22} /></button>
            </div>

            {/* Tab switcher */}
            <div className="flex bg-gray-900 rounded-xl p-1 mb-6">
              <button
                onClick={() => setGroupTab('create')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${groupTab === 'create' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
              >
                Create Group
              </button>
              <button
                onClick={() => setGroupTab('join')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${groupTab === 'join' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
              >
                Join Group
              </button>
            </div>

            {/* Create */}
            {groupTab === 'create' && (
              <div className="space-y-4">
                <input
                  autoFocus value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createGroup()}
                  placeholder="Group name..."
                  className="w-full px-4 py-3 bg-gray-900 text-white rounded-xl border border-gray-800 focus:outline-none focus:border-blue-500 placeholder-gray-600 text-lg"
                />
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Choose icon</p>
                <div className="grid grid-cols-6 gap-2 max-h-44 overflow-y-auto pr-1">
                  {ICONS.map(({ name, component: Icon }) => (
                    <button key={name} type="button" onClick={() => setNewGroupIcon(name)}
                      className={`aspect-square rounded-xl flex items-center justify-center transition-all active:scale-90 ${newGroupIcon === name ? 'bg-blue-500 text-black' : 'bg-gray-900 text-gray-500 hover:bg-gray-800 hover:text-white border border-gray-800'}`}>
                      <Icon size={20} />
                    </button>
                  ))}
                </div>
                {createError && <p className="text-red-400 text-sm">{createError}</p>}
                <button onClick={createGroup} disabled={!newGroupName.trim()}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-900 disabled:text-gray-600 text-white font-bold rounded-2xl transition-all active:scale-95 text-lg">
                  Create
                </button>
              </div>
            )}

            {/* Join */}
            {groupTab === 'join' && (
              <div className="space-y-4">
                <p className="text-gray-400 text-sm text-center">Enter the 6-digit code from your friend</p>
                <input
                  autoFocus value={joinCode}
                  onChange={e => { setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setJoinError('') }}
                  onKeyDown={e => e.key === 'Enter' && joinGroup()}
                  placeholder="000000"
                  maxLength={6}
                  inputMode="numeric"
                  className="w-full px-4 py-4 bg-gray-900 text-white rounded-xl border border-gray-800 focus:outline-none focus:border-blue-500 placeholder-gray-700 font-mono tracking-[0.5em] text-center text-3xl"
                />
                {joinError && <p className="text-red-400 text-sm text-center">{joinError}</p>}
                <button onClick={joinGroup} disabled={joinCode.length < 6}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-900 disabled:text-gray-600 text-white font-bold rounded-2xl transition-all active:scale-95 text-lg">
                  Join
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}
