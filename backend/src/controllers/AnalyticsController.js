/**
 * src/controllers/AnalyticsController.js
 *
 * Serves the Analytics page data. Uses:
 *   - Stored Procedure: sp_GetDashboardStats
 *   - Views: vw_ActiveAlerts, vw_PipelineSummary, vw_TopRules
 *   - ROLLUP query for event trend data
 *   - CUBE query for cross-dimensional outcome analysis
 *   - Set Operations: UNION of events + logs activity
 *   - Subquery: rules never triggered
 */

const { query, queryOne, getPool } = require('../../database/connection');

class AnalyticsController {

  // ── GET /api/analytics/dashboard ──────────────────────────
  // Calls sp_GetDashboardStats — demonstrates stored procedure
  async getDashboardStats(req, res) {
    try {
      const pool   = await getPool();
      const result = await pool.request().execute('sp_GetDashboardStats');
      const [byStatus, byOutcome, topRules, totals] = result.recordsets;
      res.json({ byStatus, byOutcome, topRules, totals: totals[0] });
    } catch (err) {
      console.error('[Analytics] sp_GetDashboardStats error:', err.message);
      // Fallback to raw queries if SP not yet created in SSMS
      try {
        const byStatus  = await query(`SELECT status, COUNT(*) AS count FROM events GROUP BY status`);
        const byOutcome = await query(`SELECT outcome, COUNT(*) AS count, AVG(CAST(duration_ms AS FLOAT)) AS avg_duration_ms FROM decision_logs GROUP BY outcome`);
        const topRules  = await query(`SELECT TOP 5 r.name AS rule_name, r.priority, COUNT(dl.id) AS executions FROM rules r JOIN decision_logs dl ON r.id = dl.rule_id GROUP BY r.name, r.priority ORDER BY executions DESC`);
        const totals    = await queryOne(`SELECT (SELECT COUNT(*) FROM events) AS total_events,(SELECT COUNT(*) FROM rules) AS total_rules,(SELECT COUNT(*) FROM decision_logs) AS total_logs,(SELECT COUNT(*) FROM users) AS total_users, GETDATE() AS generated_at`);
        res.json({ byStatus, byOutcome, topRules, totals });
      } catch (fallbackErr) {
        res.status(500).json({ error: fallbackErr.message });
      }
    }
  }

  // ── GET /api/analytics/rollup ──────────────────────────────
  // ROLLUP: events grouped by type AND date — with subtotals
  async getRollupData(req, res) {
    try {
      const rows = await query(`
        SELECT
          ISNULL(type, 'ALL')                              AS event_type,
          ISNULL(FORMAT(created_at,'yyyy-MM-dd'), 'ALL')   AS event_date,
          COUNT(*)                                         AS total_events
        FROM events
        WHERE created_at >= DATEADD(DAY, -30, GETDATE())
        GROUP BY ROLLUP (type, FORMAT(created_at,'yyyy-MM-dd'))
        ORDER BY event_date DESC, event_type
      `);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // ── GET /api/analytics/cube ────────────────────────────────
  // CUBE: outcome × event_type cross-dimensional analysis
  async getCubeData(req, res) {
    try {
      const rows = await query(`
        SELECT
          ISNULL(e.type, 'ALL')       AS event_type,
          ISNULL(dl.outcome, 'ALL')   AS outcome,
          COUNT(*)                    AS total,
          ISNULL(AVG(CAST(dl.duration_ms AS FLOAT)), 0) AS avg_ms
        FROM decision_logs dl
        JOIN events e ON dl.event_id = e.id
        GROUP BY CUBE (e.type, dl.outcome)
        ORDER BY event_type, outcome
      `);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // ── GET /api/analytics/active-alerts ──────────────────────
  // Uses VIEW: vw_ActiveAlerts
  async getActiveAlerts(req, res) {
    try {
      const rows = await query(`SELECT TOP 20 * FROM vw_ActiveAlerts ORDER BY created_at DESC`);
      res.json(rows);
    } catch (err) {
      // Fallback if view doesn't exist yet
      const rows = await query(`
        SELECT e.id AS event_id, e.type AS event_type, e.title, e.status,
               e.source, e.created_at, u.username AS created_by,
               DATEDIFF(MINUTE, e.created_at, GETDATE()) AS age_minutes
        FROM events e
        LEFT JOIN users u ON e.user_id = u.id
        WHERE e.status IN ('pending','processing')
        ORDER BY e.created_at DESC
      `);
      res.json(rows);
    }
  }

  // ── GET /api/analytics/pipeline ───────────────────────────
  // Uses VIEW: vw_PipelineSummary
  async getPipelineSummary(req, res) {
    try {
      const rows = await query(`SELECT TOP 50 * FROM vw_PipelineSummary ORDER BY decision_time DESC`);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // ── GET /api/analytics/top-rules ──────────────────────────
  // Uses VIEW: vw_TopRules
  async getTopRules(req, res) {
    try {
      const rows = await query(`SELECT * FROM vw_TopRules`);
      res.json(rows);
    } catch (err) {
      // Fallback
      const rows = await query(`
        SELECT TOP 10 r.id, r.name AS rule_name, r.event_type, r.priority, r.enabled,
               COUNT(dl.id) AS total_executions,
               SUM(CASE WHEN dl.outcome='executed' THEN 1 ELSE 0 END) AS successful,
               ISNULL(AVG(CAST(dl.duration_ms AS FLOAT)),0) AS avg_duration_ms
        FROM rules r
        LEFT JOIN decision_logs dl ON r.id = dl.rule_id
        GROUP BY r.id, r.name, r.event_type, r.priority, r.enabled
        ORDER BY total_executions DESC
      `);
      res.json(rows);
    }
  }

  // ── GET /api/analytics/untriggered-rules ──────────────────
  // Correlated Subquery: rules that have never fired
  async getUntriggeredRules(req, res) {
    try {
      const rows = await query(`
        SELECT r.id, r.name, r.event_type, r.priority, r.enabled, r.created_at
        FROM rules r
        WHERE (
          SELECT COUNT(*) FROM decision_logs dl WHERE dl.rule_id = r.id
        ) = 0
        ORDER BY r.priority ASC
      `);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // ── GET /api/analytics/union-timeline ─────────────────────
  // Set Operation (UNION ALL): combined events + logs timeline
  async getUnionTimeline(req, res) {
    try {
      const rows = await query(`
        SELECT TOP 30
            'Event' AS source_table, id,
            title AS description, created_at
        FROM events
        UNION ALL
        SELECT TOP 30
            'DecisionLog' AS source_table, id,
            CONCAT('Decision: ', outcome) AS description, created_at
        FROM decision_logs
        ORDER BY created_at DESC
      `);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // ── GET /api/analytics/summary ────────────────────────────
  // Aggregate summary used by the Analytics hero cards
  async getSummary(req, res) {
    try {
      const stats = await queryOne(`
        SELECT
          (SELECT COUNT(*) FROM events)                        AS total_events,
          (SELECT COUNT(*) FROM events WHERE status='pending') AS pending_events,
          (SELECT COUNT(*) FROM rules WHERE enabled=1)         AS active_rules,
          (SELECT COUNT(*) FROM decision_logs)                 AS total_decisions,
          (SELECT COUNT(*) FROM decision_logs WHERE outcome='executed') AS executed,
          (SELECT COUNT(*) FROM decision_logs WHERE outcome='failed')   AS failed,
          (SELECT ISNULL(AVG(CAST(duration_ms AS FLOAT)),0) FROM decision_logs WHERE duration_ms IS NOT NULL) AS avg_response_ms,
          (SELECT COUNT(*) FROM rules WHERE (SELECT COUNT(*) FROM decision_logs d WHERE d.rule_id=rules.id)=0) AS untriggered_rules,
          GETDATE() AS generated_at
      `);
      res.json(stats);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new AnalyticsController();
