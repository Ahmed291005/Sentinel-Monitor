import React, { useState, useEffect } from 'react'
import { analyticsAPI } from '../api'

const TAG_COLORS = {
  'View':             'bg-blue-900/40 text-blue-300 border-blue-700/50',
  'Stored Procedure': 'bg-purple-900/40 text-purple-300 border-purple-700/50',
  'Trigger':          'bg-red-900/40 text-red-300 border-red-700/50',
  'ROLLUP':           'bg-amber-900/40 text-amber-300 border-amber-700/50',
  'CUBE':             'bg-orange-900/40 text-orange-300 border-orange-700/50',
  'Set Operation':    'bg-teal-900/40 text-teal-300 border-teal-700/50',
  'Subquery':         'bg-pink-900/40 text-pink-300 border-pink-700/50',
}

function Tag({ label }) {
  return (
    <span className={`text-[10px] font-mono border px-2 py-0.5 rounded-full font-semibold ${TAG_COLORS[label] || 'bg-slate-800 text-slate-400 border-slate-600'}`}>
      {label}
    </span>
  )
}

function Card({ title, tag, icon, children, loading }) {
  return (
    <div className="bg-[#080d1a] border border-[#1a2540] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a2540]">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
        </div>
        <Tag label={tag} />
      </div>
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-[#00d4ff] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : children}
      </div>
    </div>
  )
}

function HeroStat({ label, value, sub, color = '#00d4ff' }) {
  return (
    <div className="bg-[#080d1a] border border-[#1a2540] rounded-xl p-4">
      <div className="text-[11px] text-[#475569] font-mono uppercase tracking-wider mb-1">{label}</div>
      <div className="text-3xl font-bold" style={{ color }}>{value ?? '—'}</div>
      {sub && <div className="text-[11px] text-[#475569] mt-1">{sub}</div>}
    </div>
  )
}

function MiniBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="mb-2">
      <div className="flex justify-between text-[11px] text-[#94a3b8] mb-1">
        <span>{label}</span><span className="font-mono">{value}</span>
      </div>
      <div className="h-1.5 bg-[#1a2540] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color || '#00d4ff' }} />
      </div>
    </div>
  )
}

const OUTCOME_COLORS = { executed: '#10b981', failed: '#f87171', skipped: '#f59e0b', no_rule_match: '#6366f1' }

export default function AnalyticsPage() {
  const [summary, setSummary]     = useState(null)
  const [rollup, setRollup]       = useState([])
  const [cube, setCube]           = useState([])
  const [topRules, setTopRules]   = useState([])
  const [untriggered, setUntrig]  = useState([])
  const [alerts, setAlerts]       = useState([])
  const [timeline, setTimeline]   = useState([])
  const [loading, setLoading]     = useState({})

  const load = (key, fn, setter) => {
    setLoading(p => ({ ...p, [key]: true }))
    fn().then(r => setter(r.data)).catch(() => {}).finally(() => setLoading(p => ({ ...p, [key]: false })))
  }

  useEffect(() => {
    load('summary',     analyticsAPI.getSummary,      setSummary)
    load('rollup',      analyticsAPI.getRollup,        setRollup)
    load('cube',        analyticsAPI.getCube,          setCube)
    load('topRules',    analyticsAPI.getTopRules,      setTopRules)
    load('untriggered', analyticsAPI.getUntriggered,   setUntrig)
    load('alerts',      analyticsAPI.getActiveAlerts,  setAlerts)
    load('timeline',    analyticsAPI.getTimeline,      setTimeline)
  }, [])

  // Parse ROLLUP — exclude ALL rows for the chart
  const rollupChart = rollup.filter(r => r.event_type !== 'ALL' && r.event_date !== 'ALL')
  const rollupMax   = Math.max(...rollupChart.map(r => r.total_events), 1)

  // Parse CUBE — only the grand totals per event_type
  const cubeByType  = cube.filter(r => r.outcome === 'ALL' && r.event_type !== 'ALL')
  const cubeMax     = Math.max(...cubeByType.map(r => r.total), 1)

  // Top rules max
  const rulesMax    = Math.max(...topRules.map(r => r.total_executions), 1)

  return (
    <div className="p-5 space-y-6 min-h-full" style={{ background: 'linear-gradient(135deg,#050810 0%,#070c18 100%)' }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">📊</span> DBMS Analytics Lab
          </h1>
          <p className="text-[12px] text-[#475569] mt-0.5 font-mono">
            Views · Stored Procedures · Triggers · ROLLUP · CUBE · Subqueries · Set Operations
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {Object.entries(TAG_COLORS).map(([label]) => <Tag key={label} label={label} />)}
        </div>
      </div>

      {/* Hero Stats (Subquery-powered) */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Tag label="Subquery" /><span className="text-[11px] text-[#475569] font-mono">Scalar subqueries in SELECT compute each stat independently</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <HeroStat label="Total Events"      value={summary?.total_events}      color="#00d4ff" />
          <HeroStat label="Active Rules"      value={summary?.active_rules}       color="#10b981" />
          <HeroStat label="Total Decisions"   value={summary?.total_decisions}    color="#a78bfa" />
          <HeroStat label="Avg Response (ms)" value={summary ? Math.round(summary.avg_response_ms) : null} color="#f59e0b" />
          <HeroStat label="Pending Events"    value={summary?.pending_events}     color="#f87171" />
          <HeroStat label="Executed"          value={summary?.executed}           color="#10b981" />
          <HeroStat label="Failed"            value={summary?.failed}             color="#f87171" />
          <HeroStat label="Untriggered Rules" value={summary?.untriggered_rules}  color="#6366f1" sub="Rules never fired" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ROLLUP */}
        <Card title="Events by Type × Date (Last 30 Days)" tag="ROLLUP" icon="📈" loading={loading.rollup}>
          <p className="text-[11px] text-[#475569] font-mono mb-3">
            GROUP BY ROLLUP(type, date) — subtotals included per type per day
          </p>
          {rollupChart.length === 0 ? (
            <p className="text-[#334155] text-sm text-center py-4">No data yet — create some events first</p>
          ) : (
            rollupChart.slice(0, 10).map((r, i) => (
              <MiniBar key={i} label={`${r.event_type} · ${r.event_date}`} value={r.total_events} max={rollupMax} color="#00d4ff" />
            ))
          )}
        </Card>

        {/* CUBE */}
        <Card title="Event Types Cross-Analysis" tag="CUBE" icon="🧊" loading={loading.cube}>
          <p className="text-[11px] text-[#475569] font-mono mb-3">
            GROUP BY CUBE(type, outcome) — all dimension combinations
          </p>
          {cubeByType.length === 0 ? (
            <p className="text-[#334155] text-sm text-center py-4">No data yet</p>
          ) : (
            cubeByType.map((r, i) => (
              <MiniBar key={i} label={r.event_type} value={r.total} max={cubeMax} color="#a78bfa" />
            ))
          )}
          {cube.filter(r => r.event_type === 'ALL' && r.outcome === 'ALL')[0] && (
            <div className="mt-3 pt-3 border-t border-[#1a2540] text-[11px] text-[#475569] font-mono">
              Grand Total (CUBE): <span className="text-white">{cube.find(r => r.event_type === 'ALL' && r.outcome === 'ALL')?.total}</span>
            </div>
          )}
        </Card>

        {/* Top Rules — VIEW: vw_TopRules */}
        <Card title="Top Rules Leaderboard" tag="View" icon="🏆" loading={loading.topRules}>
          <p className="text-[11px] text-[#475569] font-mono mb-3">
            Source: <code className="text-[#00d4ff]">vw_TopRules</code> — pre-aggregated rule rankings
          </p>
          {topRules.length === 0 ? (
            <p className="text-[#334155] text-sm text-center py-4">No rules executed yet</p>
          ) : (
            topRules.map((r, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <span className="text-[10px] text-[#475569] font-mono w-4">{i + 1}</span>
                <div className="flex-1">
                  <MiniBar label={r.rule_name} value={r.total_executions} max={rulesMax} color="#10b981" />
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${r.enabled ? 'text-green-400 bg-green-900/30' : 'text-red-400 bg-red-900/30'}`}>
                  {r.enabled ? 'ON' : 'OFF'}
                </span>
              </div>
            ))
          )}
        </Card>

        {/* Untriggered Rules — Correlated Subquery */}
        <Card title="Rules That Never Fired" tag="Subquery" icon="😴" loading={loading.untriggered}>
          <p className="text-[11px] text-[#475569] font-mono mb-3">
            Correlated subquery: WHERE (SELECT COUNT(*) FROM decision_logs WHERE rule_id = r.id) = 0
          </p>
          {untriggered.length === 0 ? (
            <p className="text-[#10b981] text-sm text-center py-4">✓ All rules have been triggered</p>
          ) : (
            <div className="space-y-2">
              {untriggered.map((r, i) => (
                <div key={i} className="flex items-center justify-between bg-[#0d1426] border border-[#1a2540] rounded-lg px-3 py-2">
                  <div>
                    <div className="text-xs text-white font-medium">{r.name}</div>
                    <div className="text-[10px] text-[#475569] font-mono">{r.event_type} · priority {r.priority}</div>
                  </div>
                  <span className="text-[10px] text-amber-400 bg-amber-900/20 border border-amber-700/30 px-2 py-0.5 rounded font-mono">IDLE</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Active Alerts — VIEW: vw_ActiveAlerts */}
        <Card title="Active Alerts (Live View)" tag="View" icon="🔴" loading={loading.alerts}>
          <p className="text-[11px] text-[#475569] font-mono mb-3">
            Source: <code className="text-[#00d4ff]">vw_ActiveAlerts</code> — pending + processing events
          </p>
          {alerts.length === 0 ? (
            <p className="text-[#10b981] text-sm text-center py-4">✓ No active alerts</p>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {alerts.map((a, i) => (
                <div key={i} className="flex items-start gap-2 bg-[#0d1426] border border-[#1a2540] rounded-lg px-3 py-2">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${a.status === 'pending' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white truncate">{a.title}</div>
                    <div className="text-[10px] text-[#475569] font-mono">{a.event_type} · {a.age_minutes}m ago</div>
                  </div>
                  <span className="text-[9px] text-[#475569] font-mono">{a.created_by || 'system'}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* UNION Timeline — Set Operation */}
        <Card title="Unified Activity Timeline" tag="Set Operation" icon="🔗" loading={loading.timeline}>
          <p className="text-[11px] text-[#475569] font-mono mb-3">
            UNION ALL — events ∪ decision_logs combined in one result set
          </p>
          <div className="space-y-1.5 max-h-52 overflow-y-auto">
            {timeline.length === 0 ? (
              <p className="text-[#334155] text-sm text-center py-4">No activity yet</p>
            ) : (
              timeline.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] flex-shrink-0 ${t.source_table === 'Event' ? 'bg-blue-900/40 text-blue-300' : 'bg-purple-900/40 text-purple-300'}`}>
                    {t.source_table === 'Event' ? 'EVT' : 'LOG'}
                  </span>
                  <span className="text-[#94a3b8] flex-1 truncate">{t.description}</span>
                  <span className="text-[#334155] font-mono flex-shrink-0">{new Date(t.created_at).toLocaleTimeString()}</span>
                </div>
              ))
            )}
          </div>
        </Card>

      </div>

      {/* DBMS Concepts Reference */}
      <div className="bg-[#080d1a] border border-[#1a2540] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <span>📚</span> DBMS Lab Topics — Live Implementation Map
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { topic: 'SELECT + WHERE',        impl: 'All 6 models — parameterized queries with dynamic WHERE clauses', tag: 'View' },
            { topic: 'ORDER BY',              impl: 'Events: ORDER BY created_at DESC · Rules: ORDER BY priority ASC', tag: 'View' },
            { topic: 'GROUP BY + Aggregates', impl: 'Dashboard stats: COUNT, SUM, AVG grouped by type/outcome', tag: 'View' },
            { topic: 'SQL Functions',         impl: 'GETDATE(), FORMAT(), DATEADD(), DATEDIFF(), AVG(), COUNT()', tag: 'View' },
            { topic: 'JOINs',                 impl: 'DecisionLogs: 4-table JOIN (events + rules + actions + users)', tag: 'View' },
            { topic: 'Set Operations',        impl: 'UNION ALL of events + decision_logs → unified timeline', tag: 'Set Operation' },
            { topic: 'Subqueries',            impl: 'Correlated: rules never triggered · Scalar: per-event stats', tag: 'Subquery' },
            { topic: 'DDL + Constraints',     impl: 'CHECK, UNIQUE, NOT NULL, IDENTITY on all 6 tables', tag: 'View' },
            { topic: 'DML',                   impl: 'INSERT/UPDATE/DELETE in every model file', tag: 'View' },
            { topic: 'Indexes',               impl: '15+ indexes: idx_events_type, idx_dlogs_outcome, etc.', tag: 'View' },
            { topic: 'Views',                 impl: 'vw_ActiveAlerts · vw_PipelineSummary · vw_TopRules', tag: 'View' },
            { topic: 'Stored Procedures',     impl: 'sp_GetDashboardStats · sp_ProcessEvent · sp_CleanOldLogs', tag: 'Stored Procedure' },
            { topic: 'Triggers',              impl: 'trg_AfterEventInsert · trg_AfterRuleUpdate (audit log)', tag: 'Trigger' },
            { topic: 'ROLLUP + CUBE',         impl: 'Events by type×date (ROLLUP) · outcome×type analysis (CUBE)', tag: 'ROLLUP' },
            { topic: 'Connectivity + CRUD',   impl: 'mssql npm package · full CRUD via REST API', tag: 'View' },
          ].map((item, i) => (
            <div key={i} className="bg-[#0d1426] border border-[#1a2540] rounded-lg px-3 py-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-white">{item.topic}</span>
                <Tag label={item.tag} />
              </div>
              <p className="text-[10px] text-[#475569] leading-relaxed">{item.impl}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
