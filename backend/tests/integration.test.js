/**
 * tests/integration.test.js
 *
 * Integration tests for the full Sentinel pipeline.
 * Tests every major flow end-to-end.
 *
 * Run with: node tests/integration.test.js
 * (No test framework needed — pure Node.js)
 */

require('dotenv').config()
const http = require('http')

const BASE = `http://localhost:${process.env.PORT || 3001}/api`

let token       = null
let testEventId = null
let testRuleId  = null
let passed      = 0
let failed      = 0

// ── Helpers ───────────────────────────────────────────────────────────────────
function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url     = new URL(BASE + path)
    const data    = body ? JSON.stringify(body) : null
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const req = http.request({
      hostname: url.hostname,
      port:     url.port,
      path:     url.pathname + url.search,
      method,
      headers,
    }, res => {
      let raw = ''
      res.on('data', chunk => raw += chunk)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }) }
        catch { resolve({ status: res.statusCode, body: raw }) }
      })
    })

    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

function assert(name, condition, detail = '') {
  if (condition) {
    console.log(`  ✓ ${name}`)
    passed++
  } else {
    console.log(`  ✗ ${name} ${detail ? `— ${detail}` : ''}`)
    failed++
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────
async function testHealth() {
  console.log('\n[1] Health Check')
  const res = await request('GET', '/health')
  assert('Server is running',       res.status === 200)
  assert('Status is ok',            res.body.status === 'ok')
  assert('Engine status included',  !!res.body.engine)
  assert('Engine is running',       res.body.engine?.running === true)
}

async function testAuth() {
  console.log('\n[2] Authentication')

  // Login with wrong password
  const bad = await request('POST', '/auth/login', { username: 'admin', password: 'wrongpass' })
  assert('Rejects invalid credentials', bad.status === 401)

  // Login with correct credentials
  const res = await request('POST', '/auth/login', { username: 'admin', password: 'Admin@1234' })
  assert('Login succeeds',       res.status === 200)
  assert('Returns JWT token',    !!res.body.token)
  assert('Returns user object',  !!res.body.user)
  assert('User role is admin',   res.body.user?.role === 'admin')
  token = res.body.token

  // Get current user
  const me = await request('GET', '/auth/me')
  assert('GET /auth/me returns user', me.status === 200)
  assert('No password in response',   !me.body.user?.password_hash)
}

async function testEvents() {
  console.log('\n[3] Events')

  // List events
  const list = await request('GET', '/events?limit=5')
  assert('GET /events returns 200',     list.status === 200)
  assert('Returns array of events',     Array.isArray(list.body.data))
  assert('Has pagination object',       !!list.body.pagination)

  // Get stats
  const stats = await request('GET', '/events/stats')
  assert('GET /events/stats returns 200', stats.status === 200)
  assert('Has total count',               typeof stats.body.data?.total === 'number')

  // Create event — triggers full pipeline
  const create = await request('POST', '/events', {
    type:    'performance',
    title:   'Integration Test — CPU spike',
    payload: { cpu_usage: 95, memory_usage: 70 },
  })
  assert('POST /events creates event',        create.status === 201)
  assert('Returns event object',              !!create.body.data)
  assert('Returns pipeline result',           !!create.body.pipeline)
  assert('Pipeline has trace array',          Array.isArray(create.body.pipeline?.trace))
  assert('Pipeline has duration_ms',          typeof create.body.pipeline?.duration_ms === 'number')
  testEventId = create.body.data?.id

  // Update status
  if (testEventId) {
    const update = await request('PATCH', `/events/${testEventId}/status`, { status: 'resolved' })
    assert('PATCH /events/:id/status works', update.status === 200)
  }

  // Filter by type
  const filtered = await request('GET', '/events?type=performance&limit=5')
  assert('Filter by type works', filtered.status === 200)
}

async function testRules() {
  console.log('\n[4] Rules')

  // List rules
  const list = await request('GET', '/rules')
  assert('GET /rules returns 200',   list.status === 200)
  assert('Returns array of rules',   Array.isArray(list.body.data))
  assert('Has stats object',         !!list.body.stats)

  // Get actions first (needed for rule creation)
  const actions = await request('GET', '/actions')
  assert('GET /actions returns 200', actions.status === 200)
  const actionId = actions.body.data?.[0]?.id

  // Create rule
  const create = await request('POST', '/rules', {
    name:            'Integration Test Rule',
    description:     'Auto-created by integration test',
    event_type:      'performance',
    condition_field: 'cpu_usage',
    condition_op:    '>',
    condition_value: '80',
    action_id:       actionId,
    priority:        9,
  })
  assert('POST /rules creates rule',    create.status === 201)
  assert('Rule has correct name',       create.body.data?.name === 'Integration Test Rule')
  testRuleId = create.body.data?.id

  // Toggle rule
  if (testRuleId) {
    const toggle = await request('PATCH', `/rules/${testRuleId}/toggle`)
    assert('PATCH /rules/:id/toggle works', toggle.status === 200)

    // Toggle back
    await request('PATCH', `/rules/${testRuleId}/toggle`)
  }

  // Test rule sandbox
  if (testRuleId) {
    const test = await request('POST', `/rules/${testRuleId}/test`, {
      payload: { cpu_usage: 95 }
    })
    assert('POST /rules/:id/test works',  test.status === 200)
    assert('Test returns matched result', typeof test.body.matched === 'boolean')
    assert('Test returns trace array',    Array.isArray(test.body.trace))
  }
}

async function testLogs() {
  console.log('\n[5] Decision Logs')

  const list = await request('GET', '/logs?limit=5')
  assert('GET /logs returns 200',       list.status === 200)
  assert('Returns array of logs',       Array.isArray(list.body.data))
  assert('Has pagination',              !!list.body.pagination)

  const stats = await request('GET', '/logs/stats')
  assert('GET /logs/stats returns 200', stats.status === 200)
  assert('Has byOutcome array',         Array.isArray(stats.body.data?.byOutcome))
  assert('Has avgDuration',             typeof stats.body.data?.avgDuration === 'number')

  // Filter by outcome
  const filtered = await request('GET', '/logs?outcome=executed&limit=5')
  assert('Filter by outcome works', filtered.status === 200)
}

async function testSimulation() {
  console.log('\n[6] Simulation Engine')

  // Get status
  const status = await request('GET', '/simulation/status')
  assert('GET /simulation/status works', status.status === 200)
  assert('Has simulation object',        !!status.body.data?.simulation)
  assert('Has ruleEngine object',        !!status.body.data?.ruleEngine)

  // Fire one event
  const fire = await request('POST', '/simulation/fire', { type: 'security' })
  assert('POST /simulation/fire works',   fire.status === 200)
  assert('Returns fired event object',    !!fire.body.data)
  assert('Event type is security',        fire.body.data?.type === 'security')

  // Start simulation
  const start = await request('POST', '/simulation/start', { interval_ms: 10000 })
  assert('POST /simulation/start works',  start.status === 200)
  assert('Simulation is running',         start.body.data?.running === true)

  // Stop simulation
  const stop = await request('POST', '/simulation/stop')
  assert('POST /simulation/stop works',   stop.status === 200)
  assert('Simulation stopped',            stop.body.data?.running === false)
}

async function testPipelineFlow() {
  console.log('\n[7] Full Pipeline Flow (Observer → Chain → Strategy)')

  // Fire an event that should match the CPU critical rule (>90%)
  const res = await request('POST', '/events', {
    type:    'performance',
    title:   'Pipeline Flow Test — CPU Critical',
    payload: { cpu_usage: 99, memory_usage: 88 },
  })

  assert('Event created successfully',         res.status === 201)
  assert('Pipeline completed',                 !!res.body.pipeline)
  assert('Trace has at least 1 step',          (res.body.pipeline?.trace?.length || 0) >= 1)
  assert('Outcome is defined',                 !!res.body.pipeline?.outcome)

  const trace = res.body.pipeline?.trace || []
  const validationStep = trace.find(s => s.handler === 'ValidationHandler')
  const ruleMatchStep  = trace.find(s => s.handler === 'RuleMatchHandler')

  assert('ValidationHandler ran',  !!validationStep)
  assert('Validation passed',      validationStep?.status === 'passed')
  assert('RuleMatchHandler ran',   !!ruleMatchStep)

  console.log(`    → Pipeline outcome: "${res.body.pipeline?.outcome}"`)
  console.log(`    → Duration: ${res.body.pipeline?.duration_ms}ms`)
  console.log(`    → Steps: ${trace.length}`)
}

async function cleanup() {
  console.log('\n[8] Cleanup')
  if (testRuleId) {
    const del = await request('DELETE', `/rules/${testRuleId}`)
    assert('Test rule deleted', del.status === 200)
  }
}

// ── Run all tests ─────────────────────────────────────────────────────────────
async function runAll() {
  console.log('═'.repeat(55))
  console.log('  SENTINEL — Integration Tests')
  console.log('═'.repeat(55))
  console.log(`  Target: ${BASE}`)

  try {
    await testHealth()
    await testAuth()
    await testEvents()
    await testRules()
    await testLogs()
    await testSimulation()
    await testPipelineFlow()
    await cleanup()
  } catch (err) {
    console.error('\n[FATAL]', err.message)
    console.error('Make sure backend is running: npm run dev')
  }

  console.log('\n' + '═'.repeat(55))
  console.log(`  Results: ${passed} passed, ${failed} failed`)
  console.log('═'.repeat(55))

  if (failed === 0) {
    console.log('\n  ✓ ALL TESTS PASSED — Sentinel is fully operational!\n')
  } else {
    console.log(`\n  ✗ ${failed} test(s) failed — check backend logs\n`)
  }

  process.exit(failed > 0 ? 1 : 0)
}

runAll()
