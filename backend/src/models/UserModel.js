/**
 * src/models/UserModel.js  — Model Layer (SQL Server Edition)
 * Pure data access. Zero business logic.
 */

const { query, queryOne, execute } = require('../../database/connection');

class UserModel {

  async findById(id) {
    return queryOne(
      `SELECT id, username, email, role, created_at, last_login
       FROM users WHERE id = @id`,
      { id }
    );
  }

  async findByEmail(email) {
    return queryOne(
      `SELECT * FROM users WHERE email = @email`,
      { email }
    );
  }

  async findByUsername(username) {
    return queryOne(
      `SELECT * FROM users WHERE username = @username`,
      { username }
    );
  }

  async findAll({ limit = 50, offset = 0 } = {}) {
    return query(
      `SELECT id, username, email, role, created_at, last_login
       FROM users
       ORDER BY created_at DESC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { limit, offset }
    );
  }

  async count() {
    const row = await queryOne(`SELECT COUNT(*) AS total FROM users`);
    return row.total;
  }

  async create({ username, email, password_hash, role = 'user' }) {
    const result = await execute(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES (@username, @email, @password_hash, @role);
       SELECT SCOPE_IDENTITY() AS id;`,
      { username, email, password_hash, role }
    );
    const newId = result.recordset[0].id;
    return this.findById(newId);
  }

  async updateRole(id, role) {
    await execute(
      `UPDATE users SET role = @role WHERE id = @id`,
      { role, id }
    );
    return this.findById(id);
  }

  async updateLastLogin(id) {
    await execute(
      `UPDATE users SET last_login = GETDATE() WHERE id = @id`,
      { id }
    );
  }

  async delete(id) {
    return execute(`DELETE FROM users WHERE id = @id`, { id });
  }
}

module.exports = new UserModel();
