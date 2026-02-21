'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { BottomNav } from '@/app/components/BottomNav'
import { PageTransition } from '@/app/components/PageTransition'
import { getIcon } from '@/lib/icons'
import { motion } from 'framer-motion'
import { Users, Check, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type PublicGroup = {
  id: string
  name: string
  icon: string
  description: string | null
  memberCount: number
  isJoined: boolean
}

const CARD_SPRING = { type: 'spring' as const, stiffness: 320, damping: 26 }

export default function DiscoverPage() {
  const [groups, setGroups] = useState<PublicGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const [{ data: myMemberships }, { data: publicGroups }] = await Promise.all([
        supabase.from('group_members').select('group_id').eq('user_id', user.id),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase.from('groups').select('id, name, icon, description, group_members(count)').eq('is_public', true) as any,
      ])

      const myGroupIds = new Set((myMemberships || []).map((m: { group_id: string }) => m.group_id))

      if (publicGroups) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: PublicGroup[] = publicGroups.map((g: any) => ({
          id: g.id,
          name: g.name,
          icon: g.icon || 'Users',
          description: g.description ?? null,
          memberCount: g.group_members?.[0]?.count ?? 0,
          isJoined: myGroupIds.has(g.id),
        }))
        mapped.sort((a, b) => b.memberCount - a.memberCount)
        setGroups(mapped)
      }

      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function joinGroup(groupId: string) {
    if (!userId || joiningId) return
    setJoiningId(groupId)
    const { error } = await supabase.from('group_members').insert({ group_id: groupId, user_id: userId })
    if (!error) {
      setGroups(prev =>
        prev.map(g => g.id === groupId ? { ...g, isJoined: true, memberCount: g.memberCount + 1 } : g)
      )
    }
    setJoiningId(null)
  }

  if (loading) return (
    <div
      className="min-h-screen text-white relative"
      style={{ background: 'linear-gradient(160deg, #0b2535 0%, #0d1830 25%, #0a0c1e 60%, #07080f 100%)' }}
    >
      <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.85) 1px, transparent 1px)', backgroundSize: '55px 55px', opacity: 0.07 }} />
      <div className="max-w-md mx-auto px-5 pt-12 pb-36 relative z-10">
        <div className="flex items-center gap-3 mb-8 animate-pulse">
          <div className="w-9 h-9 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <div className="h-8 w-44 rounded-xl" style={{ background: 'rgba(255,255,255,0.08)' }} />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="rounded-2xl p-4 animate-pulse"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }} />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/5 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)' }} />
                  <div className="h-3 w-3/4 rounded" style={{ background: 'rgba(255,255,255,0.05)' }} />
                  <div className="h-2 w-1/4 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
                </div>
                <div className="w-14 h-8 rounded-xl flex-shrink-0" style={{ background: 'rgba(255,255,255,0.07)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div
      className="min-h-screen text-white relative"
      style={{ background: 'linear-gradient(160deg, #0b2535 0%, #0d1830 25%, #0a0c1e 60%, #07080f 100%)' }}
    >
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.85) 1px, transparent 1px)', backgroundSize: '55px 55px', opacity: 0.07 }}
      />

      <PageTransition>
        <div className="max-w-md mx-auto px-5 pt-12 pb-36 relative z-10">

          {/* Header */}
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/leaderboard"
              className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <ArrowLeft size={18} />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Discover Groups</h1>
          </div>
          <p className="text-gray-500 text-sm mb-8 ml-12">Public groups open for anyone to join</p>

          {/* Empty state */}
          {groups.length === 0 && (
            <div className="flex flex-col items-center text-center py-20">
              <span className="text-5xl mb-4">🌌</span>
              <p className="text-gray-400 font-semibold mb-1">No public groups yet</p>
              <p className="text-gray-600 text-sm">Create a group and make it public<br />so others can find and join it.</p>
            </div>
          )}

          {/* Group cards */}
          <div className="space-y-3">
            {groups.map((group, i) => {
              const GroupIcon = getIcon(group.icon)
              return (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...CARD_SPRING, delay: i * 0.055 }}
                  className="rounded-2xl p-4"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.09)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)' }}
                    >
                      <GroupIcon size={18} className="text-blue-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-sm leading-tight">{group.name}</p>
                      {group.description && (
                        <p className="text-gray-400 text-xs mt-0.5 leading-relaxed line-clamp-2">{group.description}</p>
                      )}
                      <div className="flex items-center gap-1 mt-1.5">
                        <Users size={11} className="text-gray-600" />
                        <span className="text-gray-600 text-xs">
                          {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
                        </span>
                      </div>
                    </div>

                    <motion.button
                      onClick={() => !group.isJoined && joinGroup(group.id)}
                      whileTap={group.isJoined ? {} : { scale: 0.88 }}
                      disabled={group.isJoined || joiningId === group.id}
                      className="px-4 py-2 rounded-xl text-xs font-bold flex-shrink-0 transition-all"
                      style={
                        group.isJoined
                          ? { background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }
                          : { background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: 'white', boxShadow: '0 0 16px rgba(59,130,246,0.25)' }
                      }
                    >
                      {group.isJoined
                        ? <span className="flex items-center gap-1"><Check size={12} strokeWidth={3} /> Joined</span>
                        : joiningId === group.id ? '...' : 'Join'
                      }
                    </motion.button>
                  </div>
                </motion.div>
              )
            })}
          </div>

        </div>
      </PageTransition>

      <BottomNav />
    </div>
  )
}
