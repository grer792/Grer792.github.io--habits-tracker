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
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-black border-t border-gray-900 flex items-center justify-around px-6 pt-3 pb-6 z-50">
      <Link href="/dashboard" className={`flex flex-col items-center gap-1 ${active('/dashboard')}`}>
        <Home size={24} />
        <span className="text-xs">Home</span>
      </Link>

      <Link href="/leaderboard" className={`flex flex-col items-center gap-1 ${active('/leaderboard')}`}>
        <Trophy size={24} />
        <span className="text-xs">Ranks</span>
      </Link>

      <button
        onClick={onAdd}
        className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center -mt-6 shadow-xl shadow-green-500/30 hover:bg-green-400 active:scale-95 transition-all"
      >
        <Plus size={28} className="text-black" strokeWidth={2.5} />
      </button>

      <Link href="/settings" className={`flex flex-col items-center gap-1 ${active('/settings')}`}>
        <Settings size={24} />
        <span className="text-xs">Settings</span>
      </Link>
    </nav>
  )
}
