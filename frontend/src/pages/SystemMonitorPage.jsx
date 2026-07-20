import React, { useState, useEffect, useRef } from 'react'
import { Card, Button, Spinner, PageHeader, Badge } from '../components/common/UI'
import { useAuth } from '../hooks/useAuth'
import api from '../api/axios'

// ── Reusable gauge bar ────────────────────────────────────────────────────────
function GaugeBar({ value, max = 100, unit = '%', label, showValue = true }) {
  const pct   = Math.min(100, Math.round((value / max) * 100))
  const color = pct > 85 ? '#ef4444' : pct > 65 ? '#f59e0b' : '#10b981'
  return (
    <div className="mb-1">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] text-[#94a3b8]">{label}</span>
        {showValue && (
          <span className="text-[11px] font-mono font-bold" style={{ color }}>
            {value}{unit}
          </span>
        )}
      </div>
      <div className="h-1.5 bg-[#0d1426] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

// ── Stat tile ─────────────────────────────────────────────────────────────────
function Tile({ icon, label, value, sub, color = '#00d4ff', alert }) {
  return (
    <div className={`bg-[#0a1020] border rounded-xl p-4 transition-all ${
      alert ? 'border-[rgba(239,68,68,0.3)] shadow-[0_0_20px_rgba(239,68,68,0.08)]'
             : 'border-[#1a2540]'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xl">{icon}</span>
        {alert && (
          <span className="text-[9px] bg-[rgba(239,68,68,0.15)] text-[#f87171] border border-[rgba(239,68,68,0.2)] px-1.5 py-0.5 rounded font-mono animate-pulse">
            ALERT
          </span>
        )}
      </div>
      <div className="text-2xl font-bold font-mono" style={{ color }}>{value}</div>
      <div className="text-[11px] text-[#475569] mt-0.5 uppercase tracking-widest">{label}</div>
      {sub && <div className="text-[10px] text-[#334155] mt-1 font-mono">{sub}</div>}
    </div>
  )
}

// ── CPU Cores grid ────────────────────────────────────────────────────────────
function CpuCores({ cores }) {
  if (!cores?.length) return null
  return (
    <div>
      <div className="text-[11px] text-[#475569] uppercase tracking-widest mb-3">Per-Core Usage</div>
      <div className="grid grid-cols-4 gap-2">
        {cores.map((c, i) => {
          const pct   = c.usage || 0
          const color = pct > 85 ? '#ef4444' : pct > 65 ? '#f59e0b' : '#10b981'
          return (
            <div key={i} className="bg-[#050810] border border-[#1a2540] rounded-lg p-2 text-center">
              <div className="text-[9px] text-[#334155] font-mono mb-1">C{i}</div>
              <div className="text-sm font-bold font-mono" style={{ color }}>{pct}%</div>
              {c.speed && <div className="text-[9px] text-[#334155] font-mono mt-0.5">{c.speed}GHz</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Process table ─────────────────────────────────────────────────────────────
function ProcessTable({ processes, sortBy = 'cpu' }) {
  const list = sortBy === 'cpu' ? processes?.top_cpu : processes?.top_memory
  if (!list?.length) return <div className="text-xs text-[#334155] text-center py-4">No process data</div>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[#1a2540]">
            {['PID','Process','CPU %','RAM %','RAM MB'].map(h => (
              <th key={h} className="text-left py-2 px-2 text-[#475569] font-medium text-[10px] uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {list.map((p, i) => (
            <tr key={i} className="border-b border-[#1a2540] hover:bg-[#080d1a]">
              <td className="py-2 px-2 font-mono text-[#334155]">{p.pid}</td>
              <td className="py-2 px-2 text-white font-medium max-w-[120px] truncate">{p.name}</td>
              <td className="py-2 px-2 font-mono" style={{ color: p.cpu_pct > 20 ? '#f87171' : p.cpu_pct > 10 ? '#fbbf24' : '#10b981' }}>
                {p.cpu_pct}%
              </td>
              <td className="py-2 px-2 font-mono text-[#a78bfa]">{p.mem_pct}%</td>
              <td className="py-2 px-2 font-mono text-[#94a3b8]">{p.mem_mb}MB</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Network card ──────────────────────────────────────────────────────────────
function NetworkCard({ networks, traffic }) {
  return (
    <Card>
      <div className="text-xs font-semibold text-white mb-4 flex items-center gap-2">
        <span>🌐</span> Network Interfaces
      </div>
      {!networks?.length ? (
        <div className="text-xs text-[#334155] text-center py-4">No network data</div>
      ) : (
        <div className="space-y-3">
          {networks.slice(0, 3).map((n, i) => {
            const t = traffic?.find(x => x.iface === n.name)
            return (
              <div key={i} className="p-3 bg-[#050810] border border-[#1a2540] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-white">{n.name}</span>
                  <span className="text-[10px] font-mono text-[#475569] bg-[#0d1426] px-2 py-0.5 rounded">{n.type || 'ethernet'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[#334155]">IPv4: </span>
                    <span className="text-[#00d4ff] font-mono">{n.ip4 || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[#334155]">MAC: </span>
                    <span className="text-[#475569] font-mono">{n.mac || '—'}</span>
                  </div>
                </div>
                {t && (
                  <div className="flex gap-4 mt-2 pt-2 border-t border-[#1a2540] text-[11px]">
                    <div className="flex items-center gap-1">
                      <span className="text-[#10b981]">↓</span>
                      <span className="font-mono text-[#94a3b8]">{t.rx_sec_kb} KB/s</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[#00d4ff]">↑</span>
                      <span className="font-mono text-[#94a3b8]">{t.tx_sec_kb} KB/s</span>
                    </div>
                    {(t.rx_errors + t.tx_errors) > 0 && (
                      <div className="flex items-center gap-1 ml-auto">
                        <span className="text-[#f87171]">⚠</span>
                        <span className="font-mono text-[#f87171]">{t.rx_errors + t.tx_errors} errors</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

// ── GPU card ──────────────────────────────────────────────────────────────────
function GpuCard({ gpus }) {
  if (!gpus?.length) return null
  return (
    <Card>
      <div className="text-xs font-semibold text-white mb-4 flex items-center gap-2">
        <span>🎮</span> GPU Information
      </div>
      <div className="space-y-3">
        {gpus.map((g, i) => (
          <div key={i} className="p-3 bg-[#050810] border border-[#1a2540] rounded-lg">
            <div className="text-xs font-medium text-white mb-2 truncate">{g.model}</div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div><span className="text-[#334155]">Vendor: </span><span className="text-[#94a3b8] font-mono">{g.vendor}</span></div>
              <div><span className="text-[#334155]">VRAM: </span><span className="text-[#a78bfa] font-mono">{g.vram_mb}MB</span></div>
              {g.temp && <div><span className="text-[#334155]">Temp: </span><span className={`font-mono ${g.temp > 80 ? 'text-[#f87171]' : 'text-[#10b981]'}`}>{g.temp}°C</span></div>}
              {g.vram_used && <div><span className="text-[#334155]">Used: </span><span className="text-[#fbbf24] font-mono">{g.vram_used}MB</span></div>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── Battery card ──────────────────────────────────────────────────────────────
function BatteryCard({ battery }) {
  if (!battery?.has_battery) return null
  const pct   = battery.level_pct || 0
  const color = pct < 20 ? '#ef4444' : pct < 40 ? '#f59e0b' : '#10b981'
  return (
    <Card>
      <div className="text-xs font-semibold text-white mb-4 flex items-center gap-2">
        <span>🔋</span> Battery
        {battery.charging && (
          <span className="text-[9px] bg-[rgba(16,185,129,0.15)] text-[#10b981] border border-[rgba(16,185,129,0.2)] px-1.5 py-0.5 rounded font-mono ml-auto">
            ⚡ CHARGING
          </span>
        )}
      </div>
      <div className="flex items-center gap-4 mb-4">
        <div className="text-4xl font-bold font-mono" style={{ color }}>{pct}%</div>
        <div className="flex-1">
          <div className="h-3 bg-[#0d1426] rounded-full overflow-hidden border border-[#1a2540]">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: color }}
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div><span className="text-[#334155]">Status: </span>
          <span className={`font-mono ${battery.charging ? 'text-[#10b981]' : 'text-[#94a3b8]'}`}>
            {battery.charging ? 'Charging' : 'Discharging'}
          </span>
        </div>
        <div><span className="text-[#334155]">AC: </span>
          <span className="font-mono text-[#94a3b8]">{battery.ac_connected ? 'Connected' : 'Disconnected'}</span>
        </div>
        {battery.time_left && (
          <div><span className="text-[#334155]">Time left: </span>
            <span className="font-mono text-[#fbbf24]">{battery.time_left}m</span>
          </div>
        )}
        {battery.model && (
          <div><span className="text-[#334155]">Model: </span>
            <span className="font-mono text-[#475569] truncate">{battery.model}</span>
          </div>
        )}
      </div>
    </Card>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function SystemMonitorPage() {
  const { isAdmin }  = useAuth()
  const [metrics,    setMetrics]    = useState(null)
  const [status,     setStatus]     = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [starting,   setStarting]   = useState(false)
  const [procTab,    setProcTab]    = useState('cpu')
  const [lastRefresh,setLastRefresh]= useState(null)
  const [thresholds, setThresholds] = useState({
    cpu_usage: 80, memory_usage: 85,
    disk_usage: 90, cpu_temp: 75, battery_low: 20,
  })
  const intervalRef = useRef(null)

  const fetchAll = async () => {
    try {
      const [mRes, sRes] = await Promise.all([
        api.get('/monitor/metrics'),
        api.get('/monitor/status'),
      ])
      setMetrics(mRes.data.data)
      setStatus(sRes.data.data)
      setLastRefresh(new Date())
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    fetchAll()
    intervalRef.current = setInterval(fetchAll, 4000)
    return () => clearInterval(intervalRef.current)
  }, [])

  const startMonitor = async () => {
    setStarting(true)
    try { await api.post('/monitor/start', { interval_ms: 5000, thresholds }); fetchAll() }
    catch (err) { console.error(err) }
    finally { setStarting(false) }
  }

  const stopMonitor = async () => {
    try { await api.post('/monitor/stop'); fetchAll() }
    catch (err) { console.error(err) }
  }

  const isRunning = status?.running

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <Spinner/>
        <p className="text-xs text-[#475569] mt-3 font-mono">Reading system metrics...</p>
      </div>
    </div>
  )

  const m = metrics

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <PageHeader
        title="System Monitor"
        subtitle={`Real Windows metrics · ${m?.os?.hostname || 'localhost'} · refreshed ${lastRefresh ? lastRefresh.toLocaleTimeString() : '...'}`}
        actions={
          isAdmin && (
            <div className="flex gap-2">
              {!isRunning ? (
                <Button variant="success" onClick={startMonitor} disabled={starting}>
                  {starting ? <Spinner/> : '▶'} Start Monitor
                </Button>
              ) : (
                <Button variant="danger" onClick={stopMonitor}>■ Stop Monitor</Button>
              )}
              <Button variant="default" onClick={fetchAll}>↻ Refresh</Button>
            </div>
          )
        }
      />

      {/* Running banner */}
      {isRunning && (
        <div className="flex items-center gap-3 p-3.5 bg-[rgba(16,185,129,0.06)] border border-[rgba(16,185,129,0.15)] rounded-xl">
          <div className="w-2.5 h-2.5 rounded-full bg-[#10b981] pulse-green flex-shrink-0"/>
          <div className="text-sm text-[#10b981] font-medium">System Monitor Active</div>
          <div className="text-xs text-[#475569] ml-1">
            {status?.readings} readings · {status?.eventsFired} events fired into pipeline · every {status?.interval_ms / 1000}s
          </div>
        </div>
      )}

      {/* OS info bar */}
      {m?.os && (
        <div className="flex gap-3 flex-wrap">
          {[
            { label: m.os.distro || m.os.platform, icon: '🖥' },
            { label: m.os.arch,                     icon: '⚙' },
            { label: `Uptime ${m.os.uptime_h}h`,    icon: '⏱' },
            { label: m.os.timezone,                  icon: '🌍' },
            { label: `Node ${m.node?.version}`,      icon: '🟢' },
            { label: `PID ${m.node?.pid}`,           icon: '🔢' },
          ].map(({ label, icon }) => (
            <div key={label} className="flex items-center gap-1.5 text-[11px] text-[#475569] font-mono bg-[#0d1426] border border-[#1a2540] px-2.5 py-1.5 rounded-lg">
              <span>{icon}</span><span>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Top stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile
          icon="⚙" label="CPU Usage" color="#00d4ff"
          value={`${m?.cpu?.usage_pct || 0}%`}
          sub={`${m?.cpu?.count} cores · ${m?.cpu?.speed_ghz}GHz`}
          alert={m?.cpu?.usage_pct > thresholds.cpu_usage}
        />
        <Tile
          icon="🌡" label="CPU Temp" color="#f59e0b"
          value={m?.cpu?.temp_c ? `${m.cpu.temp_c}°C` : 'N/A'}
          sub={m?.cpu?.temp_max ? `Max: ${m.cpu.temp_max}°C` : 'Sensor not found'}
          alert={m?.cpu?.temp_c > thresholds.cpu_temp}
        />
        <Tile
          icon="💾" label="RAM Usage" color="#a78bfa"
          value={`${m?.memory?.usage_pct || 0}%`}
          sub={`${m?.memory?.used_gb}GB / ${m?.memory?.total_gb}GB`}
          alert={m?.memory?.usage_pct > thresholds.memory_usage}
        />
        <Tile
          icon="📊" label="Processes" color="#10b981"
          value={m?.processes?.total || 0}
          sub={`${m?.processes?.running || 0} running`}
        />
      </div>

      {/* CPU + Memory detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="text-xs font-semibold text-white mb-4 flex items-center gap-2">
            <span>⚙</span> CPU Breakdown
          </div>
          <div className="space-y-2 mb-4">
            <GaugeBar label="Total Usage"  value={m?.cpu?.usage_pct  || 0} color="#00d4ff"/>
            <GaugeBar label="User Mode"    value={m?.cpu?.user_pct   || 0} color="#7c3aed"/>
            <GaugeBar label="System Mode"  value={m?.cpu?.system_pct || 0} color="#f59e0b"/>
            <GaugeBar label="Idle"         value={m?.cpu?.idle_pct   || 0} color="#10b981"/>
          </div>
          <div className="text-[11px] text-[#475569] mb-2 truncate font-mono">{m?.cpu?.model}</div>
          <CpuCores cores={m?.cpu?.cores}/>
        </Card>

        <Card>
          <div className="text-xs font-semibold text-white mb-4 flex items-center gap-2">
            <span>💾</span> Memory Breakdown
          </div>
          <div className="space-y-2 mb-4">
            <GaugeBar label="RAM Used"     value={m?.memory?.usage_pct || 0} color="#a78bfa"/>
            {m?.memory?.swap_total > 0 && (
              <GaugeBar
                label="Swap Used"
                value={m?.memory?.swap_used || 0}
                max={m?.memory?.swap_total || 1}
                unit="GB"
                color="#f59e0b"
              />
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              { label: 'Total',  value: `${m?.memory?.total_gb}GB`, color: '#94a3b8' },
              { label: 'Used',   value: `${m?.memory?.used_gb}GB`,  color: '#f87171' },
              { label: 'Free',   value: `${m?.memory?.free_gb}GB`,  color: '#10b981' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center p-3 bg-[#050810] border border-[#1a2540] rounded-lg">
                <div className="text-sm font-bold font-mono" style={{ color }}>{value}</div>
                <div className="text-[10px] text-[#334155] mt-0.5 uppercase">{label}</div>
              </div>
            ))}
          </div>
          {m?.node && (
            <div className="mt-4 pt-3 border-t border-[#1a2540]">
              <div className="text-[10px] text-[#334155] uppercase tracking-widest mb-2">Node.js Process</div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div><span className="text-[#334155]">Heap: </span><span className="text-[#00d4ff] font-mono">{m.node.heap_mb}MB</span></div>
                <div><span className="text-[#334155]">RSS: </span><span className="text-[#a78bfa] font-mono">{m.node.rss_mb}MB</span></div>
                <div><span className="text-[#334155]">Uptime: </span><span className="text-[#94a3b8] font-mono">{m.node.uptime_s}s</span></div>
                <div><span className="text-[#334155]">PID: </span><span className="text-[#94a3b8] font-mono">{m.node.pid}</span></div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Disk drives */}
      {m?.disks?.length > 0 && (
        <Card>
          <div className="text-xs font-semibold text-white mb-4 flex items-center gap-2">
            <span>💽</span> Disk Drives
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {m.disks.map((d, i) => (
              <div key={i} className="p-3 bg-[#050810] border border-[#1a2540] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-white">{d.mount}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#475569] font-mono">{d.fs}</span>
                    {d.use_pct > thresholds.disk_usage && (
                      <span className="text-[9px] text-[#f87171] font-mono animate-pulse">FULL</span>
                    )}
                  </div>
                </div>
                <GaugeBar label={`${d.used_gb}GB used of ${d.size_gb}GB`} value={d.use_pct} unit="%"/>
                <div className="flex gap-4 mt-2 text-[10px] font-mono">
                  <span className="text-[#10b981]">Free: {d.free_gb}GB</span>
                  <span className="text-[#475569]">Type: {d.type}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Process table + Network + GPU + Battery */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-semibold text-white flex items-center gap-2">
              <span>⚡</span> Top Processes
            </div>
            <div className="flex gap-1">
              {['cpu','memory'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setProcTab(tab)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                    procTab === tab
                      ? 'bg-[rgba(0,212,255,0.1)] text-[#00d4ff] border border-[rgba(0,212,255,0.2)]'
                      : 'text-[#475569] hover:text-white'
                  }`}
                >by {tab}</button>
              ))}
            </div>
          </div>
          <ProcessTable processes={m?.processes} sortBy={procTab}/>
        </Card>

        <NetworkCard networks={m?.networks} traffic={m?.traffic}/>
      </div>

      {/* GPU + Battery */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GpuCard gpus={m?.gpus}/>
        <BatteryCard battery={m?.battery}/>
      </div>

      {/* Threshold config */}
      {isAdmin && !isRunning && (
        <Card>
          <div className="text-xs font-semibold text-white mb-4">⚙ Alert Thresholds — fires events into Sentinel pipeline when exceeded</div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { key: 'cpu_usage',    label: 'CPU %',       min: 10, max: 100 },
              { key: 'memory_usage', label: 'RAM %',       min: 10, max: 100 },
              { key: 'disk_usage',   label: 'Disk %',      min: 10, max: 100 },
              { key: 'cpu_temp',     label: 'CPU Temp °C', min: 40, max: 100 },
              { key: 'battery_low',  label: 'Battery %',   min: 5,  max: 50  },
            ].map(({ key, label, min, max }) => (
              <div key={key}>
                <label className="block text-[10px] text-[#475569] uppercase tracking-widest mb-1.5">{label}</label>
                <input
                  type="number" min={min} max={max}
                  value={thresholds[key]}
                  onChange={e => setThresholds(t => ({ ...t, [key]: +e.target.value }))}
                  className="w-full bg-[#050810] border border-[#1a2540] text-[#00d4ff] text-sm px-3 py-2 rounded-lg outline-none focus:border-[#00d4ff] font-mono"
                />
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[#334155] mt-3 font-mono">
            When any metric exceeds its threshold, a real event fires into the Sentinel decision pipeline automatically.
          </p>
        </Card>
      )}

    </div>
  )
}
