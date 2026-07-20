import React, { useState, useEffect, useRef } from 'react'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { eventsAPI, logsAPI, rulesAPI, simAPI } from '../api'
import { Card, StatCard, Badge, Button, Spinner } from '../components/common/UI'
import { useAuth } from '../hooks/useAuth'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler)

const chartDefaults = {
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { color: '#1a2540' }, ticks: { color: '#475569', font: { size: 10 } } },
    y: { grid: { color: '#1a2540' }, ticks: { color: '#475569', font: { size: 10 } } },
  },
  maintainAspectRatio: false,
}

function PipelineViz() {
  const stages = [
    { label: 'Observer',    sub: 'EventBus', icon: '👁', color: '#7c3aed', pattern: 'Observer' },
    { label: 'Validation',  sub: 'Step 1',   icon: '✓',  color: '#00d4ff', pattern: 'Chain' },
    { label: 'Rule Match',  sub: 'Step 2',   icon: '⚙',  color: '#00d4ff', pattern: 'Chain' },
    { label: 'Priority',    sub: 'Step 3',   icon: '↑',  color: '#00d4ff', pattern: 'Chain' },
    { label: 'Strategy',    sub: 'Execute',  icon: '⚡', color: '#10b981', pattern: 'Strategy' },
    { label: 'Audit Log',   sub: 'Persist',  icon: '📋', color: '#f59e0b', pattern: 'Output' },
  ]
  const [active, setActive] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setActive(a => (a + 1) % stages.length), 900)
    return () => clearInterval(t)
  }, [])

  return (
    <Card>
      <div className="text-xs font-semibold text-white mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#00d4ff] pulse-green"/>
        Decision Pipeline — Live
      </div>
      <div className="flex items-center gap-0 overflow-x-auto pb-2">
        {stages.map((s, i) => (
          <React.Fragment key={i}>
            <div className={`flex-shrink-0 flex flex-col items-center p-3 rounded-lg border transition-all duration-300 min-w-[90px] ${
              i === active
                ? 'border-current bg-opacity-10'
                : i < active ? 'border-[#10b981] bg-[rgba(16,185,129,0.05)]' : 'border-[#1a2540] bg-[#080d1a]'
            }`} style={{ borderColor: i === active ? s.color : undefined, backgroundColor: i === active ? `${s.color}10` : undefined }}>
              <div className="text-lg mb-1">{s.icon}</div>
              <div className="text-[11px] font-semibold text-white text-center">{s.label}</div>
              <div className="text-[10px] text-[#475569] text-center">{s.sub}</div>
              <div className="text-[9px] mt-1 px-1.5 py-0.5 rounded font-mono" style={{ color: s.color, background: `${s.color}15` }}>{s.pattern}</div>
            </div>
            {i < stages.length - 1 && (
              <div className={`flex-shrink-0 w-6 flex items-center justify-center text-xs transition-colors duration-300 ${i < active ? 'text-[#10b981]' : 'text-[#1a2540]'}`}>→</div>
            )}
          </React.Fragment>
        ))}
      </div>
    </Card>
  )
}

function LiveFeed({ events }) {
  const typeColors = { system: '#00d4ff', user: '#a78bfa', security: '#f87171', performance: '#fbbf24' }
  return (
    <Card className="flex flex-col" style={{ height: '320px' }}>
      <div className="text-xs font-semibold text-white mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#10b981] pulse-green"/>
        Live Event Feed
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {events.length === 0 ? (
          <p className="text-[#334155] text-xs text-center py-8">No events yet — start simulation</p>
        ) : events.slice(0, 20).map((ev, i) => (
          <div key={ev.id || i} className="flex gap-2 items-start fade-slide">
            <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: typeColors[ev.type] }}/>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-white truncate">{ev.title}</span>
                <Badge type={ev.type}/>
              </div>
              <div className="text-[10px] text-[#334155] font-mono mt-0.5">
                {new Date(ev.created_at).toLocaleTimeString()}
              </div>
            </div>
            <Badge type={ev.status}/>
          </div>
        ))}
      </div>
    </Card>
  )
}

export default function DashboardPage() {
  const { isAdmin } = useAuth()
  const [stats,    setStats]    = useState(null)
  const [logStats, setLogStats] = useState(null)
  const [events,   setEvents]   = useState([])
  const [ruleStats,setRuleStats]= useState(null)
  const [simStatus,setSimStatus]= useState(null)
  const [loading,  setLoading]  = useState(true)
  const intervalRef = useRef(null)

  const fetchAll = async () => {
    try {
      const [eStats, lStats, rulesRes, simRes, eventsRes] = await Promise.all([
        eventsAPI.getStats(),
        logsAPI.getStats(),
        rulesAPI.getAll(),
        simAPI.getStatus(),
        eventsAPI.getAll({ limit: 20 }),
      ])
      setStats(eStats.data.data)
      setLogStats(lStats.data.data)
      setRuleStats(rulesRes.data.stats)
      setSimStatus(simRes.data.data)
      setEvents(eventsRes.data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
    intervalRef.current = setInterval(fetchAll, 5000)
    return () => clearInterval(intervalRef.current)
  }, [])

  const toggleSim = async () => {
    try {
      if (simStatus?.simulation?.running) {
        await simAPI.stop()
      } else {
        await simAPI.start({ interval_ms: 4000 })
      }
      fetchAll()
    } catch (err) { console.error(err) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Spinner/>
    </div>
  )

  const byType    = stats?.byType    || []
  const byOutcome = logStats?.byOutcome || []
  const byHour    = stats?.byHour    || []

  const hourChart = {
    labels:   byHour.map(h => h.hour),
    datasets: [{
      label: 'Events',
      data:  byHour.map(h => h.count),
      borderColor: '#00d4ff',
      backgroundColor: 'rgba(0,212,255,0.08)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#00d4ff',
      pointRadius: 3,
    }]
  }

  const typeColors = ['rgba(0,212,255,0.8)','rgba(124,58,237,0.8)','rgba(239,68,68,0.8)','rgba(245,158,11,0.8)']
  const typeChart  = {
    labels:   byType.map(t => t.type),
    datasets: [{
      data:            byType.map(t => t.count),
      backgroundColor: typeColors,
      borderColor:     typeColors.map(c => c.replace('0.8','1')),
      borderWidth: 1,
    }]
  }

  const outcomeColors = { executed: '#10b981', failed: '#ef4444', skipped: '#475569', no_rule_match: '#334155' }
  const outcomeChart  = {
    labels:   byOutcome.map(o => o.outcome),
    datasets: [{
      data:            byOutcome.map(o => o.count),
      backgroundColor: byOutcome.map(o => outcomeColors[o.outcome] || '#334155'),
      borderWidth: 0,
    }]
  }

  const simRunning = simStatus?.simulation?.running

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-[#475569] mt-0.5">Real-time system intelligence overview</p>
        </div>
        {isAdmin && (
          <Button variant={simRunning ? 'danger' : 'success'} onClick={toggleSim}>
            {simRunning ? '■ Stop Simulation' : '▶ Start Simulation'}
          </Button>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Events"    value={stats?.total      || 0}  icon="⚡" color="accent"  delta="All time"/>
        <StatCard label="Active Rules"    value={ruleStats?.active || 0}  icon="⚙" color="purple"  delta={`of ${ruleStats?.total || 0} total`}/>
        <StatCard label="Actions Executed" value={logStats?.byOutcome?.find(o=>o.outcome==='executed')?.count || 0} icon="✓" color="green" delta="Pipeline executions"/>
        <StatCard label="Pipeline Runs"   value={logStats?.total   || 0}  icon="📋" color="yellow" delta="Decision logs"/>
      </div>

      {/* Pipeline Visualizer */}
      <PipelineViz/>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <div className="text-xs font-semibold text-white mb-3">Event Frequency — Last 24h</div>
          <div style={{ height: 200 }}>
            {byHour.length > 0
              ? <Line data={hourChart} options={chartDefaults}/>
              : <div className="flex items-center justify-center h-full text-[#334155] text-xs">No hourly data yet</div>
            }
          </div>
        </Card>
        <Card>
          <div className="text-xs font-semibold text-white mb-3">Events by Type</div>
          <div style={{ height: 200 }}>
            {byType.length > 0
              ? <Doughnut data={typeChart} options={{ ...chartDefaults, scales: undefined, plugins: { legend: { display: true, position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 }, padding: 8 } } } }}/>
              : <div className="flex items-center justify-center h-full text-[#334155] text-xs">No events yet</div>
            }
          </div>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <LiveFeed events={events}/>
        <Card>
          <div className="text-xs font-semibold text-white mb-3">Pipeline Outcomes</div>
          <div style={{ height: 200 }}>
            {byOutcome.length > 0
              ? <Doughnut data={outcomeChart} options={{ ...chartDefaults, scales: undefined, plugins: { legend: { display: true, position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 }, padding: 8 } } } }}/>
              : <div className="flex items-center justify-center h-full text-[#334155] text-xs">No decisions yet</div>
            }
          </div>
        </Card>
        <Card>
          <div className="text-xs font-semibold text-white mb-3">Top Rules by Executions</div>
          <div className="space-y-2 mt-2">
            {(logStats?.topRules || []).length === 0
              ? <p className="text-[#334155] text-xs text-center py-8">No executions yet</p>
              : (logStats?.topRules || []).map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-[#334155] w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white truncate">{r.name}</div>
                    <div className="mt-0.5 h-1 bg-[#1a2540] rounded-full overflow-hidden">
                      <div className="h-full bg-[#00d4ff] rounded-full" style={{ width: `${Math.min(100, (r.executions / (logStats?.topRules?.[0]?.executions || 1)) * 100)}%` }}/>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-[#00d4ff]">{r.executions}</span>
                </div>
              ))
            }
          </div>
        </Card>
      </div>
    </div>
  )
}
