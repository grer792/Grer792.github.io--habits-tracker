'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Trophy, Plus, Settings } from 'lucide-react'

type Props = {
  onAdd?: () => void
}

export function BottomNav({ onAdd }: Props) {
  const path = usePathname()
  const active = (href: string) => path === href ? 'text-green-400' : 'text-gray-600'

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md flex items-center justify-around px-6 pt-3 pb-7 z-50"
      style={{
        background: 'rgba(10,12,25,0.85)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <Link href="/dashboard" className={`flex flex-col items-center gap-1 transition-all ${active('/dashboard')}`}>
        <Home size={22} />
        <span className="text-xs font-medium">Home</span>
      </Link>

      <Link href="/leaderboard" className={`flex flex-col items-center gap-1 transition-all ${active('/leaderboard')}`}>
        <Trophy size={22} />
        <span className="text-xs font-medium">Ranks</span>
      </Link>

      <button
        onClick={onAdd}
        className="w-14 h-14 rounded-full flex items-center justify-center -mt-7 active:scale-90 transition-all"
        style={{
          background: 'linear-gradient(135deg, #22c55e, #16a34a)',
          boxShadow: '0 0 24px rgba(34,197,94,0.5), 0 4px 16px rgba(0,0,0,0.4)',
        }}
      >
        <Plus size={28} className="text-black" strokeWidth={2.5} />
      </button>

      <Link href="/settings" className={`flex flex-col items-center gap-1 transition-all ${active('/settings')}`}>
        <Settings size={22} />
        <span className="text-xs font-medium">Settings</span>
      </Link>
    </nav>
  )
}
