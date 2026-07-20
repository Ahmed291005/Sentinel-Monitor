import React, { useState, useEffect, useCallback } from 'react'
import { rulesAPI, actionsAPI } from '../api'
import { Card, Badge, Button, Input, Select, Modal, Toggle, Spinner, Empty, PageHeader } from '../components/common/UI'
import { useAuth } from '../hooks/useAuth'

const EVENT_TYPES = ['any','system','user','security','performance']
const OPERATORS   = ['>','>=','<','<=','==','!=','contains']

function RuleModal({ rule, actions, onClose, onSaved }) {
  const isEdit = !!rule
  const [form, setForm] = useState({
    name:            rule?.name             || '',
    description:     rule?.description      || '',
    event_type:      rule?.event_type       || 'any',
    condition_field: rule?.condition_field  || '',
    condition_op:    rule?.condition_op     || '>',
    condition_value: rule?.condition_value  || '',
    action_id:       rule?.action_id        || (actions[0]?.id || ''),
    priority:        rule?.priority         || 5,
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handleSubmit = async () => {
    if (!form.name || !form.condition_field || !form.condition_value) {
      return setError('Name, condition field and value are required')
    }
    try {
      setLoading(true)
      setError('')
      if (isEdit) {
        await rulesAPI.update(rule.id, form)
      } else {
        await rulesAPI.create(form)
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save rule')
    } finally {
      setLoading(false)
    }
  }

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  return (
    <Modal
      title={isEdit ? `Edit Rule — ${rule.name}` : 'Create New Rule'}
      onClose={onClose}
      footer={<>
        <Button variant="default" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Saving...' : isEdit ? 'Update Rule' : 'Create Rule'}
        </Button>
      </>}
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-lg text-[#f87171] text-sm">{error}</div>
        )}
        <Input label="Rule Name" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. CPU Critical Threshold"/>
        <Input label="Description" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional description"/>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Event Type" value={form.event_type} onChange={e => set('event_type', e.target.value)}>
            {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
          <div>
            <label className="block text-[11px] text-[#475569] uppercase tracking-widest mb-1.5 font-medium">Priority (1=highest)</label>
            <input
              type="number" min={1} max={10}
              value={form.priority}
              onChange={e => set('priority', +e.target.value)}
              className="w-full bg-[#0d1426] border border-[#1a2540] text-white text-sm px-3 py-2 rounded-lg outline-none focus:border-[#00d4ff]"
            />
          </div>
        </div>

        {/* Condition builder */}
        <div>
          <label className="block text-[11px] text-[#475569] uppercase tracking-widest mb-2 font-medium">IF Condition</label>
          <div className="flex gap-2 items-center p-3 bg-[#080d1a] border border-[#1a2540] rounded-lg">
            <input
              value={form.condition_field}
              onChange={e => set('condition_field', e.target.value)}
              placeholder="field (e.g. cpu_usage)"
              className="flex-1 bg-transparent text-white text-xs font-mono outline-none placeholder:text-[#334155]"
            />
            <select
              value={form.condition_op}
              onChange={e => set('condition_op', e.target.value)}
              className="bg-[#0d1426] border border-[rgba(0,212,255,0.2)] text-[#00d4ff] text-xs font-mono px-2 py-1 rounded outline-none"
            >
              {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
            </select>
            <input
              value={form.condition_value}
              onChange={e => set('condition_value', e.target.value)}
              placeholder="value (e.g. 90)"
              className="flex-1 bg-transparent text-white text-xs font-mono outline-none placeholder:text-[#334155]"
            />
          </div>
          <p className="text-[10px] text-[#334155] mt-1 font-mono">
            IF payload.{form.condition_field || '...'} {form.condition_op} {form.condition_value || '...'}
          </p>
        </div>

        <Select label="THEN Action" value={form.action_id} onChange={e => set('action_id', +e.target.value)}>
          {actions.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
        </Select>
      </div>
    </Modal>
  )
}

function TestSandbox({ rule, onClose }) {
  const [payload, setPayload] = useState('{\n  "' + (rule.condition_field) + '": ' + (rule.condition_value) + '\n}')
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)

  const runTest = async () => {
    try {
      setLoading(true)
      const parsed = JSON.parse(payload)
      const res    = await rulesAPI.test(rule.id, parsed)
      setResult(res.data)
    } catch (err) {
      setResult({ matched: false, outcome: 'error', trace: [], error: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={`Test Sandbox — "${rule.name}"`} onClose={onClose}>
      <div className="space-y-4">
        <div className="p-3 bg-[#080d1a] border border-[#1a2540] rounded-lg font-mono text-xs text-[#475569]">
          IF payload.<span className="text-[#00d4ff]">{rule.condition_field}</span>{' '}
          <span className="text-[#a78bfa]">{rule.condition_op}</span>{' '}
          <span className="text-[#10b981]">{rule.condition_value}</span>{' '}
          → <span className="text-[#fbbf24]">{rule.action_name}</span>
        </div>
        <div>
          <label className="block text-[11px] text-[#475569] uppercase tracking-widest mb-1.5">Test Payload (JSON)</label>
          <textarea
            value={payload}
            onChange={e => setPayload(e.target.value)}
            rows={5}
            className="w-full bg-[#0d1426] border border-[#1a2540] text-[#00d4ff] text-xs font-mono px-3 py-2 rounded-lg outline-none focus:border-[#00d4ff] resize-none"
          />
        </div>
        <Button variant="primary" onClick={runTest} disabled={loading} className="w-full justify-center">
          {loading ? 'Testing...' : '▶ Run Test'}
        </Button>
        {result && (
          <div className={`p-3 rounded-lg border ${result.matched ? 'bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.2)]' : 'bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.2)]'}`}>
            <div className={`font-semibold text-sm mb-2 ${result.matched ? 'text-[#10b981]' : 'text-[#f87171]'}`}>
              {result.matched ? '✓ Rule MATCHED' : '✗ Rule did NOT match'}
            </div>
            {(result.trace || []).map((t, i) => (
              <div key={i} className="text-xs font-mono text-[#94a3b8] mb-1">
                <span className={t.status === 'passed' || t.status === 'executed' ? 'text-[#10b981]' : 'text-[#f87171]'}>
                  {t.status === 'passed' || t.status === 'executed' ? '✓' : '✗'}
                </span>{' '}{t.handler}: {t.message}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

export default function RulesPage() {
  const { isAdmin } = useAuth()
  const [rules,   setRules]   = useState([])
  const [actions, setActions] = useState([])
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate]  = useState(false)
  const [editRule,   setEditRule]    = useState(null)
  const [testRule,   setTestRule]    = useState(null)
  const [filters, setFilters] = useState({ event_type: '', enabled: '' })

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.event_type) params.event_type = filters.event_type
      if (filters.enabled !== '') params.enabled = filters.enabled
      const [rulesRes, actionsRes] = await Promise.all([rulesAPI.getAll(params), actionsAPI.getAll()])
      setRules(rulesRes.data.data || [])
      setStats(rulesRes.data.stats)
      setActions(actionsRes.data.data || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [filters])

  useEffect(() => { fetchAll() }, [fetchAll])

  const toggle = async (id) => {
    try { await rulesAPI.toggle(id); fetchAll() } catch (err) { console.error(err) }
  }

  const deleteRule = async (id, name) => {
    if (!window.confirm(`Delete rule "${name}"?`)) return
    try { await rulesAPI.delete(id); fetchAll() } catch (err) { console.error(err) }
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Rules Engine"
        subtitle={`${stats?.active || 0} active rules of ${stats?.total || 0} total`}
        actions={isAdmin && (
          <Button variant="primary" onClick={() => setShowCreate(true)}>+ New Rule</Button>
        )}
      />

      {/* Filters */}
      <Card className="mb-4">
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#475569] uppercase tracking-widest">Type</span>
            <select
              value={filters.event_type}
              onChange={e => setFilters(f => ({ ...f, event_type: e.target.value }))}
              className="bg-[#0d1426] border border-[#1a2540] text-white text-xs px-2 py-1.5 rounded-lg outline-none"
            >
              <option value="">All types</option>
              {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#475569] uppercase tracking-widest">Status</span>
            <select
              value={filters.enabled}
              onChange={e => setFilters(f => ({ ...f, enabled: e.target.value }))}
              className="bg-[#0d1426] border border-[#1a2540] text-white text-xs px-2 py-1.5 rounded-lg outline-none"
            >
              <option value="">All</option>
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>
          <Button variant="default" size="sm" onClick={() => setFilters({ event_type: '', enabled: '' })}>Reset</Button>
        </div>
      </Card>

      {/* Rules list */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner/></div>
      ) : rules.length === 0 ? (
        <Card><Empty message="No rules found. Create your first rule."/></Card>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <Card key={rule.id} className={`transition-all ${!rule.enabled ? 'opacity-50' : ''}`}>
              <div className="flex items-start gap-4">
                {/* Priority badge */}
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#080d1a] border border-[#1a2540] flex items-center justify-center text-xs font-bold font-mono text-[#00d4ff]">
                  P{rule.priority}
                </div>

                {/* Rule info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white text-sm">{rule.name}</span>
                    <Badge type={rule.event_type}/>
                    {!rule.enabled && <span className="text-[10px] text-[#475569] font-mono bg-[#0d1426] px-2 py-0.5 rounded">DISABLED</span>}
                  </div>
                  {rule.description && <p className="text-xs text-[#475569] mb-2">{rule.description}</p>}

                  {/* Condition */}
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-[#475569]">IF</span>
                    <span className="text-[#00d4ff] bg-[rgba(0,212,255,0.08)] px-1.5 py-0.5 rounded">{rule.condition_field}</span>
                    <span className="text-[#a78bfa]">{rule.condition_op}</span>
                    <span className="text-[#10b981] bg-[rgba(16,185,129,0.08)] px-1.5 py-0.5 rounded">{rule.condition_value}</span>
                    <span className="text-[#475569]">→ THEN</span>
                    <span className="text-[#fbbf24] bg-[rgba(245,158,11,0.08)] px-1.5 py-0.5 rounded">{rule.action_name}</span>
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-[#334155] font-mono">Executions: {rule.exec_count}</span>
                    <span className="text-[10px] text-[#334155] font-mono">Action: {rule.action_type}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isAdmin && (
                    <>
                      <Toggle checked={!!rule.enabled} onChange={() => toggle(rule.id)}/>
                      <Button size="sm" variant="purple" onClick={() => setTestRule(rule)}>Test</Button>
                      <Button size="sm" variant="default" onClick={() => setEditRule(rule)}>Edit</Button>
                      <Button size="sm" variant="danger"  onClick={() => deleteRule(rule.id, rule.name)}>Del</Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showCreate && (
        <RuleModal actions={actions} onClose={() => setShowCreate(false)} onSaved={fetchAll}/>
      )}
      {editRule && (
        <RuleModal rule={editRule} actions={actions} onClose={() => setEditRule(null)} onSaved={fetchAll}/>
      )}
      {testRule && (
        <TestSandbox rule={testRule} onClose={() => setTestRule(null)}/>
      )}
    </div>
  )
}
