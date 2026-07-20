import React, { useState, useEffect, useCallback } from 'react'
import { eventsAPI, simAPI } from '../api'
import { Card, Badge, Button, Input, Select, Modal, Spinner, Empty, PageHeader } from '../components/common/UI'
import EventDetailModal from '../components/common/EventDetailModal'
import { useAuth } from '../hooks/useAuth'

const EVENT_TYPES  = ['system', 'user', 'security', 'performance']
const EVENT_STATUS = ['pending', 'processing', 'resolved', 'ignored']

function CreateEventModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    type: 'performance', title: '',
    payload: '{\n  "cpu_usage": 95,\n  "memory_usage": 88\n}'
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [result,  setResult]  = useState(null)

  const handleSubmit = async () => {
    if (!form.title.trim()) return setError('Title is required')
    try {
      setLoading(true)
      setError('')
      const payload = JSON.parse(form.payload)
      const res = await eventsAPI.create({ type: form.type, title: form.title, payload })
      setResult(res.data)
      onCreated()
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid JSON payload or server error')
    } finally {
      setLoading(false)
    }
  }

  if (result) return (
    <Modal title="Event Created & Processed" onClose={onClose}>
      <div className="space-y-3">
        <div className={`flex items-center gap-3 p-3 rounded-lg border ${
          result.pipeline?.outcome === 'executed'
            ? 'bg-[rgba(16,185,129,0.08)] border-[rgba(16,185,129,0.2)]'
            : 'bg-[rgba(245,158,11,0.08)] border-[rgba(245,158,11,0.2)]'
        }`}>
          <span className={`text-lg ${result.pipeline?.outcome === 'executed' ? 'text-[#10b981]' : 'text-[#f59e0b]'}`}>
            {result.pipeline?.outcome === 'executed' ? '✓' : '⚠'}
          </span>
          <div>
            <div className="text-sm font-medium text-white">
              Pipeline {result.pipeline?.outcome === 'executed' ? 'executed successfully' : `outcome: ${result.pipeline?.outcome}`}
            </div>
            <div className="text-xs text-[#475569]">
              Duration: {result.pipeline?.duration_ms}ms · {result.pipeline?.trace?.length} steps
            </div>
          </div>
        </div>

        <div className="text-[11px] text-[#475569] uppercase tracking-widest mb-2 mt-4">Chain Trace</div>
        <div className="space-y-1.5">
          {(result.pipeline?.trace || []).map((step, i) => (
            <div key={i} className="flex items-start gap-2 text-xs p-2.5 bg-[#050810] rounded-lg border border-[#1a2540]">
              <span className={`font-bold mt-0.5 flex-shrink-0 ${
                step.status === 'passed' || step.status === 'executed'
                  ? 'text-[#10b981]' : 'text-[#f87171]'
              }`}>
                {step.status === 'passed' || step.status === 'executed' ? '✓' : '✗'}
              </span>
              <div>
                <div className="font-mono text-[#00d4ff] font-medium">{step.handler}</div>
                <div className="text-[#94a3b8] mt-0.5 leading-relaxed">{step.message}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )

  return (
    <Modal
      title="Create New Event"
      onClose={onClose}
      footer={<>
        <Button variant="default" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Processing...' : '⚡ Create & Process'}
        </Button>
      </>}
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] rounded-lg text-[#f87171] text-sm">{error}</div>
        )}
        <Select label="Event Type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
          {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Input
          label="Event Title"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="e.g. CPU spike detected"
        />
        <div>
          <label className="block text-[11px] text-[#475569] uppercase tracking-widest mb-1.5 font-medium">Payload (JSON)</label>
          <textarea
            value={form.payload}
            onChange={e => setForm(f => ({ ...f, payload: e.target.value }))}
            rows={5}
            className="w-full bg-[#0d1426] border border-[#1a2540] text-[#00d4ff] text-xs font-mono px-3 py-2 rounded-lg outline-none focus:border-[#00d4ff] transition-colors resize-none"
          />
          <p className="text-[10px] text-[#334155] mt-1">Fields must match rule conditions (e.g. cpu_usage, failed_attempts)</p>
        </div>
      </div>
    </Modal>
  )
}

export default function EventsPage() {
  const { isAdmin } = useAuth()
  const [events,     setEvents]     = useState([])
  const [total,      setTotal]      = useState(0)
  const [loading,    setLoading]    = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [detailId,   setDetailId]   = useState(null)
  const [firing,     setFiring]     = useState(false)
  const [filters,    setFilters]    = useState({ type: '', status: '', page: 1, limit: 15 })

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.type)   params.type   = filters.type
      if (filters.status) params.status = filters.status
      params.page  = filters.page
      params.limit = filters.limit
      const res = await eventsAPI.getAll(params)
      setEvents(res.data.data || [])
      setTotal(res.data.pagination?.total || 0)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [filters])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const fireRandom = async () => {
    setFiring(true)
    try {
      await simAPI.fire()
      setTimeout(fetchEvents, 1000)
    } catch (err) { console.error(err) }
    finally { setFiring(false) }
  }

  const updateStatus = async (id, status, e) => {
    e.stopPropagation()
    try {
      await eventsAPI.updateStatus(id, status)
      fetchEvents()
    } catch (err) { console.error(err) }
  }

  const pages = Math.ceil(total / filters.limit)

  const typeColors = {
    system: 'border-l-[#00d4ff]', user: 'border-l-[#a78bfa]',
    security: 'border-l-[#f87171]', performance: 'border-l-[#fbbf24]'
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Events"
        subtitle={`${total} total events · click any row to inspect`}
        actions={
          <>
            {isAdmin && (
              <Button variant="purple" onClick={fireRandom} disabled={firing}>
                {firing ? <Spinner/> : '🎲'} Fire Random
              </Button>
            )}
            <Button variant="primary" onClick={() => setShowCreate(true)}>
              + Create Event
            </Button>
          </>
        }
      />

      {/* Filters */}
      <Card className="mb-4">
        <div className="flex gap-3 flex-wrap items-center">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#475569] uppercase tracking-widest">Type</span>
            <select
              value={filters.type}
              onChange={e => setFilters(f => ({ ...f, type: e.target.value, page: 1 }))}
              className="bg-[#0d1426] border border-[#1a2540] text-white text-xs px-2 py-1.5 rounded-lg outline-none focus:border-[#00d4ff]"
            >
              <option value="">All types</option>
              {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#475569] uppercase tracking-widest">Status</span>
            <select
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}
              className="bg-[#0d1426] border border-[#1a2540] text-white text-xs px-2 py-1.5 rounded-lg outline-none focus:border-[#00d4ff]"
            >
              <option value="">All statuses</option>
              {EVENT_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <Button variant="default" size="sm" onClick={() => setFilters({ type: '', status: '', page: 1, limit: 15 })}>
            Reset
          </Button>
          <div className="ml-auto text-xs text-[#475569] font-mono">{total} results</div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <div className="flex justify-center py-12"><Spinner/></div>
        ) : events.length === 0 ? (
          <Empty message="No events found. Create one or fire a random event."/>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1a2540]">
                  {['ID','Type','Title','Status','Source','Created','Actions'].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 text-[#475569] font-medium uppercase tracking-widest text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map(ev => (
                  <tr
                    key={ev.id}
                    onClick={() => setDetailId(ev.id)}
                    className={`border-b border-[#1a2540] hover:bg-[#080d1a] transition-colors cursor-pointer border-l-2 ${typeColors[ev.type] || 'border-l-transparent'}`}
                  >
                    <td className="py-3 px-3 font-mono text-[#475569]">#{ev.id}</td>
                    <td className="py-3 px-3"><Badge type={ev.type}/></td>
                    <td className="py-3 px-3 text-white max-w-[200px]">
                      <div className="truncate">{ev.title}</div>
                      <div className="text-[10px] text-[#334155] font-mono mt-0.5">{ev.source}</div>
                    </td>
                    <td className="py-3 px-3"><Badge type={ev.status}/></td>
                    <td className="py-3 px-3 text-[#475569] font-mono">{ev.source}</td>
                    <td className="py-3 px-3 text-[#475569] font-mono whitespace-nowrap">
                      {new Date(ev.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDetailId(ev.id)}
                          className="text-[10px] text-[#00d4ff] hover:underline font-mono"
                        >inspect</button>
                        {ev.status === 'pending' && (
                          <button onClick={e => updateStatus(ev.id, 'resolved', e)} className="text-[10px] text-[#10b981] hover:underline font-mono">resolve</button>
                        )}
                        {ev.status !== 'ignored' && (
                          <button onClick={e => updateStatus(ev.id, 'ignored', e)} className="text-[10px] text-[#475569] hover:underline font-mono">ignore</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#1a2540]">
            <span className="text-xs text-[#475569]">Page {filters.page} of {pages}</span>
            <div className="flex gap-2">
              <Button size="sm" disabled={filters.page <= 1}  onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>← Prev</Button>
              <Button size="sm" disabled={filters.page >= pages} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>Next →</Button>
            </div>
          </div>
        )}
      </Card>

      {showCreate && (
        <CreateEventModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchEvents() }}
        />
      )}

      {detailId && (
        <EventDetailModal
          eventId={detailId}
          onClose={() => setDetailId(null)}
        />
      )}
    </div>
  )
}
