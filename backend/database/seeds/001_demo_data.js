/**
 * database/seeds/001_demo_data.js
 *
 * Seeds demo data into SQL Server.
 * Uses MERGE statement (SQL Server's equivalent of INSERT OR IGNORE).
 * Safe to re-run multiple times — will not create duplicates.
 *
 * Run with: npm run seed
 */

const bcrypt        = require('bcryptjs');
const { execute, queryOne } = require('../connection');

async function seed() {
  console.log('[Seed] Starting demo data...\n');

  // ── USERS ─────────────────────────────────────────────────────────────────
  const adminHash    = await bcrypt.hash('Admin@1234', 12);
  const operatorHash = await bcrypt.hash('Operator@1234', 12);

  await execute(`
    MERGE users AS target
    USING (VALUES ('admin', 'admin@sentinel.io', '${adminHash}', 'admin'))
      AS source (username, email, password_hash, role)
    ON target.username = source.username
    WHEN NOT MATCHED THEN
      INSERT (username, email, password_hash, role)
      VALUES (source.username, source.email, source.password_hash, source.role);
  `);

  await execute(`
    MERGE users AS target
    USING (VALUES ('operator', 'operator@sentinel.io', '${operatorHash}', 'user'))
      AS source (username, email, password_hash, role)
    ON target.username = source.username
    WHEN NOT MATCHED THEN
      INSERT (username, email, password_hash, role)
      VALUES (source.username, source.email, source.password_hash, source.role);
  `);

  const adminUser = await queryOne(`SELECT id FROM users WHERE username = 'admin'`);
  console.log('[Seed] ✓ Users  →  admin / operator');

  // ── ACTIONS ───────────────────────────────────────────────────────────────
  const actions = [
    {
      name: 'Critical Alert',
      type: 'send_alert',
      config: '{"severity":"critical","channel":"dashboard","sound":true}',
      description: 'Sends a critical priority alert to the dashboard',
    },
    {
      name: 'Log System Issue',
      type: 'log_issue',
      config: '{"severity":"high","tag":"system"}',
      description: 'Creates a structured issue log entry for system events',
    },
    {
      name: 'Block Suspicious User',
      type: 'block_user',
      config: '{"duration_minutes":30,"notify_admin":true}',
      description: 'Temporarily blocks a user account on suspicious activity',
    },
    {
      name: 'Throttle Performance',
      type: 'change_state',
      config: '{"target":"resource_limiter","state":"throttled"}',
      description: 'Activates resource throttling when performance degrades',
    },
    {
      name: 'Notify Admin',
      type: 'send_notification',
      config: '{"recipients":["admin"],"priority":"high"}',
      description: 'Sends an in-app notification to all admin users',
    },
  ];

  for (const a of actions) {
    await execute(`
      MERGE actions AS target
      USING (VALUES (N'${a.name}', N'${a.type}', N'${a.config}', N'${a.description}'))
        AS source (name, type, config, description)
      ON target.name = source.name
      WHEN NOT MATCHED THEN
        INSERT (name, type, config, description)
        VALUES (source.name, source.type, source.config, source.description);
    `);
  }
  console.log('[Seed] ✓ Actions  →  5 action types inserted');

  // Fetch action IDs for rule wiring
  const getActionId = async (name) => {
    const row = await queryOne(`SELECT id FROM actions WHERE name = N'${name}'`);
    return row.id;
  };

  // ── RULES ─────────────────────────────────────────────────────────────────
  const rules = [
    {
      name:            'CPU Critical Threshold',
      description:     'Fires when CPU usage exceeds 90%',
      event_type:      'performance',
      condition_field: 'cpu_usage',
      condition_op:    '>',
      condition_value: '90',
      action:          'Critical Alert',
      priority:        1,
    },
    {
      name:            'High Memory Usage',
      description:     'Logs an issue when memory exceeds 85%',
      event_type:      'performance',
      condition_field: 'memory_usage',
      condition_op:    '>=',
      condition_value: '85',
      action:          'Log System Issue',
      priority:        3,
    },
    {
      name:            'Failed Login Flood',
      description:     'Blocks user after 5 or more failed login attempts',
      event_type:      'security',
      condition_field: 'failed_attempts',
      condition_op:    '>=',
      condition_value: '5',
      action:          'Block Suspicious User',
      priority:        1,
    },
    {
      name:            'Unauthorized Access Attempt',
      description:     'Notifies admin on any high severity security event',
      event_type:      'security',
      condition_field: 'severity',
      condition_op:    '==',
      condition_value: 'high',
      action:          'Notify Admin',
      priority:        2,
    },
    {
      name:            'Service Down Alert',
      description:     'Critical alert when a system service goes offline',
      event_type:      'system',
      condition_field: 'service_status',
      condition_op:    '==',
      condition_value: 'down',
      action:          'Critical Alert',
      priority:        1,
    },
    {
      name:            'Response Time Degraded',
      description:     'Throttles resources when response time exceeds 2000ms',
      event_type:      'performance',
      condition_field: 'response_time_ms',
      condition_op:    '>',
      condition_value: '2000',
      action:          'Throttle Performance',
      priority:        4,
    },
  ];

  for (const r of rules) {
    const actionId = await getActionId(r.action);
    await execute(`
      MERGE rules AS target
      USING (VALUES (N'${r.name}'))
        AS source (name)
      ON target.name = source.name
      WHEN NOT MATCHED THEN
        INSERT (created_by, name, description, event_type, condition_field,
                condition_op, condition_value, action_id, priority)
        VALUES (${adminUser.id}, N'${r.name}', N'${r.description}',
                N'${r.event_type}', N'${r.condition_field}',
                N'${r.condition_op}', N'${r.condition_value}',
                ${actionId}, ${r.priority});
    `);
  }
  console.log('[Seed] ✓ Rules  →  6 rules inserted');

  // ── SAMPLE EVENTS ─────────────────────────────────────────────────────────
  const events = [
    { type:'performance', title:'CPU spike detected',           payload:'{"cpu_usage":94,"memory_usage":72}',              status:'resolved',   source:'simulator' },
    { type:'security',    title:'Failed login flood',           payload:'{"failed_attempts":7,"ip":"192.168.1.45"}',        status:'resolved',   source:'simulator' },
    { type:'system',      title:'Auth service went offline',    payload:'{"service":"auth-service","service_status":"down"}', status:'resolved', source:'simulator' },
    { type:'performance', title:'Memory pressure high',         payload:'{"memory_usage":88,"swap_usage":42}',              status:'resolved',   source:'simulator' },
    { type:'security',    title:'Unauthorized API access',      payload:'{"severity":"high","endpoint":"/api/admin"}',      status:'resolved',   source:'api'       },
    { type:'user',        title:'Bulk export triggered',        payload:'{"user_id":2,"records":50000}',                    status:'ignored',    source:'manual'    },
    { type:'performance', title:'Response time degraded',       payload:'{"response_time_ms":3400,"endpoint":"/api/events"}', status:'resolved', source:'simulator' },
    { type:'system',      title:'DB connection pool exhausted', payload:'{"pool_size":10,"active":10,"waiting":34}',        status:'resolved',   source:'simulator' },
    { type:'security',    title:'Port scan detected',           payload:'{"severity":"high","source_ip":"10.0.0.99"}',      status:'processing', source:'api'       },
    { type:'user',        title:'Admin role self-assigned',     payload:'{"target_user_id":5,"action":"role_change"}',      status:'pending',    source:'manual'    },
  ];

  for (const ev of events) {
    await execute(`
      INSERT INTO events (user_id, type, title, payload, status, source)
      VALUES (${adminUser.id}, N'${ev.type}', N'${ev.title}',
              N'${ev.payload}', N'${ev.status}', N'${ev.source}');
    `);
  }
  console.log('[Seed] ✓ Events  →  10 sample events inserted');

  console.log('\n[Seed] All demo data loaded successfully!');
  console.log('[Seed] Login credentials:');
  console.log('       Admin    →  username: admin     password: Admin@1234');
  console.log('       Operator →  username: operator  password: Operator@1234');
}

module.exports = { seed };
