import React, { useState, useEffect, useRef } from 'react'
import { logsAPI, eventsAPI } from '../../api'

export default function LiveActivityBar() {
  const [stats,   setStats]   = useState(null)
  const [pulse,   setPulse]   = useState(false)
  const prevTotal = useRef(0)

  const fetch = async () => {
    try {
      const [logRes, evRes] = await Promise.all([
        logsAPI.getStats(),
        eventsAPI.getStats(),
      ])
      const logData = logRes.data.data
      const evData  = evRes.data.data

      const executed = logData?.byOutcome?.find(o => o.outcome === 'executed')?.count || 0
      const failed   = logData?.byOutcome?.find(o => o.outcome === 'failed')?.count   || 0
      const total    = logData?.total || 0
      const events   = evData?.total  || 0

      // Pulse animation when new data arrives
      if (total !== prevTotal.current && prevTotal.current !== 0) {
        setPulse(true)
        setTimeout(() => setPulse(false), 600)
      }
      prevTotal.current = total

      setStats({ executed, failed, total, events, avgDuration: logData?.avgDuration || 0 })
    } catch {}
  }

  useEffect(() => {
    fetch()
    const t = setInterval(fetch, 5000)
    return () => clearInterval(t)
  }, [])

  if (!stats) return null

  const successRate = stats.total > 0
    ? Math.round((stats.executed / stats.total) * 100)
    : 0

  return (
    <div className={`hidden lg:flex items-center gap-1 transition-all duration-300 ${pulse ? 'scale-105' : 'scale-100'}`}>

      {/* Divider */}
      <div className="w-px h-5 bg-[#1a2540] mx-2"/>

      {/* Events processed */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0d1426] border border-[#1a2540]">
        <span className="text-[#00d4ff] text-[10px]">⚡</span>
        <span className="text-[10px] font-mono text-[#94a3b8]">
          <span className="text-white font-bold">{stats.events}</span> events
        </span>
      </div>

      {/* Executed */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[rgba(16,185,129,0.06)] border border-[rgba(16,185,129,0.15)]">
        <span className="text-[10px] text-[#10b981]">✓</span>
        <span className="text-[10px] font-mono">
          <span className="text-[#10b981] font-bold">{stats.executed}</span>
          <span className="text-[#475569]"> executed</span>
        </span>
      </div>

      {/* Failed */}
      {stats.failed > 0 && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[rgba(239,68,68,0.06)] border border-[rgba(239,68,68,0.15)]">
          <span className="text-[10px] text-[#ef4444]">✗</span>
          <span className="text-[10px] font-mono">
            <span className="text-[#f87171] font-bold">{stats.failed}</span>
            <span className="text-[#475569]"> failed</span>
          </span>
        </div>
      )}

      {/* Success rate */}
      {stats.total > 0 && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0d1426] border border-[#1a2540]">
          <div className="w-12 h-1.5 bg-[#1a2540] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${successRate}%`,
                background: successRate > 80 ? '#10b981' : successRate > 60 ? '#f59e0b' : '#ef4444'
              }}
            />
          </div>
          <span className="text-[10px] font-mono text-[#94a3b8]">
            <span className="text-white font-bold">{successRate}%</span>
          </span>
        </div>
      )}

      {/* Avg duration */}
      {stats.avgDuration > 0 && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0d1426] border border-[#1a2540]">
          <span className="text-[10px] text-[#f59e0b]">⏱</span>
          <span className="text-[10px] font-mono text-[#94a3b8]">
            <span className="text-white font-bold">{stats.avgDuration}</span>ms avg
          </span>
        </div>
      )}

      <div className="w-px h-5 bg-[#1a2540] mx-2"/>
    </div>
  )
}
