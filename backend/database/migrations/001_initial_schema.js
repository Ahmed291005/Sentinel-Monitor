/**
 * database/migrations/001_initial_schema.js
 *
 * Creates all 6 tables using T-SQL (SQL Server syntax).
 * Run with: npm run migrate
 *
 * You can also copy each CREATE TABLE block and run it
 * directly inside SQL Server Management Studio (SSMS).
 *
 * Table creation order (respects foreign key dependencies):
 *   1. users
 *   2. actions
 *   3. events
 *   4. rules
 *   5. decision_logs
 *   6. sessions
 */

const { execute } = require('../connection');

async function up() {
  console.log('[Migration] Starting 001_initial_schema ...\n');

  // ── ① USERS ──────────────────────────────────────────────────────────────
  await execute(`
    IF NOT EXISTS (
      SELECT * FROM sysobjects WHERE name='users' AND xtype='U'
    )
    CREATE TABLE users (
      id            INT            IDENTITY(1,1)  PRIMARY KEY,
      username      NVARCHAR(50)   NOT NULL        UNIQUE,
      email         NVARCHAR(255)  NOT NULL        UNIQUE,
      password_hash NVARCHAR(255)  NOT NULL,
      role          NVARCHAR(10)   NOT NULL        DEFAULT 'user'
                    CONSTRAINT chk_users_role CHECK (role IN ('admin','user')),
      created_at    DATETIME2      NOT NULL        DEFAULT GETDATE(),
      last_login    DATETIME2      NULL
    );
  `);
  console.log('[Migration] ✓ Table: users');

  // Indexes for users
  await execute(`
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_users_email')
      CREATE INDEX idx_users_email    ON users(email);
  `);
  await execute(`
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_users_username')
      CREATE INDEX idx_users_username ON users(username);
  `);

  // ── ② ACTIONS ────────────────────────────────────────────────────────────
  // Must be created before rules (rules.action_id references this table)
  await execute(`
    IF NOT EXISTS (
      SELECT * FROM sysobjects WHERE name='actions' AND xtype='U'
    )
    CREATE TABLE actions (
      id          INT            IDENTITY(1,1)  PRIMARY KEY,
      name        NVARCHAR(100)  NOT NULL        UNIQUE,
      type        NVARCHAR(30)   NOT NULL
                  CONSTRAINT chk_actions_type CHECK (type IN (
                    'send_alert',
                    'log_issue',
                    'change_state',
                    'send_notification',
                    'block_user'
                  )),
      config      NVARCHAR(MAX)  NOT NULL        DEFAULT '{}',
      description NVARCHAR(255)  NULL,
      created_at  DATETIME2      NOT NULL        DEFAULT GETDATE()
    );
  `);
  console.log('[Migration] ✓ Table: actions');

  // ── ③ EVENTS ─────────────────────────────────────────────────────────────
  await execute(`
    IF NOT EXISTS (
      SELECT * FROM sysobjects WHERE name='events' AND xtype='U'
    )
    CREATE TABLE events (
      id         INT            IDENTITY(1,1)  PRIMARY KEY,
      user_id    INT            NULL
                 CONSTRAINT fk_events_user FOREIGN KEY REFERENCES users(id)
                 ON DELETE SET NULL,
      type       NVARCHAR(20)   NOT NULL
                 CONSTRAINT chk_events_type CHECK (type IN (
                   'system','user','security','performance'
                 )),
      title      NVARCHAR(200)  NOT NULL,
      payload    NVARCHAR(MAX)  NOT NULL        DEFAULT '{}',
      status     NVARCHAR(20)   NOT NULL        DEFAULT 'pending'
                 CONSTRAINT chk_events_status CHECK (status IN (
                   'pending','processing','resolved','ignored'
                 )),
      source     NVARCHAR(50)   NOT NULL        DEFAULT 'manual',
      created_at DATETIME2      NOT NULL        DEFAULT GETDATE()
    );
  `);
  console.log('[Migration] ✓ Table: events');

  await execute(`
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_events_type')
      CREATE INDEX idx_events_type       ON events(type);
  `);
  await execute(`
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_events_status')
      CREATE INDEX idx_events_status     ON events(status);
  `);
  await execute(`
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_events_created_at')
      CREATE INDEX idx_events_created_at ON events(created_at DESC);
  `);

  // ── ④ RULES ──────────────────────────────────────────────────────────────
  await execute(`
    IF NOT EXISTS (
      SELECT * FROM sysobjects WHERE name='rules' AND xtype='U'
    )
    CREATE TABLE rules (
      id              INT            IDENTITY(1,1)  PRIMARY KEY,
      created_by      INT            NOT NULL
                      CONSTRAINT fk_rules_user FOREIGN KEY REFERENCES users(id),
      name            NVARCHAR(100)  NOT NULL,
      description     NVARCHAR(MAX)  NULL,
      event_type      NVARCHAR(20)   NOT NULL
                      CONSTRAINT chk_rules_event_type CHECK (event_type IN (
                        'system','user','security','performance','any'
                      )),
      condition_field NVARCHAR(100)  NOT NULL,
      condition_op    NVARCHAR(10)   NOT NULL
                      CONSTRAINT chk_rules_op CHECK (condition_op IN (
                        '>','>=','<','<=','==','!=','contains'
                      )),
      condition_value NVARCHAR(255)  NOT NULL,
      action_id       INT            NOT NULL
                      CONSTRAINT fk_rules_action FOREIGN KEY REFERENCES actions(id),
      priority        INT            NOT NULL        DEFAULT 5
                      CONSTRAINT chk_rules_priority CHECK (priority BETWEEN 1 AND 10),
      enabled         BIT            NOT NULL        DEFAULT 1,
      exec_count      INT            NOT NULL        DEFAULT 0,
      created_at      DATETIME2      NOT NULL        DEFAULT GETDATE()
    );
  `);
  console.log('[Migration] ✓ Table: rules');

  await execute(`
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_rules_event_type')
      CREATE INDEX idx_rules_event_type ON rules(event_type);
  `);
  await execute(`
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_rules_enabled')
      CREATE INDEX idx_rules_enabled    ON rules(enabled);
  `);
  await execute(`
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_rules_priority')
      CREATE INDEX idx_rules_priority   ON rules(priority ASC);
  `);

  // ── ⑤ DECISION LOGS ──────────────────────────────────────────────────────
  await execute(`
    IF NOT EXISTS (
      SELECT * FROM sysobjects WHERE name='decision_logs' AND xtype='U'
    )
    CREATE TABLE decision_logs (
      id           INT            IDENTITY(1,1)  PRIMARY KEY,
      event_id     INT            NOT NULL
                   CONSTRAINT fk_dlogs_event  FOREIGN KEY REFERENCES events(id),
      rule_id      INT            NULL
                   CONSTRAINT fk_dlogs_rule   FOREIGN KEY REFERENCES rules(id)
                   ON DELETE SET NULL,
      action_id    INT            NULL
                   CONSTRAINT fk_dlogs_action FOREIGN KEY REFERENCES actions(id)
                   ON DELETE SET NULL,
      triggered_by INT            NULL
                   CONSTRAINT fk_dlogs_user   FOREIGN KEY REFERENCES users(id)
                   ON DELETE SET NULL,
      outcome      NVARCHAR(20)   NOT NULL
                   CONSTRAINT chk_dlogs_outcome CHECK (outcome IN (
                     'executed','skipped','failed','no_rule_match'
                   )),
      chain_trace  NVARCHAR(MAX)  NOT NULL        DEFAULT '[]',
      duration_ms  INT            NULL,
      created_at   DATETIME2      NOT NULL        DEFAULT GETDATE()
    );
  `);
  console.log('[Migration] ✓ Table: decision_logs');

  await execute(`
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_dlogs_event_id')
      CREATE INDEX idx_dlogs_event_id   ON decision_logs(event_id);
  `);
  await execute(`
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_dlogs_outcome')
      CREATE INDEX idx_dlogs_outcome    ON decision_logs(outcome);
  `);
  await execute(`
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_dlogs_created_at')
      CREATE INDEX idx_dlogs_created_at ON decision_logs(created_at DESC);
  `);

  // ── ⑥ SESSIONS ───────────────────────────────────────────────────────────
  await execute(`
    IF NOT EXISTS (
      SELECT * FROM sysobjects WHERE name='sessions' AND xtype='U'
    )
    CREATE TABLE sessions (
      id          INT            IDENTITY(1,1)  PRIMARY KEY,
      user_id     INT            NOT NULL
                  CONSTRAINT fk_sessions_user FOREIGN KEY REFERENCES users(id)
                  ON DELETE CASCADE,
      token_hash  NVARCHAR(255)  NOT NULL        UNIQUE,
      expires_at  DATETIME2      NOT NULL,
      created_at  DATETIME2      NOT NULL        DEFAULT GETDATE()
    );
  `);
  console.log('[Migration] ✓ Table: sessions');

  await execute(`
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_sessions_user_id')
      CREATE INDEX idx_sessions_user_id    ON sessions(user_id);
  `);
  await execute(`
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_sessions_token_hash')
      CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
  `);

  console.log('\n[Migration] 001_initial_schema → ALL TABLES CREATED SUCCESSFULLY ✓');
}

async function down() {
  console.log('[Migration] Rolling back 001_initial_schema ...');

  // Drop in reverse FK order
  const tables = ['sessions','decision_logs','rules','events','actions','users'];
  for (const table of tables) {
    await execute(`
      IF EXISTS (SELECT * FROM sysobjects WHERE name='${table}' AND xtype='U')
        DROP TABLE ${table};
    `);
    console.log(`[Migration] ✓ Dropped: ${table}`);
  }
}

module.exports = { up, down };
