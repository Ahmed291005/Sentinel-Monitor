import React, { useRef, useEffect } from 'react'
import { useNotif } from '../../hooks/useNotifications'

const outcomeColors = {
  executed:      { bg: 'bg-[rgba(16,185,129,0.1)]',  border: 'border-[rgba(16,185,129,0.2)]',  dot: 'bg-[#10b981]', text: 'text-[#10b981]' },
  failed:        { bg: 'bg-[rgba(239,68,68,0.1)]',   border: 'border-[rgba(239,68,68,0.2)]',   dot: 'bg-[#ef4444]', text: 'text-[#ef4444]' },
  no_rule_match: { bg: 'bg-[rgba(71,85,105,0.1)]',   border: 'border-[#1a2540]',               dot: 'bg-[#475569]', text: 'text-[#475569]' },
  skipped:       { bg: 'bg-[rgba(71,85,105,0.1)]',   border: 'border-[#1a2540]',               dot: 'bg-[#475569]', text: 'text-[#475569]' },
}

const typeIcons = {
  system:      '🖥',
  security:    '🛡',
  performance: '⚡',
  user:        '👤',
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)  return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

export default function NotificationBell() {
  const { notifications, unreadCount, isOpen, setIsOpen, markAllRead, clearAll } = useNotif()
  const dropdownRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleOpen = () => {
    setIsOpen(!isOpen)
    if (!isOpen && unreadCount > 0) {
      setTimeout(markAllRead, 1500)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>

      {/* Bell Button */}
      <button
        onClick={handleOpen}
        className={`relative flex items-center justify-center w-9 h-9 rounded-lg border transition-all duration-150 ${
          isOpen
            ? 'bg-[rgba(0,212,255,0.1)] border-[rgba(0,212,255,0.3)]'
            : 'bg-[#0d1426] border-[#1a2540] hover:border-[#243050]'
        }`}
      >
        {/* Bell icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isOpen ? '#00d4ff' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#ef4444] text-white text-[9px] font-bold rounded-full flex items-center justify-center font-mono animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-11 w-80 bg-[#080d1a] border border-[#1a2540] rounded-xl shadow-2xl shadow-black/50 z-50 fade-slide overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a2540]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">Pipeline Alerts</span>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-[rgba(239,68,68,0.15)] text-[#f87171] border border-[rgba(239,68,68,0.2)] px-1.5 py-0.5 rounded-full font-mono">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {notifications.length > 0 && (
                <>
                  <button onClick={markAllRead} className="text-[10px] text-[#475569] hover:text-[#00d4ff] transition-colors font-mono">
                    mark read
                  </button>
                  <span className="text-[#334155]">·</span>
                  <button onClick={clearAll} className="text-[10px] text-[#475569] hover:text-[#f87171] transition-colors font-mono">
                    clear
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-[#334155]">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-2 opacity-40">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <p className="text-xs">No pipeline alerts yet</p>
                <p className="text-[10px] mt-1 opacity-60">Create events to see activity</p>
              </div>
            ) : (
              notifications.map((notif, i) => {
                const colors = outcomeColors[notif.outcome] || outcomeColors.skipped
                return (
                  <div
                    key={notif.id + '-' + i}
                    className={`flex gap-3 px-4 py-3 border-b border-[#1a2540] transition-colors hover:bg-[#0d1426] ${
                      !notif.read ? 'bg-[rgba(0,212,255,0.02)]' : ''
                    }`}
                  >
                    {/* Dot + icon */}
                    <div className="flex flex-col items-center gap-1 flex-shrink-0 mt-0.5">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${!notif.read ? colors.dot : 'bg-[#1a2540]'}`}/>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm">{typeIcons[notif.eventType] || '⚡'}</span>
                        <span className="text-xs font-medium text-white truncate">{notif.title}</span>
                      </div>
                      {notif.rule && (
                        <div className="text-[10px] text-[#475569] font-mono mb-1 truncate">
                          Rule: {notif.rule}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${colors.bg} ${colors.border} ${colors.text}`}>
                          {notif.outcome}
                        </span>
                        <span className="text-[10px] text-[#334155] font-mono">
                          {timeAgo(notif.time)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-[#1a2540] bg-[#050810]">
              <p className="text-[10px] text-[#334155] text-center font-mono">
                {notifications.length} pipeline decision{notifications.length !== 1 ? 's' : ''} recorded
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
