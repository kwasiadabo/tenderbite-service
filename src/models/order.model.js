const { getPool, sql } = require('../config/database');
const { v4: uuidv4 }   = require('uuid');

// ── Create a draft order (preview state) ─────────────────────────────────

async function createOrder({
  orderNumber,
  status,
  // Customer
  customerName, customerPhone, customerEmail, customerLocation, additionalInstructions,
  // Totals
  subtotal, totalAmount, currency,
}) {
  const pool  = await getPool();
  const id    = uuidv4();
  const result = await pool
    .request()
    .input('id',                     sql.UniqueIdentifier,  id)
    .input('orderNumber',            sql.NVarChar(50),      orderNumber)
    .input('status',                 sql.NVarChar(20),      status)
    .input('customerName',           sql.NVarChar(255),     customerName)
    .input('customerPhone',          sql.NVarChar(50),      customerPhone)
    .input('customerEmail',          sql.NVarChar(255),     customerEmail)
    .input('customerLocation',       sql.NVarChar(500),     customerLocation)
    .input('additionalInstructions', sql.NVarChar(sql.MAX), additionalInstructions || null)
    .input('subtotal',               sql.Decimal(12, 2),    subtotal)
    .input('totalAmount',            sql.Decimal(12, 2),    totalAmount)
    .input('currency',               sql.NVarChar(3),       currency)
    .query(`
      INSERT INTO Orders (
        id, orderNumber, status,
        customerName, customerPhone, customerEmail, customerLocation, additionalInstructions,
        subtotal, totalAmount, currency
      )
      OUTPUT
        INSERTED.id, INSERTED.orderNumber, INSERTED.status,
        INSERTED.customerName, INSERTED.customerPhone, INSERTED.customerEmail,
        INSERTED.customerLocation, INSERTED.additionalInstructions,
        INSERTED.subtotal, INSERTED.totalAmount, INSERTED.currency,
        INSERTED.createdAt, INSERTED.updatedAt
      VALUES (
        @id, @orderNumber, @status,
        @customerName, @customerPhone, @customerEmail,
        @customerLocation, @additionalInstructions,
        @subtotal, @totalAmount, @currency
      )
    `);

  return result.recordset[0];
}

// ── Bulk-insert order items ───────────────────────────────────────────────

async function createOrderItems(items) {
  const pool = await getPool();

  const inserted = [];
  for (const item of items) {
    const result = await pool
      .request()
      .input('id',          sql.UniqueIdentifier,  uuidv4())
      .input('orderId',     sql.UniqueIdentifier,  item.orderId)
      .input('productId',   sql.UniqueIdentifier,  item.productId || null)
      .input('category',    sql.NVarChar(100),     item.category)
      .input('productName', sql.NVarChar(255),     item.productName)
      .input('description', sql.NVarChar(sql.MAX), item.description || null)
      .input('weight',      sql.Decimal(10, 3),    item.weight || null)
      .input('weightUnit',  sql.NVarChar(10),      item.weightUnit || null)
      .input('unitPrice',   sql.Decimal(12, 2),    item.unitPrice)
      .input('quantity',    sql.Int,               item.quantity)
      .input('lineTotal',   sql.Decimal(12, 2),    item.lineTotal)
      .input('currency',    sql.NVarChar(3),       item.currency)
      .query(`
        INSERT INTO OrderItems (
          id, orderId, productId, category, productName,
          description, weight, weightUnit, unitPrice, quantity, lineTotal, currency
        )
        OUTPUT
          INSERTED.id, INSERTED.orderId, INSERTED.productId, INSERTED.category,
          INSERTED.productName, INSERTED.description, INSERTED.weight, INSERTED.weightUnit,
          INSERTED.unitPrice, INSERTED.quantity, INSERTED.lineTotal, INSERTED.currency
        VALUES (
          @id, @orderId, @productId, @category, @productName,
          @description, @weight, @weightUnit, @unitPrice, @quantity, @lineTotal, @currency
        )
      `);

    inserted.push(result.recordset[0]);
  }

  return inserted;
}

// ── Find order by ID (with items) ─────────────────────────────────────────

async function findById(id) {
  const pool = await getPool();

  const orderResult = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query(`
      SELECT
        id, orderNumber, status,
        customerName, customerPhone, customerEmail,
        customerLocation, additionalInstructions,
        subtotal, totalAmount, currency,
        submittedAt, createdAt, updatedAt
      FROM Orders
      WHERE id = @id
    `);

  if (!orderResult.recordset[0]) return null;

  const itemsResult = await pool
    .request()
    .input('orderId', sql.UniqueIdentifier, id)
    .query(`
      SELECT
        id, orderId, productId, category, productName,
        description, weight, weightUnit,
        unitPrice, quantity, lineTotal, currency
      FROM OrderItems
      WHERE orderId = @orderId
      ORDER BY category, productName
    `);

  return {
    ...orderResult.recordset[0],
    items: itemsResult.recordset,
  };
}

// ── Find order by orderNumber ─────────────────────────────────────────────

async function findByOrderNumber(orderNumber) {
  const pool   = await getPool();
  const result = await pool
    .request()
    .input('orderNumber', sql.NVarChar(50), orderNumber)
    .query(`
      SELECT id FROM Orders WHERE orderNumber = @orderNumber
    `);

  if (!result.recordset[0]) return null;
  return findById(result.recordset[0].id);
}

// ── List all orders (paginated) ───────────────────────────────────────────

async function findAll({ page = 1, limit = 10, status, search } = {}) {
  const pool   = await getPool();
  const offset = (page - 1) * limit;

  const whereClauses = [];
  const request      = pool
    .request()
    .input('limit',  sql.Int, limit)
    .input('offset', sql.Int, offset);

  if (status) {
    whereClauses.push('status = @status');
    request.input('status', sql.NVarChar(20), status);
  }
  if (search) {
    whereClauses.push(`(
      customerName  LIKE @search OR
      customerEmail LIKE @search OR
      orderNumber   LIKE @search
    )`);
    request.input('search', sql.NVarChar(255), `%${search}%`);
  }

  const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const result = await request.query(`
    SELECT
      id, orderNumber, status,
      customerName, customerPhone, customerEmail, customerLocation,
      subtotal, totalAmount, currency,
      submittedAt, createdAt, updatedAt,
      COUNT(*) OVER() AS totalCount
    FROM Orders
    ${where}
    ORDER BY createdAt DESC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
  `);

  const total = result.recordset[0]?.totalCount ?? 0;
  const rows  = result.recordset.map(({ totalCount, ...row }) => row);

  return { rows, total };
}

// ── Update order status ───────────────────────────────────────────────────

async function updateStatus(id, status, submittedAt) {
  const pool    = await getPool();
  const request = pool
    .request()
    .input('id',     sql.UniqueIdentifier, id)
    .input('status', sql.NVarChar(20),     status);

  const setClauses = ['status = @status', 'updatedAt = SYSDATETIME()'];

  if (submittedAt) {
    setClauses.push('submittedAt = @submittedAt');
    request.input('submittedAt', sql.DateTime2, submittedAt);
  }

  const result = await request.query(`
    UPDATE Orders
    SET    ${setClauses.join(', ')}
    OUTPUT
      INSERTED.id, INSERTED.orderNumber, INSERTED.status,
      INSERTED.customerName, INSERTED.customerPhone, INSERTED.customerEmail,
      INSERTED.customerLocation, INSERTED.additionalInstructions,
      INSERTED.subtotal, INSERTED.totalAmount, INSERTED.currency,
      INSERTED.submittedAt, INSERTED.createdAt, INSERTED.updatedAt
    WHERE id = @id
  `);

  return result.recordset[0] || null;
}

// ── Cancel / delete a draft order ────────────────────────────────────────

async function deleteOrder(id) {
  const pool   = await getPool();
  const result = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query(`
      DELETE FROM Orders
      OUTPUT DELETED.id, DELETED.orderNumber, DELETED.status
      WHERE  id = @id
    `);

  return result.recordset[0] || null;
}

module.exports = {
  createOrder,
  createOrderItems,
  findById,
  findByOrderNumber,
  findAll,
  updateStatus,
  deleteOrder,
};