/**
 * src/models/DecisionLogModel.js  — Model Layer (SQL Server Edition)
 * Immutable audit trail — records are never updated or deleted.
 */

const { query, queryOne, execute } = require('../../database/connection');

class DecisionLogModel {

  async findById(id) {
    const row = await queryOne(
      `SELECT dl.*,
              e.type  AS event_type,  e.title  AS event_title,
              r.name  AS rule_name,   r.priority AS rule_priority,
              a.name  AS action_name, a.type   AS action_type,
              u.username AS triggered_by_username
       FROM decision_logs dl
       JOIN  events  e ON dl.event_id   = e.id
       LEFT JOIN rules   r ON dl.rule_id    = r.id
       LEFT JOIN actions a ON dl.action_id  = a.id
       LEFT JOIN users   u ON dl.triggered_by = u.id
       WHERE dl.id = @id`,
      { id }
    );
    if (row) row.chain_trace = JSON.parse(row.chain_trace || '[]');
    return row;
  }

  async findAll({ event_id, rule_id, outcome, from, to, limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT dl.*,
             e.type  AS event_type, e.title  AS event_title,
             r.name  AS rule_name,
             a.name  AS action_name, a.type  AS action_type,
             u.username AS triggered_by_username
      FROM decision_logs dl
      JOIN  events  e ON dl.event_id   = e.id
      LEFT JOIN rules   r ON dl.rule_id    = r.id
      LEFT JOIN actions a ON dl.action_id  = a.id
      LEFT JOIN users   u ON dl.triggered_by = u.id
      WHERE 1=1
    `;
    const params = { limit, offset };

    if (event_id) { sql += ` AND dl.event_id = @event_id`; params.event_id = event_id; }
    if (rule_id)  { sql += ` AND dl.rule_id = @rule_id`;   params.rule_id  = rule_id; }
    if (outcome)  { sql += ` AND dl.outcome = @outcome`;   params.outcome  = outcome; }
    if (from)     { sql += ` AND dl.created_at >= @from`;  params.from     = from; }
    if (to)       { sql += ` AND dl.created_at <= @to`;    params.to       = to; }

    sql += `
      ORDER BY dl.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    const rows = await query(sql, params);
    return rows.map(r => ({ ...r, chain_trace: JSON.parse(r.chain_trace || '[]') }));
  }

  async countAll({ outcome } = {}) {
    let sql    = `SELECT COUNT(*) AS total FROM decision_logs WHERE 1=1`;
    const params = {};
    if (outcome) { sql += ` AND outcome = @outcome`; params.outcome = outcome; }
    const row = await queryOne(sql, params);
    return row.total;
  }

  async getStats() {
    const byOutcome = await query(
      `SELECT outcome, COUNT(*) AS count FROM decision_logs GROUP BY outcome`
    );
    const topRules = await query(
      `SELECT TOP 5 r.name, COUNT(*) AS executions
       FROM decision_logs dl
       JOIN rules r ON dl.rule_id = r.id
       GROUP BY r.name
       ORDER BY executions DESC`
    );
    const avgRow = await queryOne(
      `SELECT AVG(CAST(duration_ms AS FLOAT)) AS avg_ms
       FROM decision_logs WHERE duration_ms IS NOT NULL`
    );
    const totalRow = await queryOne(
      `SELECT COUNT(*) AS total FROM decision_logs`
    );
    return {
      total:       totalRow.total,
      byOutcome,
      topRules,
      avgDuration: Math.round(avgRow.avg_ms || 0),
    };
  }

  async create({ event_id, rule_id, action_id, triggered_by, outcome, chain_trace = [], duration_ms }) {
    const result = await execute(
      `INSERT INTO decision_logs
         (event_id, rule_id, action_id, triggered_by, outcome, chain_trace, duration_ms)
       VALUES (@event_id, @rule_id, @action_id, @triggered_by, @outcome, @chain_trace, @duration_ms);
       SELECT SCOPE_IDENTITY() AS id;`,
      { event_id, rule_id, action_id, triggered_by,
        outcome, chain_trace: JSON.stringify(chain_trace), duration_ms }
    );
    return this.findById(result.recordset[0].id);
  }
}

module.exports = new DecisionLogModel();
