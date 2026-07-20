import React from 'react'

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, className = '' }) {
  return (
    <div className={`bg-[#0a1020] border border-[#1a2540] rounded-xl p-5 ${className}`}>
      {children}
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, icon, color = 'accent', delta }) {
  const colors = {
    accent:  'text-[#00d4ff]',
    purple:  'text-[#a78bfa]',
    green:   'text-[#10b981]',
    yellow:  'text-[#f59e0b]',
    red:     'text-[#ef4444]',
  }
  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xl">{icon}</span>
        <span className={`text-[10px] font-mono uppercase tracking-widest ${colors[color]} bg-[#0d1426] px-2 py-0.5 rounded`}>{label}</span>
      </div>
      <div className={`text-3xl font-bold font-mono tracking-tight ${colors[color]}`}>{value}</div>
      {delta && <div className="text-xs text-[#475569] mt-1">{delta}</div>}
    </Card>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ type }) {
  const map = {
    system:      'bg-[rgba(0,212,255,0.1)]  text-[#00d4ff] border-[rgba(0,212,255,0.2)]',
    user:        'bg-[rgba(124,58,237,0.1)] text-[#a78bfa] border-[rgba(124,58,237,0.2)]',
    security:    'bg-[rgba(239,68,68,0.1)]  text-[#f87171] border-[rgba(239,68,68,0.2)]',
    performance: 'bg-[rgba(245,158,11,0.1)] text-[#fbbf24] border-[rgba(245,158,11,0.2)]',
    executed:    'bg-[rgba(16,185,129,0.1)] text-[#10b981] border-[rgba(16,185,129,0.2)]',
    failed:      'bg-[rgba(239,68,68,0.1)]  text-[#f87171] border-[rgba(239,68,68,0.2)]',
    skipped:     'bg-[rgba(71,85,105,0.1)]  text-[#94a3b8] border-[#1a2540]',
    no_rule_match:'bg-[rgba(71,85,105,0.1)] text-[#94a3b8] border-[#1a2540]',
    pending:     'bg-[rgba(245,158,11,0.1)] text-[#fbbf24] border-[rgba(245,158,11,0.2)]',
    resolved:    'bg-[rgba(16,185,129,0.1)] text-[#10b981] border-[rgba(16,185,129,0.2)]',
    processing:  'bg-[rgba(0,212,255,0.1)]  text-[#00d4ff] border-[rgba(0,212,255,0.2)]',
    ignored:     'bg-[rgba(71,85,105,0.1)]  text-[#475569] border-[#1a2540]',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono border ${map[type] || map.skipped}`}>
      {type}
    </span>
  )
}

// ── Button ────────────────────────────────────────────────────────────────────
export function Button({ children, onClick, variant = 'default', size = 'md', disabled, className = '', type = 'button' }) {
  const variants = {
    default: 'bg-[#0d1426] border border-[#243050] text-[#94a3b8] hover:text-white hover:border-[#243050]',
    primary: 'bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.3)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.2)]',
    danger:  'bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#f87171] hover:bg-[rgba(239,68,68,0.2)]',
    success: 'bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)] text-[#10b981] hover:bg-[rgba(16,185,129,0.2)]',
    purple:  'bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.3)] text-[#a78bfa] hover:bg-[rgba(124,58,237,0.2)]',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-sm',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-lg font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({ label, ...props }) {
  return (
    <div>
      {label && <label className="block text-[11px] text-[#475569] uppercase tracking-widest mb-1.5 font-medium">{label}</label>}
      <input
        {...props}
        className="w-full bg-[#0d1426] border border-[#1a2540] text-white text-sm px-3 py-2 rounded-lg outline-none focus:border-[#00d4ff] transition-colors placeholder:text-[#334155]"
      />
    </div>
  )
}

// ── Select ────────────────────────────────────────────────────────────────────
export function Select({ label, children, ...props }) {
  return (
    <div>
      {label && <label className="block text-[11px] text-[#475569] uppercase tracking-widest mb-1.5 font-medium">{label}</label>}
      <select
        {...props}
        className="w-full bg-[#0d1426] border border-[#1a2540] text-white text-sm px-3 py-2 rounded-lg outline-none focus:border-[#00d4ff] transition-colors"
      >
        {children}
      </select>
    </div>
  )
}

// ── Toggle ────────────────────────────────────────────────────────────────────
export function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${checked ? 'bg-[#00d4ff]' : 'bg-[#1a2540]'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}/>
    </button>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ title, children, onClose, footer }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-slide">
      <div className="bg-[#080d1a] border border-[#243050] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-[#1a2540]">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-[#475569] hover:text-white transition-colors">✕</button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 p-5 pt-0">{footer}</div>}
      </div>
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner() {
  return <div className="w-5 h-5 border-2 border-[#00d4ff] border-t-transparent rounded-full spin"/>
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function Empty({ message = 'No data found' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-[#334155]">
      <div className="text-4xl mb-3">⬡</div>
      <p className="text-sm">{message}</p>
    </div>
  )
}

// ── Page Header ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-sm text-[#475569] mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
