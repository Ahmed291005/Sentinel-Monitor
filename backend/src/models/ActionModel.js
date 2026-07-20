/**
 * src/models/ActionModel.js  — Model Layer (SQL Server Edition)
 */

const { query, queryOne, execute } = require('../../database/connection');

class ActionModel {

  async findById(id) {
    const row = await queryOne(
      `SELECT * FROM actions WHERE id = @id`, { id }
    );
    if (row) row.config = JSON.parse(row.config || '{}');
    return row;
  }

  async findAll() {
    const rows = await query(`SELECT * FROM actions ORDER BY type, name`);
    return rows.map(r => ({ ...r, config: JSON.parse(r.config || '{}') }));
  }

  async findByType(type) {
    const rows = await query(
      `SELECT * FROM actions WHERE type = @type`, { type }
    );
    return rows.map(r => ({ ...r, config: JSON.parse(r.config || '{}') }));
  }

  async create({ name, type, config = {}, description }) {
    const result = await execute(
      `INSERT INTO actions (name, type, config, description)
       VALUES (@name, @type, @config, @description);
       SELECT SCOPE_IDENTITY() AS id;`,
      { name, type, config: JSON.stringify(config), description }
    );
    return this.findById(result.recordset[0].id);
  }

  async update(id, { name, type, config, description }) {
    await execute(
      `UPDATE actions
       SET name = @name, type = @type, config = @config, description = @description
       WHERE id = @id`,
      { name, type, config: JSON.stringify(config || {}), description, id }
    );
    return this.findById(id);
  }

  async delete(id) {
    return execute(`DELETE FROM actions WHERE id = @id`, { id });
  }
}

module.exports = new ActionModel();
