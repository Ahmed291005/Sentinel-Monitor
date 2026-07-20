import React, { useState, useEffect } from 'react'
import { eventsAPI, logsAPI } from '../../api'
import { Badge, Spinner } from './UI'

function StepIcon({ status }) {
  if (status === 'passed' || status === 'executed') {
    return (
      <div className="w-6 h-6 rounded-full bg-[rgba(16,185,129,0.15)] border border-[rgba(16,185,129,0.3)] flex items-center justify-center flex-shrink-0">
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    )
  }
  if (status === 'rejected' || status === 'error') {
    return (
      <div className="w-6 h-6 rounded-full bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.3)] flex items-center justify-center flex-shrink-0">
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <path d="M3 3l6 6M9 3l-6 6" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
    )
  }
  return (
    <div className="w-6 h-6 rounded-full bg-[rgba(245,158,11,0.15)] border border-[rgba(245,158,11,0.3)] flex items-center justify-center flex-shrink-0">
      <div className="w-2 h-2 rounded-full bg-[#f59e0b]"/>
    </div>
  )
}

export default function EventDetailModal({ eventId, onClose }) {
  const [event,   setEvent]   = useState(null)
  const [log,     setLog]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState('overview')

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const evRes = await eventsAPI.getOne(eventId)
        setEvent(evRes.data.data)

        // Find the decision log for this event
        const logRes = await logsAPI.getAll({ event_id: eventId, limit: 1 })
        const logs   = logRes.data.data || []
        if (logs.length > 0) setLog(logs[0])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [eventId])

  const typeColors = {
    system:      '#00d4ff',
    user:        '#a78bfa',
    security:    '#f87171',
    performance: '#fbbf24',
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-slide">
      <div className="bg-[#080d1a] border border-[#1a2540] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a2540] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: typeColors[event?.type] || '#475569' }}
            />
            <div>
              <h3 className="text-sm font-semibold text-white">
                {loading ? 'Loading...' : event?.title}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                {event && <Badge type={event.type}/>}
                {event && <Badge type={event.status}/>}
                <span className="text-[10px] text-[#334155] font-mono">ID #{eventId}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[#0d1426] border border-[#1a2540] flex items-center justify-center text-[#475569] hover:text-white hover:border-[#243050] transition-all text-xs"
          >✕</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 py-3 border-b border-[#1a2540] flex-shrink-0">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'payload',  label: 'Payload' },
            { id: 'pipeline', label: `Pipeline${log ? ` (${log.chain_trace?.length || 0} steps)` : ''}` },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tab === t.id
                  ? 'bg-[rgba(0,212,255,0.1)] text-[#00d4ff] border border-[rgba(0,212,255,0.2)]'
                  : 'text-[#475569] hover:text-white hover:bg-[#0d1426]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner/>
            </div>
          ) : (

            /* ── OVERVIEW TAB ── */
            tab === 'overview' ? (
              <div className="space-y-4">
                {/* Event info grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Event ID',   value: `#${event?.id}` },
                    { label: 'Type',       value: event?.type },
                    { label: 'Status',     value: event?.status },
                    { label: 'Source',     value: event?.source },
                    { label: 'Created by', value: event?.created_by_username || 'system' },
                    { label: 'Created at', value: event?.created_at ? new Date(event.created_at).toLocaleString() : '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="p-3 bg-[#0d1426] rounded-lg border border-[#1a2540]">
                      <div className="text-[10px] text-[#475569] uppercase tracking-widest mb-1">{label}</div>
                      <div className="text-xs text-white font-mono">{value}</div>
                    </div>
                  ))}
                </div>

                {/* Decision summary */}
                {log && (
                  <div className="p-4 bg-[#050810] rounded-xl border border-[#1a2540]">
                    <div className="text-[11px] text-[#475569] uppercase tracking-widest mb-3">Pipeline Decision</div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <div className="text-[10px] text-[#334155] mb-1">Outcome</div>
                        <Badge type={log.outcome}/>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#334155] mb-1">Rule Applied</div>
                        <div className="text-xs text-white font-mono truncate">{log.rule_name || '—'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#334155] mb-1">Duration</div>
                        <div className="text-xs text-[#00d4ff] font-mono">{log.duration_ms ? `${log.duration_ms}ms` : '—'}</div>
                      </div>
                    </div>
                    {log.action_name && (
                      <div className="mt-3 pt-3 border-t border-[#1a2540] flex items-center gap-2">
                        <span className="text-[10px] text-[#334155]">Action executed:</span>
                        <span className="text-xs text-[#fbbf24] font-mono">{log.action_name}</span>
                        <span className="text-[10px] text-[#334155] font-mono">({log.action_type})</span>
                      </div>
                    )}
                  </div>
                )}

                {!log && (
                  <div className="p-4 bg-[#050810] rounded-xl border border-[#1a2540] text-center">
                    <p className="text-xs text-[#334155]">No pipeline decision recorded for this event yet.</p>
                  </div>
                )}
              </div>
            )

            /* ── PAYLOAD TAB ── */
            : tab === 'payload' ? (
              <div>
                <div className="text-[11px] text-[#475569] uppercase tracking-widest mb-3">Raw Event Payload</div>
                <div className="bg-[#050810] border border-[#1a2540] rounded-xl p-4 overflow-x-auto">
                  <pre className="text-xs font-mono text-[#00d4ff] leading-relaxed whitespace-pre-wrap">
                    {JSON.stringify(
                      typeof event?.payload === 'string'
                        ? JSON.parse(event.payload)
                        : event?.payload,
                      null, 2
                    )}
                  </pre>
                </div>
                <p className="text-[10px] text-[#334155] mt-2 font-mono">
                  Fields in this payload are evaluated against rule conditions
                </p>
              </div>
            )

            /* ── PIPELINE TAB ── */
            : (
              <div>
                <div className="text-[11px] text-[#475569] uppercase tracking-widest mb-3">
                  Chain of Responsibility Trace
                </div>

                {!log ? (
                  <div className="text-center py-8 text-[#334155] text-xs">
                    No pipeline trace available for this event
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(log.chain_trace || []).map((step, i) => (
                      <div key={i} className="relative">
                        {/* Connector line */}
                        {i < (log.chain_trace?.length || 0) - 1 && (
                          <div className="absolute left-3 top-8 w-px h-4 bg-[#1a2540]"/>
                        )}

                        <div className={`flex gap-3 p-3 rounded-xl border transition-all ${
                          step.status === 'passed' || step.status === 'executed'
                            ? 'bg-[rgba(16,185,129,0.04)] border-[rgba(16,185,129,0.12)]'
                            : step.status === 'rejected' || step.status === 'error'
                            ? 'bg-[rgba(239,68,68,0.04)] border-[rgba(239,68,68,0.12)]'
                            : 'bg-[#080d1a] border-[#1a2540]'
                        }`}>
                          <StepIcon status={step.status}/>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono font-semibold text-[#00d4ff]">
                                {step.handler}
                              </span>
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                step.status === 'passed' || step.status === 'executed'
                                  ? 'bg-[rgba(16,185,129,0.1)] text-[#10b981]'
                                  : step.status === 'rejected'
                                  ? 'bg-[rgba(239,68,68,0.1)] text-[#f87171]'
                                  : 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b]'
                              }`}>
                                {step.status}
                              </span>
                              <span className="ml-auto text-[10px] text-[#334155] font-mono">
                                step {i + 1}
                              </span>
                            </div>
                            <p className="text-xs text-[#94a3b8] leading-relaxed">{step.message}</p>
                            {step.timestamp && (
                              <p className="text-[10px] text-[#334155] font-mono mt-1">
                                {new Date(step.timestamp).toLocaleTimeString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#1a2540] bg-[#050810] flex items-center justify-between flex-shrink-0">
          <span className="text-[10px] text-[#334155] font-mono">source: {event?.source}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#0d1426] border border-[#1a2540] text-[#94a3b8] hover:text-white rounded-lg text-xs transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
