'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Check, X, Trash2, LogOut, Zap, User, Flame, Compass } from 'lucide-react'
import Link from 'next/link'
import { BottomNav } from '@/app/components/BottomNav'
import { PageTransition } from '@/app/components/PageTransition'
import { SkeletonDashboard } from '@/app/components/SkeletonCard'
import { ICONS, getIcon } from '@/lib/icons'
import confetti from 'canvas-confetti'
import { motion, AnimatePresence } from 'framer-motion'

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

type Habit           = { id: string; name: string; icon: string }
type HabitLog        = { habit_id: string; completed_at: string }
type Group           = { id: string; name: string; owner_id: string; code: string; icon: string; description?: string; is_public?: boolean }
type GroupHabit      = { id: string; group_id: string; name: string }
type GroupHabitLog   = { group_habit_id: string; completed_at: string }
type DailyQuestPlan  = { id: string; day_number: number; name: string; icon: string }
type DailyQuestLog   = { quest_plan_id: string; completed_at: string }

const QUEST_START_MS = new Date('2026-02-21').getTime()

function streakFor(id: string, logs: { completed_at: string; [k: string]: string }[], key: string): number {
  const dates = new Set(logs.filter(l => l[key] === id).map(l => l.completed_at))
  let n = 0; const d = new Date()
  while (dates.has(d.toISOString().split('T')[0])) { n++; d.setDate(d.getDate() - 1) }
  return n
}

const TODAY_LABEL = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
const TODAY       = new Date().toISOString().split('T')[0]
const genCode     = () => Math.floor(100000 + Math.random() * 900000).toString()

const CARD_SPRING = { type: 'spring' as const, stiffness: 320, damping: 26 }
const CHECK_SPRING = { type: 'spring' as const, stiffness: 550, damping: 18 }

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
  const [todayQuests, setTodayQuests]   = useState<DailyQuestPlan[]>([])
  const [questLogs, setQuestLogs]       = useState<DailyQuestLog[]>([])

  // Modals
  const [showAdd, setShowAdd]         = useState(false)
  const [showGroups, setShowGroups]   = useState(false)
  const [groupTab, setGroupTab]       = useState<'create' | 'join'>('create')
  const [newHabitName, setNewHabitName]     = useState('')
  const [newHabitIcon, setNewHabitIcon]     = useState('Star')
  const [newGroupName, setNewGroupName]     = useState('')
  const [newGroupIcon, setNewGroupIcon]     = useState('Users')
  const [newGroupDesc, setNewGroupDesc]     = useState('')
  const [newGroupPublic, setNewGroupPublic] = useState(false)
  const [joinCode, setJoinCode]             = useState('')
  const [joinError, setJoinError]           = useState('')
  const [createError, setCreateError]       = useState('')

  // Spam protection
  const [pending, setPending]     = useState<Set<string>>(new Set())
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining]   = useState(false)

  function addPending(id: string)    { setPending(p => new Set(p).add(id)) }
  function removePending(id: string) { setPending(p => { const n = new Set(p); n.delete(id); return n }) }

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
        { data: qpData },
        { data: qlData },
      ] = await Promise.all([
        supabase.from('habits').select('id,name,icon').eq('user_id', user.id).order('created_at'),
        supabase.from('habit_logs').select('habit_id,completed_at').eq('user_id', user.id),
        supabase.from('profiles').select('username').eq('id', user.id).single(),
        supabase.from('group_members').select('group_id, groups(id,name,owner_id,code,icon,description,is_public)').eq('user_id', user.id),
        supabase.from('daily_quest_plans').select('*').order('day_number'),
        supabase.from('daily_quest_logs').select('quest_plan_id,completed_at').eq('user_id', user.id),
      ])

      setHabits(habitsData || [])
      setLogs(logsData || [])
      setUsername(profile?.username || '')

      const plans = (qpData || []) as DailyQuestPlan[]
      setQuestLogs((qlData || []) as DailyQuestLog[])
      if (plans.length > 0) {
        const maxDay = Math.max(...plans.map(q => q.day_number))
        const todayMs = new Date().setHours(0, 0, 0, 0)
        const daysSince = Math.floor((todayMs - QUEST_START_MS) / 86400000)
        const todayDayNum = (daysSince % maxDay) + 1
        setTodayQuests(plans.filter(q => q.day_number === todayDayNum))
      }

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
    if (!userId || pending.has(habitId)) return
    addPending(habitId)
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
    removePending(habitId)
  }

  async function deleteHabit(habitId: string) {
    await supabase.from('habits').delete().eq('id', habitId)
    setHabits(p => p.filter(h => h.id !== habitId))
    setLogs(p => p.filter(l => l.habit_id !== habitId))
  }

  // ── Groups ─────────────────────────────────────────────────────────────────
  async function createGroup() {
    if (!newGroupName.trim() || !userId || isCreating) return
    const ownedCount = groups.filter(g => g.owner_id === userId).length
    if (ownedCount >= 5) { setCreateError('You can own a maximum of 5 groups.'); return }
    setIsCreating(true)
    setCreateError('')
    const code = genCode()
    const { data: group, error: err } = await supabase.from('groups')
      .insert({ name: newGroupName.trim(), owner_id: userId, code, icon: newGroupIcon, description: newGroupDesc.trim() || null, is_public: newGroupPublic }).select().single()
    if (err) { setCreateError(err.message); setIsCreating(false); return }
    await supabase.from('group_members').insert({ group_id: group.id, user_id: userId })
    setGroups(p => [...p, group])
    setNewGroupName(''); setNewGroupIcon('Users'); setNewGroupDesc(''); setNewGroupPublic(false)
    setIsCreating(false)
    setShowGroups(false)
  }

  async function joinGroup() {
    const code = joinCode.trim()
    if (code.length < 6 || !userId || isJoining) return
    setIsJoining(true)
    setJoinError('')
    const { data: group, error: err } = await supabase.from('groups').select('*').eq('code', code).single()
    if (err || !group) { setJoinError('Group not found. Check the code.'); setIsJoining(false); return }
    if (groups.find(g => g.id === group.id)) { setJoinError('You are already in this group.'); setIsJoining(false); return }
    const { error: joinErr } = await supabase.from('group_members').insert({ group_id: group.id, user_id: userId })
    if (joinErr) { setJoinError(joinErr.message); setIsJoining(false); return }
    const { data: gh } = await supabase.from('group_habits').select('*').eq('group_id', group.id)
    setGroups(p => [...p, group])
    setGHabits(p => [...p, ...(gh || [])])
    setJoinCode('')
    setIsJoining(false)
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
    if (!userId || pending.has(habitId)) return
    addPending(habitId)
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
    removePending(habitId)
  }

  async function deleteGroupHabit(habitId: string) {
    await supabase.from('group_habits').delete().eq('id', habitId)
    setGHabits(p => p.filter(h => h.id !== habitId))
    setGLogs(p => p.filter(l => l.group_habit_id !== habitId))
  }

  async function toggleQuest(questId: string) {
    if (!userId || pending.has(questId)) return
    addPending(questId)
    const done = questLogs.some(l => l.quest_plan_id === questId && l.completed_at === TODAY)
    if (done) {
      await supabase.from('daily_quest_logs').delete().eq('quest_plan_id', questId).eq('user_id', userId).eq('completed_at', TODAY)
      setQuestLogs(p => p.filter(l => !(l.quest_plan_id === questId && l.completed_at === TODAY)))
    } else {
      const { error } = await supabase.from('daily_quest_logs').insert({ quest_plan_id: questId, user_id: userId, completed_at: TODAY })
      if (!error) {
        setQuestLogs(p => [...p, { quest_plan_id: questId, completed_at: TODAY }])
        if (localStorage.getItem('sound') !== 'false') playCompletionSound()
        if (localStorage.getItem('vibration') !== 'false') navigator.vibrate?.(50)
        if (localStorage.getItem('confetti') !== 'false') {
          confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 }, colors: ['#eab308', '#facc15', '#fde047', '#fef08a'] })
        }
      }
    }
    removePending(questId)
  }

  function openGroups(tab: 'create' | 'join') {
    setGroupTab(tab)
    setJoinCode(''); setJoinError(''); setCreateError('')
    setShowGroups(true)
  }

  // ── Loading state — skeleton ───────────────────────────────────────────────
  if (loading) return (
    <div
      className="min-h-screen text-white relative"
      style={{ background: 'linear-gradient(160deg, #0b2535 0%, #0d1830 25%, #0a0c1e 60%, #07080f 100%)' }}
    >
      <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.85) 1px, transparent 1px)', backgroundSize: '55px 55px', opacity: 0.07 }} />
      <div className="max-w-md mx-auto px-5 pt-12 pb-36 relative z-10">
        {/* Header skeleton */}
        <div className="flex flex-col items-center mb-8 animate-pulse">
          <div className="h-9 w-52 rounded-xl mb-2" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <div className="h-4 w-36 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }} />
        </div>
        <SkeletonDashboard />
      </div>
    </div>
  )

  return (
    <div
      className="min-h-screen text-white relative"
      style={{ background: 'linear-gradient(160deg, #0b2535 0%, #0d1830 25%, #0a0c1e 60%, #07080f 100%)' }}
    >
      {/* Star field overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.85) 1px, transparent 1px)', backgroundSize: '55px 55px', opacity: 0.07 }}
      />

      <PageTransition>
        <div className="max-w-md mx-auto px-5 pt-12 pb-36 relative z-10">

          {/* ── Header ── */}
          <div className="relative flex flex-col items-center mb-8">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-4xl">☀️</span>
              <h1 className="text-3xl font-bold tracking-tight">Daily Habits</h1>
              <span className="text-2xl">🍃</span>
            </div>
            <p className="text-gray-400 text-sm">Hey {username}, {TODAY_LABEL}</p>
            <button
              onClick={() => openGroups('join')}
              className="absolute right-0 top-0 w-11 h-11 rounded-full border border-white/20 flex items-center justify-center transition hover:border-white/40"
              style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}
              title="Groups"
            >
              <User size={20} className="text-gray-300" />
            </button>
          </div>

          {/* ── Daily Quests ── */}
          {todayQuests.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={CARD_SPRING}
              className="mb-5 rounded-2xl p-4 border border-yellow-500/20"
              style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Zap size={15} className="text-yellow-400" />
                <span className="text-yellow-300 font-semibold text-sm uppercase tracking-wider">Level Up Your Game</span>
                <span className="text-gray-500 text-xs ml-auto">
                  {questLogs.filter(l => l.completed_at === TODAY).length}/{todayQuests.length} done
                </span>
              </div>
              <div className="space-y-2">
                {todayQuests.map(quest => {
                  const done = questLogs.some(l => l.quest_plan_id === quest.id && l.completed_at === TODAY)
                  const Icon = getIcon(quest.icon || 'Target')
                  return (
                    <div key={quest.id} className="flex items-center gap-3">
                      <Icon size={17} className={done ? 'text-yellow-400' : 'text-gray-500'} />
                      <span className={`flex-1 text-sm font-medium ${done ? 'text-gray-500 line-through' : 'text-yellow-100'}`}>
                        {quest.name}
                      </span>
                      <motion.button
                        onClick={() => toggleQuest(quest.id)}
                        disabled={pending.has(quest.id)}
                        whileTap={pending.has(quest.id) ? {} : { scale: 0.78 }}
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                        style={done
                          ? { background: '#facc15', boxShadow: '0 0 14px rgba(250,204,21,0.4)', opacity: pending.has(quest.id) ? 0.6 : 1 }
                          : { background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.15)', opacity: pending.has(quest.id) ? 0.5 : 1 }
                        }
                        transition={CHECK_SPRING}
                      >
                        <AnimatePresence mode="wait">
                          {done && (
                            <motion.span
                              key="check"
                              initial={{ scale: 0, rotate: -45 }}
                              animate={{ scale: 1, rotate: 0 }}
                              exit={{ scale: 0, rotate: 45 }}
                              transition={CHECK_SPRING}
                            >
                              <Check size={16} className="text-black" strokeWidth={3} />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* ── Weekly Recap ── */}
          {logs.length > 0 && (() => {
            const d7 = new Date(); d7.setDate(d7.getDate() - 6)
            const d14 = new Date(); d14.setDate(d14.getDate() - 13)
            const weekStart = d7.toISOString().split('T')[0]
            const lastWeekStart = d14.toISOString().split('T')[0]
            const thisWeek = logs.filter(l => l.completed_at >= weekStart).length
            const lastWeek = logs.filter(l => l.completed_at >= lastWeekStart && l.completed_at < weekStart).length
            const diff = thisWeek - lastWeek
            const pct = lastWeek > 0 ? Math.round(Math.abs(diff) / lastWeek * 100) : null
            return (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={CARD_SPRING}
                className="mb-5 rounded-2xl px-4 py-3 flex items-center gap-3"
                style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <Flame size={18} className="text-orange-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold">This week: {thisWeek} habits done</p>
                  <p className="text-gray-500 text-xs">
                    {diff === 0 ? 'Same as last week' : diff > 0
                      ? `↑ ${pct !== null ? `${pct}% more` : `+${diff}`} than last week`
                      : `↓ ${pct !== null ? `${pct}% fewer` : `${diff}`} than last week`
                    }
                  </p>
                </div>
                <p className={`text-sm font-bold flex-shrink-0 ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                  {diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '~'}
                </p>
              </motion.div>
            )
          })()}

          {/* ── Empty state ── */}
          {habits.length === 0 && groups.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.1 }}
              className="flex flex-col items-center text-center py-16 px-4"
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
                style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.25)' }}
              >
                <Flame size={38} className="text-green-400" />
              </motion.div>
              <h2 className="text-xl font-bold mb-2">Your streak starts today</h2>
              <p className="text-gray-500 text-sm mb-6">Add your first habit and build<br />momentum that lasts</p>
              <motion.button
                onClick={() => setShowAdd(true)}
                whileTap={{ scale: 0.94 }}
                className="px-8 py-3 rounded-2xl font-bold text-black"
                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 0 20px rgba(34,197,94,0.35)' }}
              >
                Add your first habit
              </motion.button>
            </motion.div>
          )}

          {/* ── Personal habits ── */}
          <div className="space-y-3">
            {habits.map((habit, index) => {
              const done   = logs.some(l => l.habit_id === habit.id && l.completed_at === TODAY)
              const streak = streakFor(habit.id, logs as { habit_id: string; completed_at: string }[], 'habit_id')
              const Icon   = getIcon(habit.icon || 'Star')
              const fillPct = Math.min((streak / 7) * 100, 100)
              return (
                <motion.div
                  key={habit.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...CARD_SPRING, delay: index * 0.055 }}
                  className="rounded-2xl p-4 border transition-colors group"
                  style={{
                    background: done ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(8px)',
                    borderColor: done ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.1)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
                      style={{ background: done ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)' }}
                    >
                      <Icon size={18} className={done ? 'text-green-400' : 'text-gray-400'} />
                    </div>
                    <span className={`flex-1 font-bold text-base transition-colors ${done ? 'text-gray-500' : 'text-white'}`}>
                      {habit.name}
                    </span>
                    {streak > 0 && <span className="text-orange-400 text-xs font-semibold">🔥{streak}</span>}
                    <motion.button
                      onClick={() => deleteHabit(habit.id)}
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      className="text-gray-600 hover:text-red-400 mr-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </motion.button>

                    {/* Sparkle stars */}
                    <div className="relative flex-shrink-0">
                      {['✦', '✦', '✦'].map((star, si) => {
                        const positions = [
                          { x: -14, y: -16 }, { x: 14, y: -12 }, { x: 2, y: -20 },
                        ]
                        return (
                          <motion.span
                            key={si}
                            className="absolute text-yellow-300 text-xs select-none pointer-events-none"
                            animate={done
                              ? { opacity: 1, x: positions[si].x, y: positions[si].y, scale: 1 }
                              : { opacity: 0, x: 0, y: 0, scale: 0 }
                            }
                            transition={{ type: 'spring', stiffness: 400, damping: 18, delay: si * 0.04 }}
                          >
                            {star}
                          </motion.span>
                        )
                      })}

                      {/* Check button */}
                      <motion.button
                        key={`${habit.id}-${done}`}
                        onClick={() => toggleHabit(habit.id)}
                        disabled={pending.has(habit.id)}
                        initial={{ scale: done ? 0.65 : 1 }}
                        animate={{ scale: 1 }}
                        whileTap={pending.has(habit.id) ? {} : { scale: 0.78 }}
                        transition={CHECK_SPRING}
                        className="w-11 h-11 rounded-full flex items-center justify-center overflow-hidden"
                        style={done
                          ? { background: '#4ade80', boxShadow: '0 0 20px rgba(74,222,128,0.5)', opacity: pending.has(habit.id) ? 0.6 : 1 }
                          : { background: 'rgba(255,255,255,0.06)', border: '2px solid rgba(255,255,255,0.15)', opacity: pending.has(habit.id) ? 0.5 : 1 }
                        }
                      >
                        <AnimatePresence mode="wait">
                          {done && (
                            <motion.span
                              key="check"
                              initial={{ scale: 0, rotate: -45 }}
                              animate={{ scale: 1, rotate: 0 }}
                              exit={{ scale: 0, rotate: 45 }}
                              transition={CHECK_SPRING}
                            >
                              <Check size={20} className="text-black" strokeWidth={3} />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    </div>
                  </div>

                  {/* Animated progress bar */}
                  {streak > 0 && (
                    <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: '0%' }}
                        animate={{ width: `${fillPct}%` }}
                        transition={{ type: 'spring', stiffness: 80, damping: 20, delay: index * 0.055 + 0.2 }}
                        style={{ background: 'linear-gradient(to right, #3b82f6, #8b5cf6)' }}
                      />
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>

          {/* ── Group sections ── */}
          {groups.map((group, gi) => {
            const groupHabits = gHabits.filter(h => h.group_id === group.id)
            const isOwner = group.owner_id === userId
            const GroupIcon = getIcon(group.icon || 'Users')
            return (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...CARD_SPRING, delay: (habits.length + gi) * 0.055 }}
                className="mt-5 rounded-2xl p-0.5"
                style={{ background: 'linear-gradient(135deg, #ff6b6b, #ffd93d, #6bcb77, #4d96ff, #c77dff)' }}
              >
                <div className="rounded-[14px] p-4" style={{ background: '#0d1525' }}>
                  <div className="flex items-start gap-2 mb-3">
                    <GroupIcon size={15} className="text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <span className="text-blue-200 font-bold text-sm">{group.name}</span>
                      {group.description && (
                        <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{group.description}</p>
                      )}
                    </div>
                    <span className="font-mono text-xs text-gray-300 px-2 py-0.5 rounded-lg tracking-widest flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }}>
                      {group.code}
                    </span>
                    {!isOwner && (
                      <button onClick={() => leaveGroup(group.id)} className="text-gray-600 hover:text-red-400 transition flex-shrink-0">
                        <LogOut size={13} />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {groupHabits.length === 0 && (
                      <p className="text-gray-600 text-sm">{isOwner ? 'Add habits below.' : 'No habits yet.'}</p>
                    )}
                    {groupHabits.map((habit, hi) => {
                      const done   = gLogs.some(l => l.group_habit_id === habit.id && l.completed_at === TODAY)
                      const streak = streakFor(habit.id, gLogs as { group_habit_id: string; completed_at: string }[], 'group_habit_id')
                      const fillPct = Math.min((streak / 7) * 100, 100)
                      return (
                        <motion.div
                          key={habit.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ ...CARD_SPRING, delay: hi * 0.04 }}
                          className="rounded-xl p-3 border transition-colors group"
                          style={{
                            background: done ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.04)',
                            borderColor: done ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.07)',
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`flex-1 font-semibold text-sm transition-colors ${done ? 'text-gray-500' : 'text-blue-100'}`}>
                              {habit.name}
                            </span>
                            {streak > 0 && <span className="text-orange-400 text-xs">🔥{streak}</span>}
                            {isOwner && (
                              <button onClick={() => deleteGroupHabit(habit.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-red-400 mr-1 flex-shrink-0">
                                <Trash2 size={13} />
                              </button>
                            )}
                            <div className="relative flex-shrink-0">
                              {['✦', '✦'].map((star, si) => {
                                const pos = [{ x: -12, y: -12 }, { x: 12, y: -10 }]
                                return (
                                  <motion.span
                                    key={si}
                                    className="absolute text-yellow-300 text-xs select-none pointer-events-none"
                                    animate={done
                                      ? { opacity: 1, x: pos[si].x, y: pos[si].y, scale: 1 }
                                      : { opacity: 0, x: 0, y: 0, scale: 0 }
                                    }
                                    transition={{ type: 'spring', stiffness: 400, damping: 18, delay: si * 0.05 }}
                                  >{star}</motion.span>
                                )
                              })}
                              <motion.button
                                key={`${habit.id}-${done}`}
                                onClick={() => toggleGroupHabit(habit.id)}
                                disabled={pending.has(habit.id)}
                                initial={{ scale: done ? 0.65 : 1 }}
                                animate={{ scale: 1 }}
                                whileTap={pending.has(habit.id) ? {} : { scale: 0.78 }}
                                transition={CHECK_SPRING}
                                className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden"
                                style={done
                                  ? { background: '#60a5fa', boxShadow: '0 0 14px rgba(96,165,250,0.5)', opacity: pending.has(habit.id) ? 0.6 : 1 }
                                  : { background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.12)', opacity: pending.has(habit.id) ? 0.5 : 1 }
                                }
                              >
                                <AnimatePresence mode="wait">
                                  {done && (
                                    <motion.span
                                      key="check"
                                      initial={{ scale: 0, rotate: -45 }}
                                      animate={{ scale: 1, rotate: 0 }}
                                      exit={{ scale: 0 }}
                                      transition={CHECK_SPRING}
                                    >
                                      <Check size={15} className="text-black" strokeWidth={3} />
                                    </motion.span>
                                  )}
                                </AnimatePresence>
                              </motion.button>
                            </div>
                          </div>
                          {streak > 0 && (
                            <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                              <motion.div
                                className="h-full rounded-full"
                                initial={{ width: '0%' }}
                                animate={{ width: `${fillPct}%` }}
                                transition={{ type: 'spring', stiffness: 80, damping: 20 }}
                                style={{ background: 'linear-gradient(to right, #3b82f6, #8b5cf6)' }}
                              />
                            </div>
                          )}
                        </motion.div>
                      )
                    })}
                  </div>

                  {isOwner && (
                    <div className="flex gap-2 mt-3">
                      <input
                        value={gHabitInputs[group.id] || ''}
                        onChange={e => setGHabitInputs(p => ({ ...p, [group.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && addGroupHabit(group.id)}
                        placeholder="Add habit to group..."
                        className="flex-1 px-3 py-2.5 text-white rounded-xl text-sm focus:outline-none placeholder-gray-600"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                      <button
                        onClick={() => addGroupHabit(group.id)}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition active:scale-95"
                        style={{ background: 'linear-gradient(135deg, #4d96ff, #c77dff)' }}
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}

          {/* Discover link */}
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

      <BottomNav onAdd={() => setShowAdd(true)} />

      {/* ── Add habit modal ── */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
            onClick={e => { if (e.target === e.currentTarget) setShowAdd(false) }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className="w-full max-w-md p-6 pb-12 rounded-t-3xl border-t border-white/10"
              style={{ background: '#0e1525' }}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-bold">New Habit</h3>
                <button onClick={() => setShowAdd(false)} className="text-gray-600 hover:text-white"><X size={22} /></button>
              </div>
              <input
                autoFocus value={newHabitName} onChange={e => setNewHabitName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addHabit()}
                placeholder="Habit name..."
                className="w-full px-4 py-3 text-white rounded-xl border focus:outline-none focus:border-green-500 placeholder-gray-600 mb-5 text-lg"
                style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' }}
              />
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-3">Choose icon</p>
              <div className="grid grid-cols-6 gap-2 mb-6 max-h-44 overflow-y-auto pr-1">
                {ICONS.map(({ name, component: Icon }) => (
                  <button key={name} type="button" onClick={() => setNewHabitIcon(name)}
                    className={`aspect-square rounded-xl flex items-center justify-center transition-all active:scale-90 ${newHabitIcon === name ? 'bg-green-500 text-black' : 'text-gray-500 hover:text-white'}`}
                    style={newHabitIcon !== name ? { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' } : {}}
                  >
                    <Icon size={20} />
                  </button>
                ))}
              </div>
              <button onClick={addHabit} disabled={!newHabitName.trim()}
                className="w-full py-4 bg-green-500 hover:bg-green-400 disabled:opacity-30 text-black font-bold rounded-2xl transition-all active:scale-95 text-lg">
                Add Habit
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Groups modal ── */}
      <AnimatePresence>
        {showGroups && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
            onClick={e => { if (e.target === e.currentTarget) setShowGroups(false) }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className="w-full max-w-md p-6 pb-12 rounded-t-3xl border-t border-white/10"
              style={{ background: '#0e1525' }}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-bold">Groups</h3>
                <button onClick={() => setShowGroups(false)} className="text-gray-600 hover:text-white"><X size={22} /></button>
              </div>

              <div className="flex rounded-xl p-1 mb-6" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <button
                  onClick={() => setGroupTab('create')}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${groupTab === 'create' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
                >Create Group</button>
                <button
                  onClick={() => setGroupTab('join')}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${groupTab === 'join' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
                >Join Group</button>
              </div>

              {groupTab === 'create' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <input
                      autoFocus value={newGroupName}
                      onChange={e => setNewGroupName(e.target.value.slice(0, 30))}
                      onKeyDown={e => e.key === 'Enter' && createGroup()}
                      placeholder="Group name..."
                      maxLength={30}
                      className="w-full px-4 py-3 text-white rounded-xl border focus:outline-none focus:border-blue-500 placeholder-gray-600 text-lg"
                      style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' }}
                    />
                    <p className={`text-xs text-right pr-1 ${30 - newGroupName.length <= 8 ? 'text-red-400' : 'text-gray-600'}`}>
                      {30 - newGroupName.length} left
                    </p>
                  </div>
                  <div className="space-y-1">
                    <textarea
                      value={newGroupDesc}
                      onChange={e => setNewGroupDesc(e.target.value.slice(0, 120))}
                      placeholder="Description (optional)..."
                      maxLength={120}
                      rows={2}
                      className="w-full px-4 py-3 text-white rounded-xl border focus:outline-none focus:border-blue-500 placeholder-gray-600 text-sm resize-none"
                      style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' }}
                    />
                    <p className={`text-xs text-right pr-1 ${120 - newGroupDesc.length <= 20 ? 'text-red-400' : 'text-gray-600'}`}>
                      {120 - newGroupDesc.length} left
                    </p>
                  </div>
                  <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Choose icon</p>
                  <div className="grid grid-cols-6 gap-2 max-h-36 overflow-y-auto pr-1">
                    {ICONS.map(({ name, component: Icon }) => (
                      <button key={name} type="button" onClick={() => setNewGroupIcon(name)}
                        className={`aspect-square rounded-xl flex items-center justify-center transition-all active:scale-90 ${newGroupIcon === name ? 'bg-blue-500 text-black' : 'text-gray-500 hover:text-white'}`}
                        style={newGroupIcon !== name ? { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' } : {}}
                      >
                        <Icon size={20} />
                      </button>
                    ))}
                  </div>
                  {/* Public toggle */}
                  <button
                    type="button"
                    onClick={() => setNewGroupPublic(p => !p)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors"
                    style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${newGroupPublic ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.1)'}` }}
                  >
                    <div>
                      <p className="text-sm font-semibold text-white text-left">Public group</p>
                      <p className="text-xs text-gray-500 text-left">Anyone can discover and join</p>
                    </div>
                    <div
                      className="w-11 h-6 rounded-full transition-colors flex-shrink-0 relative"
                      style={{ background: newGroupPublic ? '#3b82f6' : 'rgba(255,255,255,0.1)' }}
                    >
                      <div
                        className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                        style={{ left: newGroupPublic ? '1.375rem' : '0.25rem' }}
                      />
                    </div>
                  </button>
                  {createError && <p className="text-red-400 text-sm">{createError}</p>}
                  <button onClick={createGroup} disabled={!newGroupName.trim() || isCreating}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white font-bold rounded-2xl transition-all active:scale-95 text-lg">
                    {isCreating ? 'Creating...' : 'Create'}
                  </button>
                </div>
              )}

              {groupTab === 'join' && (
                <div className="space-y-4">
                  <p className="text-gray-400 text-sm text-center">Enter the 6-digit code from your friend</p>
                  <input
                    autoFocus value={joinCode}
                    onChange={e => { setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setJoinError('') }}
                    onKeyDown={e => e.key === 'Enter' && joinGroup()}
                    placeholder="000000" maxLength={6} inputMode="numeric"
                    className="w-full px-4 py-4 text-white rounded-xl border focus:outline-none focus:border-blue-500 placeholder-gray-700 font-mono tracking-[0.5em] text-center text-3xl"
                    style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' }}
                  />
                  {joinError && <p className="text-red-400 text-sm text-center">{joinError}</p>}
                  <button onClick={joinGroup} disabled={joinCode.length < 6 || isJoining}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white font-bold rounded-2xl transition-all active:scale-95 text-lg">
                    {isJoining ? 'Joining...' : 'Join'}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
