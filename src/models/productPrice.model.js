const { getPool, sql } = require('../config/database');

// ── Create ────────────────────────────────────────────────────────────────

async function createPrice({ productId, price, currency, effectiveFrom, effectiveTo }) {
  const pool   = await getPool();
  const result = await pool
    .request()
    .input('productId',     sql.NVarChar(50), productId)
    .input('price',         sql.Decimal(10, 2),   price)
    .input('currency',      sql.NVarChar(3),       currency)
    .input('effectiveFrom', sql.DateTime2,         effectiveFrom || null)
    .input('effectiveTo',   sql.DateTime2,         effectiveTo   || null)
    .query(`
      INSERT INTO productPrice (productId, price, currency, effectiveFrom, effectiveTo)
      OUTPUT
        INSERTED.productId,
        INSERTED.price,
        INSERTED.currency,
        INSERTED.effectiveFrom,
        INSERTED.effectiveTo,
        INSERTED.createdAt,
        INSERTED.updatedAt
      VALUES (@productId, @price, @currency, @effectiveFrom, @effectiveTo)
    `);

  return result.recordset[0];
}

// ── Read all prices for a product ─────────────────────────────────────────

async function findByProductId(productId) {
  const pool   = await getPool();
  const result = await pool
    .request()
    .input('productId', sql.UniqueIdentifier, productId)
    .query(`
      SELECT
        id, productId, price, currency,
        effectiveFrom, effectiveTo, createdAt, updatedAt
      FROM productPrice
      WHERE productId = @productId
      ORDER BY createdAt DESC
    `);

  return result.recordset;
}

// ── Read active price for a product (effectiveFrom <= NOW <= effectiveTo) ──

async function findActivePriceByProductId(productId) {
  const pool   = await getPool();
  const result = await pool
    .request()
    .input('productId', sql.UniqueIdentifier, productId)
    .query(`
      SELECT TOP 1
        id, productId, price, currency,
        effectiveFrom, effectiveTo, createdAt, updatedAt
      FROM productPrice
      WHERE productId     = @productId
        AND (effectiveFrom IS NULL OR effectiveFrom <= SYSDATETIME())
        AND (effectiveTo   IS NULL OR effectiveTo   >= SYSDATETIME())
      ORDER BY effectiveFrom DESC, createdAt DESC
    `);

  return result.recordset[0] || null;
}


// - Read all active product prices-------------------------------------------

async function findAllProductsWithActivePrice() {
  const pool   = await getPool();
  const result = await pool
    .request()
    .query(`
SELECT
pp.Id, productName,description,productImage, isnull(pp.price,0.00) as price,
effectiveFrom,effectiveTo
from products p 
left join productprice pp on pp.productId=p.id
WHERE (pp.effectiveFrom IS NULL OR pp.effectiveFrom <= SYSDATETIME())
AND (pp.effectiveTo   IS NULL OR pp.effectiveTo   >= SYSDATETIME())
ORDER BY p.productName ASC
       `);
 return result.recordset;
 //return 'Results from price model'
}
 

// ── Read single price record ───────────────────────────────────────────────

async function findById(id) {
  const pool   = await getPool();
  const result = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query(`
      SELECT
        id, productId, price, currency,
        effectiveFrom, effectiveTo, createdAt, updatedAt
      FROM productPrice
      WHERE id = @id
    `);

  return result.recordset[0] || null;
}

// ── Update ────────────────────────────────────────────────────────────────

async function updatePrice(id, { price, currency, effectiveFrom, effectiveTo }) {
  const pool       = await getPool();
  const setClauses = ['updatedAt = SYSDATETIME()'];
  const request    = pool.request().input('id', sql.UniqueIdentifier, id);

  if (price !== undefined) {
    setClauses.push('price = @price');
    request.input('price', sql.Decimal(10, 2), price);
  }
  if (currency !== undefined) {
    setClauses.push('currency = @currency');
    request.input('currency', sql.NVarChar(3), currency);
  }
  if (effectiveFrom !== undefined) {
    setClauses.push('effectiveFrom = @effectiveFrom');
    request.input('effectiveFrom', sql.DateTime2, effectiveFrom);
  }
  if (effectiveTo !== undefined) {
    setClauses.push('effectiveTo = @effectiveTo');
    request.input('effectiveTo', sql.DateTime2, effectiveTo);
  }

  const result = await request.query(`
    UPDATE productPrice
    SET    ${setClauses.join(', ')}
    OUTPUT
      INSERTED.id,
      INSERTED.productId,
      INSERTED.price,
      INSERTED.currency,
      INSERTED.effectiveFrom,
      INSERTED.effectiveTo,
      INSERTED.createdAt,
      INSERTED.updatedAt
    WHERE id = @id
  `);

  return result.recordset[0] || null;
}

// ── Delete ────────────────────────────────────────────────────────────────

async function deletePrice(id) {
  const pool   = await getPool();
  const result = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query(`
      DELETE FROM productPrice
      OUTPUT DELETED.id
      WHERE  id = @id
    `);

  return result.recordset[0] || null;
}

module.exports = {
  createPrice,
  findByProductId,
  findActivePriceByProductId,
  findById,
  findAllProductsWithActivePrice,
  updatePrice,
  deletePrice,
};