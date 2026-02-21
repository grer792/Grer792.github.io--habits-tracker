'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { BottomNav } from '@/app/components/BottomNav'
import { PageTransition } from '@/app/components/PageTransition'
import { SkeletonCard } from '@/app/components/SkeletonCard'
import { getIcon } from '@/lib/icons'
import { Trash2, LogOut, Volume2, Smartphone, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

type Habit = { id: string; name: string; icon: string }
type Group = { id: string; name: string; owner_id: string; code: string; icon: string }

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-12 h-7 rounded-full transition-colors duration-200 flex-shrink-0 ${enabled ? 'bg-green-500' : 'bg-gray-800'}`}
    >
      <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all duration-200 ${enabled ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

function SettingRow({ icon, label, description, enabled, onToggle }: {
  icon: React.ReactNode
  label: string
  description: string
  enabled: boolean
  onToggle: () => void
}) {
  return (
    <div className="bg-gray-950 rounded-2xl border border-gray-900 p-4 flex items-center gap-4">
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1">
        <p className="font-semibold text-sm">{label}</p>
        <p className="text-gray-500 text-xs mt-0.5">{description}</p>
      </div>
      <Toggle enabled={enabled} onToggle={onToggle} />
    </div>
  )
}

export default function SettingsPage() {
  const [email, setEmail] = useState('')
  const [habits, setHabits] = useState<Habit[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [soundEnabled, setSoundEnabled] = useState(true)
  const [vibrationEnabled, setVibrationEnabled] = useState(true)
  const [confettiEnabled, setConfettiEnabled] = useState(true)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setSoundEnabled(localStorage.getItem('sound') !== 'false')
    setVibrationEnabled(localStorage.getItem('vibration') !== 'false')
    setConfettiEnabled(localStorage.getItem('confetti') !== 'false')

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      setEmail(user.email || '')

      const [{ data: habitsData }, { data: memberRows }] = await Promise.all([
        supabase.from('habits').select('id,name,icon').eq('user_id', user.id).order('created_at'),
        supabase.from('group_members').select('group_id, groups(id,name,owner_id,code,icon)').eq('user_id', user.id),
      ])

      setHabits(habitsData || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const loaded = (memberRows || []).map((r: any) => r.groups).filter(Boolean) as Group[]
      setGroups(loaded)
      setLoading(false)
    }
    load()
  }, [])

  function togglePref(key: string, current: boolean, setter: (v: boolean) => void) {
    const next = !current
    localStorage.setItem(key, next ? 'true' : 'false')
    setter(next)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function deleteHabit(id: string) {
    await supabase.from('habits').delete().eq('id', id)
    setHabits(p => p.filter(h => h.id !== id))
  }

  async function leaveGroup(groupId: string) {
    if (!userId) return
    await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId)
    setGroups(p => p.filter(g => g.id !== groupId))
  }

  async function deleteGroup(groupId: string) {
    const { data: habitRows } = await supabase.from('group_habits').select('id').eq('group_id', groupId)
    if (habitRows && habitRows.length > 0) {
      const ids = habitRows.map(h => h.id)
      await supabase.from('group_habit_logs').delete().in('group_habit_id', ids)
    }
    await supabase.from('group_habits').delete().eq('group_id', groupId)
    await supabase.from('group_members').delete().eq('group_id', groupId)
    await supabase.from('groups').delete().eq('id', groupId)
    setGroups(p => p.filter(g => g.id !== groupId))
  }

  const CARD = { backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }
  const CARD_BG = 'rgba(255,255,255,0.05)'
  const SPRING = { type: 'spring' as const, stiffness: 300, damping: 26 }

  if (loading) return (
    <div className="min-h-screen text-white relative" style={{ background: 'linear-gradient(160deg, #0b2535 0%, #0d1830 25%, #0a0c1e 60%, #07080f 100%)' }}>
      <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.85) 1px, transparent 1px)', backgroundSize: '55px 55px', opacity: 0.07 }} />
      <div className="max-w-md mx-auto px-5 pt-12 pb-36 relative z-10 space-y-4">
        <div className="h-8 w-40 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen text-white relative" style={{ background: 'linear-gradient(160deg, #0b2535 0%, #0d1830 25%, #0a0c1e 60%, #07080f 100%)' }}>
      <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.85) 1px, transparent 1px)', backgroundSize: '55px 55px', opacity: 0.07 }} />

      <PageTransition>
        <div className="max-w-md mx-auto px-5 pt-12 pb-36 relative z-10 space-y-4">

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={SPRING}
            className="text-3xl font-bold"
          >
            Settings
          </motion.h1>

          {/* Account card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.05 }}
            className="rounded-2xl p-4 flex items-center justify-between"
            style={{ background: CARD_BG, ...CARD }}
          >
            <div>
              <p className="text-gray-500 text-xs mb-1">Logged in as</p>
              <p className="font-semibold text-sm">{email}</p>
            </div>
            <motion.button
              onClick={logout}
              whileTap={{ scale: 0.94 }}
              className="flex items-center gap-2 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <LogOut size={15} />
              Log out
            </motion.button>
          </motion.div>

          {/* Preference toggles */}
          <div className="space-y-3">
            {[
              { icon: <Volume2 size={20} className="text-green-400" />, label: 'Sound Effects', description: 'Play sound on completion', enabled: soundEnabled, key: 'sound', setter: setSoundEnabled },
              { icon: <Smartphone size={20} className="text-green-400" />, label: 'Vibration', description: 'Vibrate on completion', enabled: vibrationEnabled, key: 'vibration', setter: setVibrationEnabled },
              { icon: <Sparkles size={20} className="text-green-400" />, label: 'Confetti', description: 'Celebrate completions', enabled: confettiEnabled, key: 'confetti', setter: setConfettiEnabled },
            ].map((row, i) => (
              <motion.div
                key={row.key}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING, delay: 0.1 + i * 0.05 }}
              >
                <SettingRow
                  icon={row.icon}
                  label={row.label}
                  description={row.description}
                  enabled={row.enabled}
                  onToggle={() => togglePref(row.key, row.enabled, row.setter)}
                />
              </motion.div>
            ))}
          </div>

          {/* Manage Habits */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.25 }}
            className="rounded-2xl p-4"
            style={{ background: CARD_BG, ...CARD }}
          >
            <p className="font-bold mb-4">Manage Habits</p>
            {habits.length === 0 ? (
              <p className="text-gray-600 text-sm">No habits yet</p>
            ) : (
              <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                {habits.map(habit => {
                  const Icon = getIcon(habit.icon || 'Star')
                  return (
                    <div key={habit.id} className="flex items-center gap-3 py-3">
                      <Icon size={18} className="text-gray-500 flex-shrink-0" />
                      <span className="flex-1 text-sm">{habit.name}</span>
                      <motion.button
                        onClick={() => deleteHabit(habit.id)}
                        whileTap={{ scale: 0.88 }}
                        className="text-gray-600 hover:text-red-400 transition p-1"
                      >
                        <Trash2 size={16} />
                      </motion.button>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>

          {/* Manage Groups */}
          {groups.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.3 }}
              className="rounded-2xl p-4"
              style={{ background: CARD_BG, ...CARD }}
            >
              <p className="font-bold mb-4">Manage Groups</p>
              <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                {groups.map(group => {
                  const GroupIcon = getIcon(group.icon || 'Users')
                  const isOwner = group.owner_id === userId
                  return (
                    <div key={group.id} className="flex items-center gap-3 py-3">
                      <GroupIcon size={18} className="text-blue-400 flex-shrink-0" />
                      <span className="flex-1 text-sm">{group.name}</span>
                      <span className="text-xs text-gray-600 mr-2">{isOwner ? 'Owner' : 'Member'}</span>
                      {isOwner ? (
                        <motion.button
                          onClick={() => deleteGroup(group.id)}
                          whileTap={{ scale: 0.88 }}
                          className="text-gray-600 hover:text-red-400 transition p-1"
                          title="Delete group"
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      ) : (
                        <motion.button
                          onClick={() => leaveGroup(group.id)}
                          whileTap={{ scale: 0.94 }}
                          className="text-gray-600 hover:text-red-400 transition text-xs px-3 py-1 rounded-lg"
                          style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                          Leave
                        </motion.button>
                      )}
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

        </div>
      </PageTransition>

      <BottomNav />
    </div>
  )
}
