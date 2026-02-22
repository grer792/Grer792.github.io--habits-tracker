'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Trash2, Users, Globe, Lock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const ADMIN_ID = process.env.NEXT_PUBLIC_ADMIN_USER_ID

type Group = {
  id: string
  name: string
  description: string | null
  is_public: boolean
  owner_id: string
  member_count: number
}

export default function AdminPage() {
  const [groups, setGroups]       = useState<Group[]>([])
  const [loading, setLoading]     = useState(true)
  const [allowed, setAllowed]     = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting]   = useState<string | null>(null)
  const supabase = createClient()
  const router   = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      if (!ADMIN_ID || user.id !== ADMIN_ID) { setLoading(false); return }
      setAllowed(true)

      const { data: groupRows } = await supabase
        .from('groups')
        .select('id, name, description, is_public, owner_id')
        .order('created_at', { ascending: false })

      if (!groupRows) { setLoading(false); return }

      const { data: memberRows } = await supabase
        .from('group_members')
        .select('group_id')

      const countMap: Record<string, number> = {}
      for (const row of memberRows || []) {
        countMap[row.group_id] = (countMap[row.group_id] || 0) + 1
      }

      setGroups(groupRows.map(g => ({ ...g, member_count: countMap[g.id] || 0 })))
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function deleteGroup(id: string) {
    setDeleting(id)
    await supabase.rpc('admin_delete_group', { gid: id })
    setGroups(p => p.filter(g => g.id !== id))
    setConfirmId(null)
    setDeleting(null)
  }

  const BG   = 'linear-gradient(160deg, #0b2535 0%, #0d1830 25%, #0a0c1e 60%, #07080f 100%)'
  const STAR = { backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.85) 1px, transparent 1px)', backgroundSize: '55px 55px', opacity: 0.07 }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-white" style={{ background: BG }}>
      <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
    </div>
  )

  if (!allowed) return (
    <div className="min-h-screen flex items-center justify-center text-white" style={{ background: BG }}>
      <p className="text-gray-500">Access denied.</p>
    </div>
  )

  return (
    <div className="min-h-screen text-white relative" style={{ background: BG }}>
      <div className="fixed inset-0 pointer-events-none" style={STAR} />

      <div className="max-w-lg mx-auto px-5 pt-12 pb-24 relative z-10">

        <div className="mb-8">
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-gray-500 text-sm mt-1">{groups.length} groups total</p>
        </div>

        <div className="space-y-3">
          {groups.map(group => (
            <motion.div
              key={group.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="rounded-2xl p-4 flex items-start gap-3"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold text-sm truncate">{group.name}</p>
                  {group.is_public
                    ? <Globe size={12} className="text-blue-400 flex-shrink-0" />
                    : <Lock size={12} className="text-gray-600 flex-shrink-0" />
                  }
                </div>
                {group.description && (
                  <p className="text-gray-500 text-xs truncate mb-1">{group.description}</p>
                )}
                <span className="flex items-center gap-1 text-gray-600 text-xs">
                  <Users size={11} />{group.member_count} member{group.member_count !== 1 ? 's' : ''}
                </span>
              </div>

              {confirmId === group.id ? (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setConfirmId(null)}
                    className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5 rounded-lg transition"
                    style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteGroup(group.id)}
                    disabled={deleting === group.id}
                    className="text-xs text-white font-semibold px-3 py-1.5 rounded-lg transition"
                    style={{ background: deleting === group.id ? 'rgba(239,68,68,0.4)' : '#ef4444' }}
                  >
                    {deleting === group.id ? 'Deleting…' : 'Confirm delete'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmId(group.id)}
                  className="text-gray-600 hover:text-red-400 transition flex-shrink-0 p-1"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </motion.div>
          ))}

          {groups.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-12">No groups found.</p>
          )}
        </div>

        {/* Confirm overlay */}
        <AnimatePresence>
          {confirmId && (
            <motion.div
              className="fixed inset-0 z-50 flex items-end justify-center pb-8 px-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => setConfirmId(null)}
            >
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-sm rounded-2xl p-6 text-center"
                style={{ background: '#0d1525', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                <p className="font-bold text-lg mb-1">Delete group?</p>
                <p className="text-gray-500 text-sm mb-6">
                  "{groups.find(g => g.id === confirmId)?.name}" and all its habits + logs will be permanently removed.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmId(null)}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold transition"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteGroup(confirmId)}
                    disabled={!!deleting}
                    className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition"
                    style={{ background: deleting ? 'rgba(239,68,68,0.5)' : '#ef4444' }}
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  )
}
