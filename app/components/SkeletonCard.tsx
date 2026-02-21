export function SkeletonCard({ lines = 1 }: { lines?: number }) {
  return (
    <div
      className="rounded-2xl p-4 animate-pulse"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="flex-1 space-y-2">
          <div className="h-4 rounded-lg w-2/3" style={{ background: 'rgba(255,255,255,0.08)' }} />
          {lines > 1 && <div className="h-1.5 rounded-full w-full" style={{ background: 'rgba(255,255,255,0.05)' }} />}
        </div>
        <div className="w-11 h-11 rounded-full flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>
    </div>
  )
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <SkeletonCard key={i} lines={2} />
      ))}
    </div>
  )
}

export function SkeletonLeaderboard() {
  return (
    <div className="space-y-3">
      {/* 1st place big */}
      <div
        className="rounded-2xl p-5 animate-pulse flex items-center gap-4"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="w-10 h-10 rounded-full flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="flex-1 space-y-2">
          <div className="h-5 rounded-lg w-1/2" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <div className="h-1.5 rounded-full w-3/4" style={{ background: 'rgba(255,255,255,0.05)' }} />
        </div>
      </div>
      {/* 2nd + 3rd */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2].map(i => (
          <div
            key={i}
            className="rounded-2xl p-4 animate-pulse flex flex-col items-center gap-2"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="w-8 h-8 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="h-3 rounded w-2/3" style={{ background: 'rgba(255,255,255,0.07)' }} />
            <div className="h-1 rounded-full w-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
