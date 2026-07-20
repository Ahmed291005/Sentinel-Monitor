import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { NotifProvider } from '../../hooks/useNotifications'
import NotificationBell from './NotificationBell'
import LiveActivityBar  from './LiveActivityBar'

const navItems = [
  { to: '/',          icon: '⬡', label: 'Dashboard',      end: true },
  { to: '/events',    icon: '⚡', label: 'Events' },
  { to: '/rules',     icon: '⚙', label: 'Rules Engine' },
  { to: '/logs',      icon: '📋', label: 'Audit Logs' },
  { divider: true,    label: 'MONITORING' },
  { to: '/monitor',   icon: '🖥', label: 'System Monitor', badge: 'REAL' },
  { to: '/agent',     icon: '📡', label: 'Real Agent',     badge: 'LIVE' },
  { divider: true,    label: 'DATABASE' },
  { to: '/analytics', icon: '📊', label: 'DBMS Analytics', badge: 'DBMS' },
]

export default function Layout() {
  const { user, logout, isAdmin } = useAuth()
  const navigate    = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <NotifProvider>
      <div className="flex h-screen overflow-hidden bg-[#050810]">

        {/* ── SIDEBAR ── */}
        <aside className={`flex flex-col bg-[#080d1a] border-r border-[#1a2540] transition-all duration-200 flex-shrink-0 ${collapsed ? 'w-16' : 'w-58'}`}
               style={{ width: collapsed ? '64px' : '224px' }}>

          {/* Logo */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-[#1a2540]">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7c3aed] to-[#00d4ff] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-lg shadow-[#7c3aed]/20">S</div>
            {!collapsed && (
              <div>
                <div className="text-sm font-bold text-white tracking-wide">SENTINEL</div>
                <div className="text-[10px] text-[#334155] font-mono">Autonomous Intelligence</div>
              </div>
            )}
            <button onClick={() => setCollapsed(!collapsed)} className="ml-auto text-[#334155] hover:text-[#94a3b8] transition-colors text-xs p-1 flex-shrink-0">
              {collapsed ? '→' : '←'}
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto">
            {navItems.map((item, i) => {
              if (item.divider) return !collapsed ? (
                <div key={i} className="text-[9px] text-[#1e293b] uppercase tracking-widest px-3 pt-4 pb-1 font-semibold">{item.label}</div>
              ) : <div key={i} className="my-2 mx-3 h-px bg-[#1a2540]"/>

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-[rgba(0,212,255,0.08)] text-[#00d4ff] border border-[rgba(0,212,255,0.12)]'
                        : 'text-[#64748b] hover:bg-[#0d1426] hover:text-[#94a3b8]'
                    }`
                  }
                >
                  <span className="text-base w-5 text-center flex-shrink-0">{item.icon}</span>
                  {!collapsed && <span className="flex-1 text-sm">{item.label}</span>}
                  {item.badge && !collapsed && (
                    <span className="text-[9px] bg-[rgba(16,185,129,0.12)] text-[#10b981] border border-[rgba(16,185,129,0.2)] px-1.5 py-0.5 rounded font-mono">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              )
            })}
          </nav>

          {/* User */}
          <div className="p-3 border-t border-[#1a2540]">
            {!collapsed ? (
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#0d1426] border border-[#1a2540]">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#00d4ff] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {user?.username?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{user?.username}</div>
                  <div className="text-[10px] text-[#334155] capitalize font-mono">{user?.role}</div>
                </div>
                <button onClick={handleLogout} title="Sign out"
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-[#334155] hover:text-[#f87171] hover:bg-[rgba(239,68,68,0.1)] transition-all text-xs">
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex justify-center">
                <div onClick={handleLogout} title="Sign out" className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#00d4ff] flex items-center justify-center text-xs font-bold text-white cursor-pointer">
                  {user?.username?.[0]?.toUpperCase()}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* Topbar */}
          <header className="flex items-center px-5 py-2.5 bg-[#080d1a] border-b border-[#1a2540] gap-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#10b981] pulse-green flex-shrink-0"/>
              <span className="text-[10px] text-[#475569] font-mono hidden sm:block">ENGINE ACTIVE</span>
            </div>
            <LiveActivityBar/>
            <div className="ml-auto flex items-center gap-2">
              {isAdmin && (
                <span className="hidden sm:inline text-[10px] bg-[rgba(124,58,237,0.12)] text-[#a78bfa] border border-[rgba(124,58,237,0.2)] px-2 py-1 rounded-full font-mono">
                  ADMIN
                </span>
              )}
              <span className="text-[10px] text-[#334155] font-mono hidden md:block">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <NotificationBell/>
            </div>
          </header>

          <main className="flex-1 overflow-auto"><Outlet/></main>
        </div>
      </div>
    </NotifProvider>
  )
}
