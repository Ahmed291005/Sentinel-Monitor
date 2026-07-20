/**
 * src/models/RuleModel.js  — Model Layer (SQL Server Edition)
 */

const { query, queryOne, execute } = require('../../database/connection');

class RuleModel {

  async findById(id) {
    return queryOne(
      `SELECT r.*, a.name AS action_name, a.type AS action_type,
              a.config AS action_config, u.username AS created_by_username
       FROM rules r
       JOIN actions a ON r.action_id = a.id
       JOIN users   u ON r.created_by = u.id
       WHERE r.id = @id`,
      { id }
    );
  }

  async findAll({ event_type, enabled, limit = 100, offset = 0 } = {}) {
    let sql = `
      SELECT r.*, a.name AS action_name, a.type AS action_type,
             u.username AS created_by_username
      FROM rules r
      JOIN actions a ON r.action_id = a.id
      JOIN users   u ON r.created_by = u.id
      WHERE 1=1
    `;
    const params = { limit, offset };

    if (event_type !== undefined) { sql += ` AND r.event_type = @event_type`; params.event_type = event_type; }
    if (enabled    !== undefined) { sql += ` AND r.enabled = @enabled`;       params.enabled    = enabled ? 1 : 0; }

    sql += `
      ORDER BY r.priority ASC, r.created_at ASC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    return query(sql, params);
  }

  // Called by the Rule Engine — only enabled rules matching the event type
  async findMatchingRules(eventType) {
    return query(
      `SELECT r.*, a.type AS action_type, a.config AS action_config, a.name AS action_name
       FROM rules r
       JOIN actions a ON r.action_id = a.id
       WHERE r.enabled = 1
         AND (r.event_type = @eventType OR r.event_type = 'any')
       ORDER BY r.priority ASC`,
      { eventType }
    );
  }

  async count() {
    return queryOne(
      `SELECT COUNT(*) AS total, SUM(CAST(enabled AS INT)) AS active FROM rules`
    );
  }

  async create({ created_by, name, description, event_type, condition_field,
                 condition_op, condition_value, action_id, priority = 5 }) {
    const result = await execute(
      `INSERT INTO rules
         (created_by, name, description, event_type, condition_field,
          condition_op, condition_value, action_id, priority)
       VALUES (@created_by, @name, @description, @event_type, @condition_field,
               @condition_op, @condition_value, @action_id, @priority);
       SELECT SCOPE_IDENTITY() AS id;`,
      { created_by, name, description, event_type, condition_field,
        condition_op, condition_value, action_id, priority }
    );
    return this.findById(result.recordset[0].id);
  }

  async update(id, fields) {
    const allowed = ['name','description','event_type','condition_field',
                     'condition_op','condition_value','action_id','priority'];
    const keys    = Object.keys(fields).filter(k => allowed.includes(k));
    if (keys.length === 0) return this.findById(id);

    const sets   = keys.map(k => `${k} = @${k}`).join(', ');
    const params = { id };
    keys.forEach(k => { params[k] = fields[k]; });

    await execute(`UPDATE rules SET ${sets} WHERE id = @id`, params);
    return this.findById(id);
  }

  async toggle(id, enabled) {
    await execute(
      `UPDATE rules SET enabled = @enabled WHERE id = @id`,
      { enabled: enabled ? 1 : 0, id }
    );
    return this.findById(id);
  }

  async incrementExecCount(id) {
    await execute(
      `UPDATE rules SET exec_count = exec_count + 1 WHERE id = @id`,
      { id }
    );
  }

  async delete(id) {
    return execute(`DELETE FROM rules WHERE id = @id`, { id });
  }
}

module.exports = new RuleModel();
