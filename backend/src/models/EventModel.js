/**
 * src/models/EventModel.js  — Model Layer (SQL Server Edition)
 */

const { query, queryOne, execute } = require('../../database/connection');

class EventModel {

  async findById(id) {
    const event = await queryOne(
      `SELECT e.*, u.username AS created_by_username
       FROM events e
       LEFT JOIN users u ON e.user_id = u.id
       WHERE e.id = @id`,
      { id }
    );
    if (event && event.payload) {
      event.payload = JSON.parse(event.payload);
    }
    return event;
  }

  async findAll({ type, status, source, from, to, limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT e.*, u.username AS created_by_username
      FROM events e
      LEFT JOIN users u ON e.user_id = u.id
      WHERE 1=1
    `;
    const params = { limit, offset };

    if (type)   { sql += ` AND e.type = @type`;         params.type   = type; }
    if (status) { sql += ` AND e.status = @status`;     params.status = status; }
    if (source) { sql += ` AND e.source = @source`;     params.source = source; }
    if (from)   { sql += ` AND e.created_at >= @from`;  params.from   = from; }
    if (to)     { sql += ` AND e.created_at <= @to`;    params.to     = to; }

    sql += `
      ORDER BY e.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    const rows = await query(sql, params);
    return rows.map(r => ({ ...r, payload: JSON.parse(r.payload || '{}') }));
  }

  async countAll({ type, status } = {}) {
    let sql    = `SELECT COUNT(*) AS total FROM events WHERE 1=1`;
    const params = {};
    if (type)   { sql += ` AND type = @type`;     params.type   = type; }
    if (status) { sql += ` AND status = @status`; params.status = status; }
    const row = await queryOne(sql, params);
    return row.total;
  }

  async getStats() {
    const byType = await query(
      `SELECT type, COUNT(*) AS count FROM events GROUP BY type`
    );
    const byStatus = await query(
      `SELECT status, COUNT(*) AS count FROM events GROUP BY status`
    );
    const byHour = await query(
      `SELECT FORMAT(created_at, 'HH:00') AS hour, COUNT(*) AS count
       FROM events
       WHERE created_at >= DATEADD(hour, -24, GETDATE())
       GROUP BY FORMAT(created_at, 'HH:00')
       ORDER BY hour ASC`
    );
    const totalRow = await queryOne(`SELECT COUNT(*) AS total FROM events`);
    return { total: totalRow.total, byType, byStatus, byHour };
  }

  async create({ user_id, type, title, payload = {}, source = 'manual' }) {
    const result = await execute(
      `INSERT INTO events (user_id, type, title, payload, source)
       VALUES (@user_id, @type, @title, @payload, @source);
       SELECT SCOPE_IDENTITY() AS id;`,
      { user_id, type, title, payload: JSON.stringify(payload), source }
    );
    const newId = result.recordset[0].id;
    return this.findById(newId);
  }

  async updateStatus(id, status) {
    await execute(
      `UPDATE events SET status = @status WHERE id = @id`,
      { status, id }
    );
    return this.findById(id);
  }

  async delete(id) {
    return execute(`DELETE FROM events WHERE id = @id`, { id });
  }
}

module.exports = new EventModel();
