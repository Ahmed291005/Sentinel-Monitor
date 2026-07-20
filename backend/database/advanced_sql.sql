-- ============================================================
--  SENTINEL MONITOR — ADVANCED SQL FEATURES
--  Run this entire file in SSMS once against your SentinelDB.
--
--  DBMS Lab Topics Covered:
--    ✓ Views
--    ✓ Stored Procedures
--    ✓ Triggers
--    ✓ ROLLUP and CUBE
--    ✓ Set Operations (UNION / INTERSECT / EXCEPT)
--    ✓ Subqueries (correlated + scalar)
--    ✓ SQL Functions (GETDATE, FORMAT, DATEADD, DATEDIFF, etc.)
--    ✓ SQL Joins (already in models — shown here for clarity)
-- ============================================================

USE SentinelDB;
GO

-- ============================================================
--  SECTION 1 — VIEWS
--  A VIEW is a stored, named SELECT query that behaves like a
--  virtual table. Applications query the view; the underlying
--  complexity is hidden.
-- ============================================================

-- ── View 1: vw_ActiveAlerts ──────────────────────────────────
-- Shows all pending/processing events together with the user
-- who created them (demonstrates JOIN inside a view).
IF OBJECT_ID('vw_ActiveAlerts', 'V') IS NOT NULL
    DROP VIEW vw_ActiveAlerts;
GO
CREATE VIEW vw_ActiveAlerts AS
    SELECT
        e.id            AS event_id,
        e.type          AS event_type,
        e.title,
        e.status,
        e.source,
        e.created_at,
        u.username      AS created_by,
        DATEDIFF(MINUTE, e.created_at, GETDATE()) AS age_minutes   -- SQL Function
    FROM events e
    LEFT JOIN users u ON e.user_id = u.id
    WHERE e.status IN ('pending', 'processing');
GO

-- ── View 2: vw_PipelineSummary ───────────────────────────────
-- Shows every decision log enriched with event, rule, action,
-- and user data — a 4-table JOIN in one virtual table.
IF OBJECT_ID('vw_PipelineSummary', 'V') IS NOT NULL
    DROP VIEW vw_PipelineSummary;
GO
CREATE VIEW vw_PipelineSummary AS
    SELECT
        dl.id               AS log_id,
        dl.outcome,
        dl.duration_ms,
        dl.created_at       AS decision_time,
        e.type              AS event_type,
        e.title             AS event_title,
        r.name              AS rule_name,
        r.priority          AS rule_priority,
        a.name              AS action_name,
        a.type              AS action_type,
        u.username          AS triggered_by,
        FORMAT(dl.created_at, 'yyyy-MM-dd') AS decision_date  -- SQL Function
    FROM decision_logs dl
    JOIN  events  e ON dl.event_id    = e.id
    LEFT JOIN rules   r ON dl.rule_id     = r.id
    LEFT JOIN actions a ON dl.action_id   = a.id
    LEFT JOIN users   u ON dl.triggered_by = u.id;
GO

-- ── View 3: vw_TopRules ──────────────────────────────────────
-- Pre-aggregated leaderboard of rules sorted by execution count
-- Uses GROUP BY + COUNT + ORDER BY inside a view.
IF OBJECT_ID('vw_TopRules', 'V') IS NOT NULL
    DROP VIEW vw_TopRules;
GO
CREATE VIEW vw_TopRules AS
    SELECT TOP 10
        r.id,
        r.name              AS rule_name,
        r.event_type,
        r.priority,
        r.enabled,
        COUNT(dl.id)        AS total_executions,
        SUM(CASE WHEN dl.outcome = 'executed' THEN 1 ELSE 0 END) AS successful,
        AVG(CAST(dl.duration_ms AS FLOAT))                       AS avg_duration_ms
    FROM rules r
    LEFT JOIN decision_logs dl ON r.id = dl.rule_id
    GROUP BY r.id, r.name, r.event_type, r.priority, r.enabled
    ORDER BY total_executions DESC;
GO

-- ============================================================
--  SECTION 2 — STORED PROCEDURES
--  A stored procedure is a precompiled, named block of SQL that
--  can accept parameters, execute complex logic, and return
--  result sets — all in a single EXEC call from the application.
-- ============================================================

-- ── SP 1: sp_GetDashboardStats ───────────────────────────────
-- Returns 4 result sets: event summary, log summary,
-- top rules, and average response time.
-- The Node.js backend calls: EXEC sp_GetDashboardStats
IF OBJECT_ID('sp_GetDashboardStats', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetDashboardStats;
GO
CREATE PROCEDURE sp_GetDashboardStats
AS
BEGIN
    SET NOCOUNT ON;

    -- Result Set 1: Event counts by status
    SELECT
        status,
        COUNT(*) AS count
    FROM events
    GROUP BY status;

    -- Result Set 2: Decision log counts by outcome
    SELECT
        outcome,
        COUNT(*)                              AS count,
        AVG(CAST(duration_ms AS FLOAT))       AS avg_duration_ms
    FROM decision_logs
    GROUP BY outcome;

    -- Result Set 3: Top 5 rules by execution (uses JOIN)
    SELECT TOP 5
        r.name          AS rule_name,
        r.priority,
        COUNT(dl.id)    AS executions
    FROM rules r
    JOIN decision_logs dl ON r.id = dl.rule_id
    GROUP BY r.name, r.priority
    ORDER BY executions DESC;

    -- Result Set 4: Scalar totals
    SELECT
        (SELECT COUNT(*) FROM events)        AS total_events,
        (SELECT COUNT(*) FROM rules)         AS total_rules,
        (SELECT COUNT(*) FROM decision_logs) AS total_logs,
        (SELECT COUNT(*) FROM users)         AS total_users,
        GETDATE()                            AS generated_at;
END;
GO

-- ── SP 2: sp_ProcessEvent ────────────────────────────────────
-- Accepts an event_id, looks up applicable rules, creates a
-- decision log, and updates the event status — all atomically
-- inside a transaction.
IF OBJECT_ID('sp_ProcessEvent', 'P') IS NOT NULL
    DROP PROCEDURE sp_ProcessEvent;
GO
CREATE PROCEDURE sp_ProcessEvent
    @event_id    INT,
    @triggered_by INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @event_type  NVARCHAR(20);
        DECLARE @rule_id     INT;
        DECLARE @action_id   INT;
        DECLARE @outcome     NVARCHAR(20) = 'no_rule_match';
        DECLARE @start_time  DATETIME2    = GETDATE();

        -- Step 1: Get the event type
        SELECT @event_type = type FROM events WHERE id = @event_id;

        IF @event_type IS NULL
        BEGIN
            RAISERROR('Event not found: %d', 16, 1, @event_id);
            ROLLBACK TRANSACTION;
            RETURN;
        END;

        -- Step 2: Find the highest-priority matching rule (Subquery inside SP)
        SELECT TOP 1
            @rule_id   = r.id,
            @action_id = r.action_id
        FROM rules r
        WHERE r.enabled = 1
          AND (r.event_type = @event_type OR r.event_type = 'any')
        ORDER BY r.priority ASC;

        IF @rule_id IS NOT NULL
        BEGIN
            SET @outcome = 'executed';
            -- Increment rule execution counter
            UPDATE rules SET exec_count = exec_count + 1 WHERE id = @rule_id;
        END;

        -- Step 3: Write the decision log
        INSERT INTO decision_logs
            (event_id, rule_id, action_id, triggered_by, outcome,
             chain_trace, duration_ms)
        VALUES
            (@event_id, @rule_id, @action_id, @triggered_by, @outcome,
             '[]', DATEDIFF(MILLISECOND, @start_time, GETDATE()));

        -- Step 4: Update event status
        UPDATE events
        SET status = 'resolved'
        WHERE id = @event_id AND status = 'pending';

        COMMIT TRANSACTION;

        -- Return the new log row
        SELECT TOP 1 * FROM decision_logs
        WHERE event_id = @event_id
        ORDER BY created_at DESC;

    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ── SP 3: sp_CleanOldLogs ────────────────────────────────────
-- Deletes decision_logs older than @days_to_keep days.
-- Shows parameterized DELETE with date arithmetic.
IF OBJECT_ID('sp_CleanOldLogs', 'P') IS NOT NULL
    DROP PROCEDURE sp_CleanOldLogs;
GO
CREATE PROCEDURE sp_CleanOldLogs
    @days_to_keep INT = 30
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @cutoff DATETIME2 = DATEADD(DAY, -@days_to_keep, GETDATE());

    DELETE FROM decision_logs
    WHERE created_at < @cutoff;

    SELECT @@ROWCOUNT AS rows_deleted, @cutoff AS cutoff_date;
END;
GO

-- ============================================================
--  SECTION 3 — TRIGGERS
--  A trigger is a special stored procedure that fires AUTO-
--  MATICALLY in response to INSERT, UPDATE, or DELETE events
--  on a table — enforcing business rules at the DB level.
-- ============================================================

-- ── Trigger 1: trg_AfterEventInsert ─────────────────────────
-- Fires AFTER every INSERT on the events table.
-- Automatically creates a placeholder decision_log so every
-- event is traceable from the moment of creation.
IF OBJECT_ID('trg_AfterEventInsert', 'TR') IS NOT NULL
    DROP TRIGGER trg_AfterEventInsert;
GO
CREATE TRIGGER trg_AfterEventInsert
ON events
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    -- inserted is a special logical table containing the new rows
    INSERT INTO decision_logs (event_id, rule_id, action_id, triggered_by,
                               outcome, chain_trace, duration_ms)
    SELECT
        i.id,          -- event_id
        NULL,          -- rule_id  (not yet evaluated)
        NULL,          -- action_id
        i.user_id,     -- triggered_by
        'no_rule_match',
        '["auto-logged by trigger trg_AfterEventInsert"]',
        0
    FROM inserted i;
END;
GO

-- ── Trigger 2: trg_AfterRuleUpdate ──────────────────────────
-- Fires AFTER every UPDATE on the rules table.
-- Logs a system event capturing what changed, creating an
-- immutable audit trail at the DB level.
IF OBJECT_ID('trg_AfterRuleUpdate', 'TR') IS NOT NULL
    DROP TRIGGER trg_AfterRuleUpdate;
GO
CREATE TRIGGER trg_AfterRuleUpdate
ON rules
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    -- inserted = new values, deleted = old values
    INSERT INTO events (user_id, type, title, payload, source)
    SELECT
        i.created_by,
        'system',
        CONCAT('Rule updated: ', i.name),
        CONCAT('{"rule_id":', i.id,
               ',"old_priority":', d.priority,
               ',"new_priority":', i.priority,
               ',"old_enabled":', d.enabled,
               ',"new_enabled":', i.enabled, '}'),
        'trigger'
    FROM inserted i
    JOIN deleted  d ON i.id = d.id;
END;
GO

-- ============================================================
--  SECTION 4 — ROLLUP AND CUBE
--  GROUP BY ROLLUP generates subtotals.
--  GROUP BY CUBE generates all possible grouping combinations.
-- ============================================================

-- ── ROLLUP: Events by type AND date ─────────────────────────
-- Each row is a (type, date) pair; subtotal rows have NULL type
-- (= "all types for that date"); the grand total has both NULL.
SELECT
    ISNULL(type, 'ALL TYPES')                          AS event_type,
    ISNULL(FORMAT(created_at,'yyyy-MM-dd'), 'ALL DATES') AS event_date,
    COUNT(*)                                            AS total_events
FROM events
GROUP BY ROLLUP (type, FORMAT(created_at,'yyyy-MM-dd'))
ORDER BY event_date, event_type;

-- ── CUBE: Decision outcomes by rule event_type ───────────────
-- CUBE gives every combination: (event_type, outcome),
-- (event_type, ALL), (ALL, outcome), and (ALL, ALL).
SELECT
    ISNULL(e.type, 'ALL TYPES')      AS event_type,
    ISNULL(dl.outcome, 'ALL OUTCOMES') AS outcome,
    COUNT(*)                         AS total,
    AVG(CAST(dl.duration_ms AS FLOAT)) AS avg_ms
FROM decision_logs dl
JOIN events e ON dl.event_id = e.id
GROUP BY CUBE (e.type, dl.outcome)
ORDER BY event_type, outcome;

-- ============================================================
--  SECTION 5 — SET OPERATIONS (UNION / INTERSECT / EXCEPT)
--  Combine result sets from multiple SELECT statements.
-- ============================================================

-- ── UNION: All activity (events + decision log entries) ──────
-- Shows a unified timeline of both tables in one result set.
SELECT
    'Event'              AS source_table,
    id,
    title                AS description,
    created_at
FROM events

UNION ALL

SELECT
    'DecisionLog'        AS source_table,
    id,
    CONCAT('Decision: ', outcome) AS description,
    created_at
FROM decision_logs

ORDER BY created_at DESC;

-- ── INTERSECT: event_ids that ALSO appear in decision_logs ───
-- Finds events that were actually processed (have a log entry).
SELECT id FROM events
INTERSECT
SELECT event_id FROM decision_logs;

-- ── EXCEPT: event_ids NOT yet in decision_logs ───────────────
-- Finds events with NO decision log — never processed.
SELECT id FROM events
EXCEPT
SELECT event_id FROM decision_logs;

-- ============================================================
--  SECTION 6 — SUBQUERIES
--  A subquery is a SELECT nested inside another SQL statement.
-- ============================================================

-- ── Correlated Subquery: Rules that have NEVER triggered ─────
-- For each rule, the inner SELECT counts its logs;
-- the outer WHERE filters those with count = 0.
SELECT
    r.id,
    r.name,
    r.event_type,
    r.priority,
    r.enabled
FROM rules r
WHERE (
    SELECT COUNT(*)
    FROM decision_logs dl
    WHERE dl.rule_id = r.id          -- ← correlated to outer r
) = 0
ORDER BY r.priority ASC;

-- ── Scalar Subquery: Each event with its decision count ──────
SELECT
    e.id,
    e.title,
    e.type,
    e.status,
    (SELECT COUNT(*) FROM decision_logs dl WHERE dl.event_id = e.id) AS decision_count,
    (SELECT TOP 1 dl.outcome
     FROM decision_logs dl
     WHERE dl.event_id = e.id
     ORDER BY dl.created_at DESC)    AS latest_outcome
FROM events e
ORDER BY e.created_at DESC;

-- ── Subquery in FROM: Rules above average exec_count ─────────
SELECT r.name, r.exec_count, avg_exec.avg_count
FROM rules r
CROSS JOIN (
    SELECT AVG(CAST(exec_count AS FLOAT)) AS avg_count FROM rules
) avg_exec
WHERE r.exec_count > avg_exec.avg_count
ORDER BY r.exec_count DESC;

-- ============================================================
--  SECTION 7 — SQL FUNCTIONS SHOWCASE
--  Demonstrating built-in SQL Server functions used throughout
--  the Sentinel database.
-- ============================================================
SELECT
    -- Date/Time Functions
    GETDATE()                                       AS current_datetime,
    DATEADD(DAY, -7, GETDATE())                     AS seven_days_ago,
    DATEDIFF(DAY, MIN(created_at), GETDATE())       AS days_since_first_event,
    FORMAT(MAX(created_at), 'dd-MMM-yyyy HH:mm')    AS last_event_formatted,

    -- Aggregate Functions
    COUNT(*)                                        AS total_events,
    COUNT(DISTINCT type)                            AS unique_types,
    MIN(created_at)                                 AS oldest_event,
    MAX(created_at)                                 AS newest_event,

    -- String Functions
    UPPER(MIN(source))                              AS source_upper,
    LEN(MIN(title))                                 AS min_title_length
FROM events;

-- ============================================================
--  SECTION 8 — VERIFY EVERYTHING CREATED CORRECTLY
-- ============================================================
SELECT name, type_desc FROM sys.objects
WHERE name IN (
    'vw_ActiveAlerts', 'vw_PipelineSummary', 'vw_TopRules',
    'sp_GetDashboardStats', 'sp_ProcessEvent', 'sp_CleanOldLogs',
    'trg_AfterEventInsert', 'trg_AfterRuleUpdate'
)
ORDER BY type_desc, name;
GO

-- Test the views
SELECT TOP 5 * FROM vw_ActiveAlerts;
SELECT TOP 5 * FROM vw_PipelineSummary;
SELECT TOP 5 * FROM vw_TopRules;

-- Test the stored procedures
EXEC sp_GetDashboardStats;
EXEC sp_CleanOldLogs @days_to_keep = 90;
GO
