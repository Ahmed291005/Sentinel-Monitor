import React, { useState, useEffect, useCallback } from 'react'
import { logsAPI } from '../api'
import { Card, Badge, Button, Modal, Spinner, Empty, PageHeader, StatCard } from '../components/common/UI'

function ChainTraceModal({ log, onClose }) {
  return (
    <Modal title={`Decision Log #${log.id} — Chain Trace`} onClose={onClose}>
      <div className="space-y-3 text-xs">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2 bg-[#080d1a] rounded-lg border border-[#1a2540]">
            <div className="text-[#475569] mb-1">Event</div>
            <div className="text-white font-medium">{log.event_title}</div>
            <Badge type={log.event_type}/>
          </div>
          <div className="p-2 bg-[#080d1a] rounded-lg border border-[#1a2540]">
            <div className="text-[#475569] mb-1">Outcome</div>
            <Badge type={log.outcome}/>
            <div className="text-[#475569] mt-1 font-mono">{log.duration_ms}ms</div>
          </div>
        </div>

        {log.rule_name && (
          <div className="p-2 bg-[#080d1a] rounded-lg border border-[#1a2540]">
            <div className="text-[#475569] mb-1">Rule Applied</div>
            <div className="text-[#00d4ff] font-mono">{log.rule_name}</div>
          </div>
        )}

        {/* Chain trace steps */}
        <div>
          <div className="text-[11px] text-[#475569] uppercase tracking-widest mb-2">Pipeline Execution Trace</div>
          <div className="space-y-2">
            {(log.chain_trace || []).map((step, i) => (
              <div key={i} className={`p-3 rounded-lg border ${
                step.status === 'passed' || step.status === 'executed'
                  ? 'bg-[rgba(16,185,129,0.05)] border-[rgba(16,185,129,0.15)]'
                  : step.status === 'rejected' || step.status === 'error'
                  ? 'bg-[rgba(239,68,68,0.05)] border-[rgba(239,68,68,0.15)]'
                  : 'bg-[#080d1a] border-[#1a2540]'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-bold ${
                    step.status === 'passed' || step.status === 'executed' ? 'text-[#10b981]'
                    : step.status === 'rejected' || step.status === 'error' ? 'text-[#f87171]'
                    : 'text-[#f59e0b]'
                  }`}>
                    {step.status === 'passed' || step.status === 'executed' ? '✓' : '✗'}
                  </span>
                  <span className="font-mono text-[#00d4ff] font-semibold">{step.handler}</span>
                  <span className="ml-auto text-[#334155] font-mono">{step.status}</span>
                </div>
                <div className="text-[#94a3b8] leading-relaxed">{step.message}</div>
                <div className="text-[#334155] font-mono mt-1">{new Date(step.timestamp).toLocaleTimeString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default function LogsPage() {
  const [logs,    setLogs]    = useState([])
  const [total,   setTotal]   = useState(0)
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected,setSelected]= useState(null)
  const [filters, setFilters] = useState({ outcome: '', page: 1, limit: 15 })

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page: filters.page, limit: filters.limit }
      if (filters.outcome) params.outcome = filters.outcome
      const [logsRes, statsRes] = await Promise.all([logsAPI.getAll(params), logsAPI.getStats()])
      setLogs(logsRes.data.data || [])
      setTotal(logsRes.data.pagination?.total || 0)
      setStats(statsRes.data.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [filters])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const outcomes   = ['executed', 'failed', 'skipped', 'no_rule_match']
  const pages      = Math.ceil(total / filters.limit)

  const getOutcomeCount = (outcome) =>
    stats?.byOutcome?.find(o => o.outcome === outcome)?.count || 0

  return (
    <div className="p-6">
      <PageHeader
        title="Audit Logs"
        subtitle={`${total} decision records — immutable pipeline audit trail`}
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard label="Executed"     value={getOutcomeCount('executed')}      icon="✓" color="green"/>
        <StatCard label="Failed"       value={getOutcomeCount('failed')}         icon="✗" color="red"/>
        <StatCard label="No Match"     value={getOutcomeCount('no_rule_match')}  icon="⊘" color="accent"/>
        <StatCard label="Avg Duration" value={`${stats?.avgDuration || 0}ms`}    icon="⏱" color="yellow"/>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <div className="flex gap-3 flex-wrap items-center">
          <span className="text-[11px] text-[#475569] uppercase tracking-widest">Outcome</span>
          <div className="flex gap-2">
            <button
              onClick={() => setFilters(f => ({ ...f, outcome: '', page: 1 }))}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${!filters.outcome ? 'border-[#00d4ff] text-[#00d4ff] bg-[rgba(0,212,255,0.08)]' : 'border-[#1a2540] text-[#475569]'}`}
            >All</button>
            {outcomes.map(o => (
              <button
                key={o}
                onClick={() => setFilters(f => ({ ...f, outcome: o, page: 1 }))}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${filters.outcome === o ? 'border-[#00d4ff] text-[#00d4ff] bg-[rgba(0,212,255,0.08)]' : 'border-[#1a2540] text-[#475569]'}`}
              >{o}</button>
            ))}
          </div>
          <div className="ml-auto text-xs text-[#475569] font-mono">{total} results</div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <div className="flex justify-center py-12"><Spinner/></div>
        ) : logs.length === 0 ? (
          <Empty message="No decision logs yet. Create events to populate the audit trail."/>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1a2540]">
                  {['ID','Event','Type','Rule Applied','Action','Outcome','Duration','Time','Trace'].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 text-[#475569] font-medium uppercase tracking-widest text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b border-[#1a2540] hover:bg-[#080d1a] transition-colors">
                    <td className="py-3 px-3 font-mono text-[#475569]">#{log.id}</td>
                    <td className="py-3 px-3 text-white max-w-[160px] truncate">{log.event_title}</td>
                    <td className="py-3 px-3"><Badge type={log.event_type}/></td>
                    <td className="py-3 px-3 text-[#94a3b8] max-w-[140px] truncate">{log.rule_name || <span className="text-[#334155]">—</span>}</td>
                    <td className="py-3 px-3 text-[#94a3b8] max-w-[120px] truncate">{log.action_name || <span className="text-[#334155]">—</span>}</td>
                    <td className="py-3 px-3"><Badge type={log.outcome}/></td>
                    <td className="py-3 px-3 font-mono text-[#475569]">{log.duration_ms ? `${log.duration_ms}ms` : '—'}</td>
                    <td className="py-3 px-3 text-[#475569] font-mono whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => setSelected(log)}
                        className="text-[10px] text-[#00d4ff] hover:underline font-mono"
                      >
                        view ({(log.chain_trace || []).length} steps)
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#1a2540]">
            <span className="text-xs text-[#475569]">Page {filters.page} of {pages}</span>
            <div className="flex gap-2">
              <Button size="sm" disabled={filters.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>← Prev</Button>
              <Button size="sm" disabled={filters.page >= pages} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>Next →</Button>
            </div>
          </div>
        )}
      </Card>

      {selected && <ChainTraceModal log={selected} onClose={() => setSelected(null)}/>}
    </div>
  )
}
