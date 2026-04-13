const sql = require('mssql');

const dbConfig = {
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_DATABASE || 'ProductsDB',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 30000,
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

let pool = null;

/**
 * Get or create a singleton connection pool.
 * Re-uses the same pool across the app lifecycle for performance.
 */
const getPool = async () => {
  if (pool && pool.connected) return pool;

  if (pool && pool.connecting) {
    // Wait briefly if pool is mid-connect
    await new Promise((resolve) => setTimeout(resolve, 200));
    return pool;
  }

  pool = await sql.connect(dbConfig);

  pool.on('error', (err) => {
    console.error('[DB] Pool error:', err);
    pool = null; // Reset so next request reconnects
  });

  console.log('[DB] Connection pool established');
  return pool;
};

/**
 * Initialise database – creates the Products table and a
 * covering index on id for faster image-path lookups if they
 * don't already exist.
 */
const initDatabase = async () => {
  const db = await getPool();
  const request = db.request();

  await request.query(`
    IF NOT EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = 'Products'
    )
    BEGIN
      CREATE TABLE Products (
        id            UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWID(),
        productName   NVARCHAR(255)     NOT NULL,
        description   NVARCHAR(MAX)     NULL,
        weight        NVARCHAR(50)      NOT NULL,
        category      NVARCHAR(50)      NOT NULL,
        productImage  NVARCHAR(500)     NOT NULL,   -- stored path / URL
        imageFileName NVARCHAR(255)     NOT NULL,   -- original filename
        imageMimeType NVARCHAR(100)     NOT NULL,   -- e.g. image/webp
        imageSize     INT               NOT NULL,   -- bytes (after optimisation)
        createdAt     DATETIME2         NOT NULL DEFAULT SYSDATETIME(),
        updatedAt     DATETIME2         NOT NULL DEFAULT SYSDATETIME(),
        CONSTRAINT PK_Products PRIMARY KEY CLUSTERED (id)
      );

      -- Non-clustered index covering only the columns needed for
      -- image retrieval, so the engine avoids a full row read.
      CREATE NONCLUSTERED INDEX IX_Products_Image
        ON Products (id)
        INCLUDE (productImage, imageFileName, imageMimeType, imageSize);

      PRINT 'Products table created.';
    END
    ELSE
    BEGIN
      PRINT 'Products table already exists.';
    END
  `);

  console.log('[DB] Database initialised');
};

module.exports = { getPool, initDatabase, sql };