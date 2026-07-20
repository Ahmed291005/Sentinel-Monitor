/**
 * src/models/SessionModel.js  — Model Layer (SQL Server Edition)
 */

const { queryOne, execute } = require('../../database/connection');
const crypto = require('crypto');

class SessionModel {

  _hash(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async create(userId, token, expiresAt) {
    const tokenHash = this._hash(token);
    await execute(
      `INSERT INTO sessions (user_id, token_hash, expires_at)
       VALUES (@userId, @tokenHash, @expiresAt)`,
      { userId, tokenHash, expiresAt }
    );
  }

  async isBlacklisted(token) {
    const tokenHash = this._hash(token);
    const row = await queryOne(
      `SELECT id FROM sessions WHERE token_hash = @tokenHash`,
      { tokenHash }
    );
    return !!row;
  }

  async invalidate(token) {
    const tokenHash = this._hash(token);
    await execute(
      `DELETE FROM sessions WHERE token_hash = @tokenHash`,
      { tokenHash }
    );
  }

  async purgeExpired() {
    const result = await execute(
      `DELETE FROM sessions WHERE expires_at < GETDATE()`
    );
    return result.rowsAffected[0];
  }

  async deleteForUser(userId) {
    const result = await execute(
      `DELETE FROM sessions WHERE user_id = @userId`,
      { userId }
    );
    return result.rowsAffected[0];
  }
}

module.exports = new SessionModel();
