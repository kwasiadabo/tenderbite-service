'use strict';

const { sql, getPool } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Initialise the Users table and related objects.
 * Safe to call on every startup (idempotent).
 */
async function initUserTable() {
  const pool = await getPool();

  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sysobjects WHERE name = 'Users' AND xtype = 'U')
    BEGIN
      CREATE TABLE Users (
        id            UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
        email         NVARCHAR(255)     NOT NULL,
        password_hash NVARCHAR(255)     NOT NULL,
        first_name    NVARCHAR(100)     NOT NULL,
        last_name     NVARCHAR(100)     NOT NULL,
        role          NVARCHAR(50)      NOT NULL DEFAULT 'user',
        is_active     BIT               NOT NULL DEFAULT 1,
        is_verified   BIT               NOT NULL DEFAULT 0,
        last_login_at DATETIME2         NULL,
        created_at    DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at    DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME()
      );

      CREATE UNIQUE INDEX UQ_Users_Email ON Users(email);
    END
  `);

  // Refresh tokens table
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sysobjects WHERE name = 'RefreshTokens' AND xtype = 'U')
    BEGIN
      CREATE TABLE RefreshTokens (
        id          UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
        user_id     UNIQUEIDENTIFIER  NOT NULL,
        token_hash  NVARCHAR(255)     NOT NULL,
        expires_at  DATETIME2         NOT NULL,
        revoked     BIT               NOT NULL DEFAULT 0,
        created_at  DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_RefreshTokens_Users
          FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
      );

      CREATE INDEX IX_RefreshTokens_UserId ON RefreshTokens(user_id);
    END
  `);

  logger.info('User tables initialised');
}

// ─── Query helpers ──────────────────────────────────────────────────────────

async function findByEmail(email) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('email', sql.NVarChar(255), email.toLowerCase())
    .query('SELECT * FROM Users WHERE email = @email AND is_active = 1');
  return result.recordset[0] || null;
}

async function findById(id) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query('SELECT * FROM Users WHERE id = @id AND is_active = 1');
  return result.recordset[0] || null;
}

async function createUser({ email, passwordHash, firstName, lastName, role = 'user' }) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('email',         sql.NVarChar(255), email.toLowerCase())
    .input('password_hash', sql.NVarChar(255), passwordHash)
    .input('first_name',    sql.NVarChar(100), firstName)
    .input('last_name',     sql.NVarChar(100), lastName)
    .input('role',          sql.NVarChar(50),  role)
    .query(`
      INSERT INTO Users (email, password_hash, first_name, last_name, role)
      OUTPUT inserted.*
      VALUES (@email, @password_hash, @first_name, @last_name, @role)
    `);
  return result.recordset[0];
}

async function updateLastLogin(id) {
  const pool = await getPool();
  await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query('UPDATE Users SET last_login_at = SYSUTCDATETIME(), updated_at = SYSUTCDATETIME() WHERE id = @id');
}

async function saveRefreshToken({ userId, tokenHash, expiresAt }) {
  const pool = await getPool();
  await pool
    .request()
    .input('user_id',    sql.UniqueIdentifier, userId)
    .input('token_hash', sql.NVarChar(255),    tokenHash)
    .input('expires_at', sql.DateTime2,        expiresAt)
    .query('INSERT INTO RefreshTokens (user_id, token_hash, expires_at) VALUES (@user_id, @token_hash, @expires_at)');
}

async function findRefreshToken(tokenHash) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('token_hash', sql.NVarChar(255), tokenHash)
    .query(`
      SELECT rt.*, u.id AS userId, u.role, u.is_active
      FROM RefreshTokens rt
      JOIN Users u ON u.id = rt.user_id
      WHERE rt.token_hash = @token_hash
        AND rt.revoked = 0
        AND rt.expires_at > SYSUTCDATETIME()
    `);
  return result.recordset[0] || null;
}

async function revokeRefreshToken(tokenHash) {
  const pool = await getPool();
  await pool
    .request()
    .input('token_hash', sql.NVarChar(255), tokenHash)
    .query('UPDATE RefreshTokens SET revoked = 1 WHERE token_hash = @token_hash');
}

async function revokeAllUserRefreshTokens(userId) {
  const pool = await getPool();
  await pool
    .request()
    .input('user_id', sql.UniqueIdentifier, userId)
    .query('UPDATE RefreshTokens SET revoked = 1 WHERE user_id = @user_id');
}

module.exports = {
  initUserTable,
  findByEmail,
  findById,
  createUser,
  updateLastLogin,
  saveRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
};
