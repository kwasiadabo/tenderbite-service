const sql = require('mssql');

const dbConfig = {
  server:'SQL8011.site4now.net',
  // server: process.env.DB_SERVER || 'localhost',
  port:1433,
 // port: parseInt(process.env.DB_PORT) || 1433,
  //database: process.env.DB_DATABASE || 'ProductsDB',
  database:'db_ac6b0b_tenderbitedb',
  //user: process.env.DB_USER || 'sa',
  //password: process.env.DB_PASSWORD || '',
  passsword:'Kaw3se4dr5$$1',
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

   // ── productPrice table ──────────────────────────────────────────────────
  await db.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = 'productPrice'
    )
    BEGIN
      CREATE TABLE productPrice (
        id            UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWID(),
        productId     UNIQUEIDENTIFIER  NOT NULL,
        price         DECIMAL(10, 2)    NOT NULL,
        currency      NVARCHAR(3)       NOT NULL DEFAULT 'USD',
        effectiveFrom DATETIME2         NULL,     -- NULL = always active from creation
        effectiveTo   DATETIME2         NULL,     -- NULL = no expiry
        createdAt     DATETIME2         NOT NULL DEFAULT SYSDATETIME(),
        updatedAt     DATETIME2         NOT NULL DEFAULT SYSDATETIME(),
        CONSTRAINT PK_productPrice    PRIMARY KEY CLUSTERED (id),
        CONSTRAINT FK_productPrice_Product
          FOREIGN KEY (productId) REFERENCES Products(id)
          ON DELETE CASCADE
      );
 
      -- Index for fast per-product price lookups
      CREATE NONCLUSTERED INDEX IX_productPrice_ProductId
        ON productPrice (productId)
        INCLUDE (price, currency, effectiveFrom, effectiveTo);
 
      -- Index to speed up active-price queries
      CREATE NONCLUSTERED INDEX IX_productPrice_Active
        ON productPrice (productId, effectiveFrom, effectiveTo)
        INCLUDE (price, currency);
 
      PRINT 'productPrice table created.';
    END
    ELSE
      PRINT 'productPrice table already exists.';
  `);

  // ── Orders ────────────────────────────────────────────────────────────────
  await db.request().query(`
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Orders')
    BEGIN
      CREATE TABLE Orders (
        id                     UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        orderNumber            NVARCHAR(50)     NOT NULL,
        status                 NVARCHAR(20)     NOT NULL DEFAULT 'draft',
                               -- draft | pending | confirmed | processing | completed | cancelled
        customerName           NVARCHAR(255)    NOT NULL,
        customerPhone          NVARCHAR(50)     NOT NULL,
        customerEmail          NVARCHAR(255)    NOT NULL,
        customerLocation       NVARCHAR(500)    NOT NULL,
        additionalInstructions NVARCHAR(MAX)    NULL,
        subtotal               DECIMAL(12, 2)   NOT NULL,
        totalAmount            DECIMAL(12, 2)   NOT NULL,
        currency               NVARCHAR(3)      NOT NULL DEFAULT 'USD',
        submittedAt            DATETIME2        NULL,
        createdAt              DATETIME2        NOT NULL DEFAULT SYSDATETIME(),
        updatedAt              DATETIME2        NOT NULL DEFAULT SYSDATETIME(),
        CONSTRAINT PK_Orders           PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UQ_Orders_Number    UNIQUE (orderNumber),
        CONSTRAINT CK_Orders_Status    CHECK (status IN (
          'draft','pending','confirmed','processing','completed','cancelled'
        ))
      );
      CREATE NONCLUSTERED INDEX IX_Orders_Status    ON Orders (status)    INCLUDE (orderNumber, customerName, customerEmail, totalAmount, createdAt);
      CREATE NONCLUSTERED INDEX IX_Orders_Email     ON Orders (customerEmail) INCLUDE (orderNumber, status, createdAt);
      CREATE NONCLUSTERED INDEX IX_Orders_CreatedAt ON Orders (createdAt DESC);
      PRINT 'Orders table created.';
    END
    ELSE PRINT 'Orders table already exists.';
  `);
 
  // ── OrderItems ────────────────────────────────────────────────────────────
  await db.request().query(`
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'OrderItems')
    BEGIN
      CREATE TABLE OrderItems (
        id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        orderId     UNIQUEIDENTIFIER NOT NULL,
        productId   UNIQUEIDENTIFIER NULL,          -- nullable: custom / off-catalogue items
        category    NVARCHAR(100)    NOT NULL,
        productName NVARCHAR(255)    NOT NULL,
        description NVARCHAR(MAX)    NULL,
        weight      DECIMAL(10, 3)   NULL,
        weightUnit  NVARCHAR(10)     NULL,          -- kg | g | lb | oz | ton
        unitPrice   DECIMAL(12, 2)   NOT NULL,
        quantity    INT              NOT NULL,
        lineTotal   DECIMAL(12, 2)   NOT NULL,
        currency    NVARCHAR(3)      NOT NULL DEFAULT 'USD',
        CONSTRAINT PK_OrderItems PRIMARY KEY CLUSTERED (id),
        CONSTRAINT FK_OrderItems_Order
          FOREIGN KEY (orderId) REFERENCES Orders(id) ON DELETE CASCADE,
        CONSTRAINT CK_OrderItems_Qty   CHECK (quantity > 0),
        CONSTRAINT CK_OrderItems_Price CHECK (unitPrice >= 0)
      );
      CREATE NONCLUSTERED INDEX IX_OrderItems_OrderId
        ON OrderItems (orderId)
        INCLUDE (category, productName, unitPrice, quantity, lineTotal, currency);
      PRINT 'OrderItems table created.';
    END
    ELSE PRINT 'OrderItems table already exists.';
  `);

 
 
  console.log('[DB] Database initialised');
};




module.exports = { getPool, initDatabase, sql };