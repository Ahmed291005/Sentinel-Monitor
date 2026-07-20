import React, { useState, useEffect, useRef } from 'react'
import { Card, StatCard, Button, Spinner, PageHeader } from '../components/common/UI'
import { useAuth } from '../hooks/useAuth'
import api from '../api/axios'

function MetricBar({ label, value, max = 100, color = '#00d4ff', unit = '%' }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const barColor = pct > 85 ? '#ef4444' : pct > 70 ? '#f59e0b' : color

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-[#94a3b8]">{label}</span>
        <span className="text-xs font-mono font-bold" style={{ color: barColor }}>
          {value}{unit}
        </span>
      </div>
      <div className="h-2 bg-[#0d1426] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
    </div>
  )
}

function LiveMetricCard({ metrics }) {
  if (!metrics) return null
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* CPU */}
      <Card>
        <div className="text-xs font-semibold text-white mb-4 flex items-center gap-2">
          <span>⚙</span> CPU Information
        </div>
        <MetricBar label="Load Average (1 min)" value={metrics.cpu?.load_avg_1min} max={metrics.cpu?.count || 4} unit=""/>
        <div className="space-y-2 mt-3 text-xs">
          <div className="flex justify-between">
            <span className="text-[#475569]">CPU Cores</span>
            <span className="text-white font-mono">{metrics.cpu?.count}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#475569]">Model</span>
            <span className="text-white font-mono text-right max-w-[200px] truncate">{metrics.cpu?.model}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#475569]">Load (5 min)</span>
            <span className="text-white font-mono">{metrics.cpu?.load_avg_5min}</span>
          </div>
        </div>
      </Card>

      {/* Memory */}
      <Card>
        <div className="text-xs font-semibold text-white mb-4 flex items-center gap-2">
          <span>💾</span> Memory
        </div>
        <MetricBar
          label="RAM Usage"
          value={metrics.memory?.used_pct}
          color="#7c3aed"
          unit="%"
        />
        <div className="space-y-2 mt-3 text-xs">
          <div className="flex justify-between">
            <span className="text-[#475569]">Total RAM</span>
            <span className="text-white font-mono">{metrics.memory?.total_gb} GB</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#475569]">Free RAM</span>
            <span className="text-[#10b981] font-mono">{metrics.memory?.free_gb} GB</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#475569]">Used</span>
            <span className="text-[#f87171] font-mono">
              {Math.round((metrics.memory?.total_gb - metrics.memory?.free_gb) * 10) / 10} GB
            </span>
          </div>
        </div>
      </Card>

      {/* System */}
      <Card>
        <div className="text-xs font-semibold text-white mb-4 flex items-center gap-2">
          <span>🖥</span> System Info
        </div>
        <div className="space-y-2 text-xs">
          {[
            { label: 'Hostname',     value: metrics.hostname },
            { label: 'Platform',     value: metrics.platform },
            { label: 'Architecture', value: metrics.arch },
            { label: 'Uptime',       value: `${metrics.system?.uptime_hours}h` },
            { label: 'Node.js',      value: metrics.system?.node_version },
            { label: 'Process ID',   value: metrics.system?.pid },
            { label: 'Process RAM',  value: `${metrics.system?.memory_rss_mb} MB` },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between py-1 border-b border-[#1a2540]">
              <span className="text-[#475569]">{label}</span>
              <span className="text-white font-mono">{value}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Agent Status */}
      <Card>
        <div className="text-xs font-semibold text-white mb-4 flex items-center gap-2">
          <span>📡</span> Agent Status
        </div>
        <div className="text-center py-6">
          <div className="text-4xl mb-3">✓</div>
          <div className="text-sm font-semibold text-[#10b981]">Real Metrics Active</div>
          <div className="text-xs text-[#475569] mt-2">Reading from actual OS</div>
          <div className="text-[10px] text-[#334155] font-mono mt-1">{metrics.timestamp}</div>
        </div>
      </Card>
    </div>
  )
}

export default function AgentPage() {
  const { isAdmin }  = useAuth()
  const [metrics,    setMetrics]    = useState(null)
  const [agentStatus,setAgentStatus]= useState(null)
  const [loading,    setLoading]    = useState(true)
  const [starting,   setStarting]   = useState(false)
  const [history,    setHistory]    = useState([])
  const intervalRef  = useRef(null)

  const [thresholds, setThresholds] = useState({
    cpu_usage:       70,
    memory_usage:    80,
    response_time_ms:1000,
  })

  const fetchMetrics = async () => {
    try {
      const [metricsRes, statusRes] = await Promise.all([
        api.get('/agent/metrics'),
        api.get('/agent/status'),
      ])
      const m = metricsRes.data.data
      setMetrics(m)
      setAgentStatus(statusRes.data.data)

      // Keep history of last 20 readings for mini chart
      setHistory(prev => {
        const next = [...prev, {
          time:   new Date().toLocaleTimeString(),
          cpu:    m.cpu?.load_avg_1min || 0,
          memory: m.memory?.used_pct  || 0,
        }]
        return next.slice(-20)
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    intervalRef.current = setInterval(fetchMetrics, 3000)
    return () => clearInterval(intervalRef.current)
  }, [])

  const startAgent = async () => {
    setStarting(true)
    try {
      await api.post('/agent/start', {
        interval_ms: 5000,
        thresholds,
      })
      fetchMetrics()
    } catch (err) { console.error(err) }
    finally { setStarting(false) }
  }

  const stopAgent = async () => {
    try {
      await api.post('/agent/stop')
      fetchMetrics()
    } catch (err) { console.error(err) }
  }

  const isRunning = agentStatus?.running

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title="Real System Agent"
        subtitle="Live OS metrics — actual CPU, memory, uptime from your machine"
        actions={
          isAdmin && (
            <div className="flex gap-2">
              {!isRunning ? (
                <Button variant="success" onClick={startAgent} disabled={starting}>
                  {starting ? <Spinner/> : '▶'} Start Agent
                </Button>
              ) : (
                <Button variant="danger" onClick={stopAgent}>■ Stop Agent</Button>
              )}
            </div>
          )
        }
      />

      {/* Agent running banner */}
      {isRunning && (
        <div className="flex items-center gap-3 p-4 bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.2)] rounded-xl fade-slide">
          <div className="w-3 h-3 rounded-full bg-[#10b981] pulse-green flex-shrink-0"/>
          <div>
            <div className="text-sm font-semibold text-[#10b981]">Real Agent is Running</div>
            <div className="text-xs text-[#475569]">
              Reading actual OS metrics every {agentStatus?.interval_ms / 1000}s —
              {agentStatus?.collected} readings taken —
              {agentStatus?.eventsCreated} real events fired into pipeline
            </div>
          </div>
        </div>
      )}

      {/* Thresholds config */}
      {isAdmin && !isRunning && (
        <Card>
          <div className="text-xs font-semibold text-white mb-4">Configure Alert Thresholds</div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { key: 'cpu_usage',        label: 'CPU Alert %',          min: 10,  max: 100 },
              { key: 'memory_usage',     label: 'Memory Alert %',       min: 10,  max: 100 },
              { key: 'response_time_ms', label: 'Response Time (ms)',   min: 100, max: 10000 },
            ].map(({ key, label, min, max }) => (
              <div key={key}>
                <label className="block text-[11px] text-[#475569] uppercase tracking-widest mb-1.5">{label}</label>
                <input
                  type="number"
                  min={min}
                  max={max}
                  value={thresholds[key]}
                  onChange={e => setThresholds(t => ({ ...t, [key]: +e.target.value }))}
                  className="w-full bg-[#0d1426] border border-[#1a2540] text-white text-sm px-3 py-2 rounded-lg outline-none focus:border-[#00d4ff] font-mono"
                />
                <p className="text-[10px] text-[#334155] mt-1">
                  Fire event if above this value
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Stat cards */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="CPU Load"
            value={`${metrics.cpu?.load_avg_1min}`}
            icon="⚙"
            color={metrics.cpu?.load_avg_1min > 2 ? 'red' : 'accent'}
            delta="1-minute load average"
          />
          <StatCard
            label="RAM Used"
            value={`${metrics.memory?.used_pct}%`}
            icon="💾"
            color={metrics.memory?.used_pct > 80 ? 'red' : metrics.memory?.used_pct > 60 ? 'yellow' : 'green'}
            delta={`${metrics.memory?.free_gb}GB free of ${metrics.memory?.total_gb}GB`}
          />
          <StatCard
            label="Uptime"
            value={`${metrics.system?.uptime_hours}h`}
            icon="⏱"
            color="purple"
            delta={`PID ${metrics.system?.pid}`}
          />
          <StatCard
            label="Events Fired"
            value={agentStatus?.eventsCreated || 0}
            icon="⚡"
            color="yellow"
            delta="Real events → pipeline"
          />
        </div>
      )}

      {/* Live metrics */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner/></div>
      ) : (
        <LiveMetricCard metrics={metrics}/>
      )}

      {/* History table */}
      {history.length > 0 && (
        <Card>
          <div className="text-xs font-semibold text-white mb-3">Recent Readings History</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1a2540]">
                  <th className="text-left py-2 px-3 text-[#475569] font-medium">Time</th>
                  <th className="text-left py-2 px-3 text-[#475569] font-medium">CPU Load</th>
                  <th className="text-left py-2 px-3 text-[#475569] font-medium">Memory %</th>
                  <th className="text-left py-2 px-3 text-[#475569] font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().map((h, i) => (
                  <tr key={i} className="border-b border-[#1a2540] hover:bg-[#080d1a]">
                    <td className="py-2 px-3 font-mono text-[#475569]">{h.time}</td>
                    <td className="py-2 px-3 font-mono text-[#00d4ff]">{h.cpu}</td>
                    <td className="py-2 px-3">
                      <span className={`font-mono ${h.memory > 80 ? 'text-[#f87171]' : h.memory > 60 ? 'text-[#fbbf24]' : 'text-[#10b981]'}`}>
                        {h.memory}%
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        h.memory > 80 || h.cpu > 3
                          ? 'text-[#f87171] border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)]'
                          : 'text-[#10b981] border-[rgba(16,185,129,0.2)] bg-[rgba(16,185,129,0.08)]'
                      }`}>
                        {h.memory > 80 || h.cpu > 3 ? 'WARNING' : 'NORMAL'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
