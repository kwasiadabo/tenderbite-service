const { getPool, sql } = require('../config/database');

// ── Create ────────────────────────────────────────────────────────────────

async function createPrice({ productId, price, currency, effectiveFrom, effectiveTo }) {
  const pool   = await getPool();
  const result = await pool
    .request()
    .input('productId',     sql.NVarChar(50),    productId)
    .input('price',         sql.Decimal(10, 2),  price)
    .input('currency',      sql.NVarChar(3),      currency)
    .input('effectiveFrom', sql.DateTime2,        effectiveFrom || null)
    .input('effectiveTo',   sql.DateTime2,        effectiveTo   || null)
    .execute('sp_CreatePrice');

  return result.recordsets?.[0]?.[0] ?? result.recordset?.[0] ?? null;
}

// ── Read all prices for a product ─────────────────────────────────────────

async function findByProductId(productId) {
  const pool   = await getPool();
  const result = await pool
    .request()
    .input('productId', sql.UniqueIdentifier, productId)
    .execute('sp_GetPricesByProductId');

  return result.recordsets?.[0] ?? result.recordset ?? [];
}

// ── Read active price for a product (effectiveFrom <= NOW <= effectiveTo) ──

async function findActivePriceByProductId(productId) {
  const pool   = await getPool();
  const result = await pool
    .request()
    .input('productId', sql.UniqueIdentifier, productId)
    .execute('sp_GetActivePriceByProductId');

  return result.recordsets?.[0]?.[0] ?? result.recordset?.[0] ?? null;
}

// - Read all active product prices-------------------------------------------

async function findAllProductsWithActivePrice() {
  const pool   = await getPool();
  const result = await pool
    .request()
    .execute('sp_GetAllProductsWithActivePrice');

  return result.recordsets?.[0] ?? result.recordset ?? [];
}

// ── Read single price record ───────────────────────────────────────────────

async function findById(id) {
  const pool   = await getPool();
  const result = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .execute('sp_GetPriceById');

  return result.recordsets?.[0]?.[0] ?? result.recordset?.[0] ?? null;
}

// ── Update ────────────────────────────────────────────────────────────────

async function updatePrice(id, { price, currency, effectiveFrom, effectiveTo }) {
  const pool   = await getPool();
  const result = await pool
    .request()
    .input('id',            sql.UniqueIdentifier, id)
    .input('price',         sql.Decimal(10, 2),   price         ?? null)
    .input('currency',      sql.NVarChar(3),       currency      ?? null)
    .input('effectiveFrom', sql.DateTime2,         effectiveFrom ?? null)
    .input('effectiveTo',   sql.DateTime2,         effectiveTo   ?? null)
    .execute('sp_UpdatePrice');

  return result.recordsets?.[0]?.[0] ?? result.recordset?.[0] ?? null;
}
// ── Delete ────────────────────────────────────────────────────────────────

async function deletePrice(id) {
  const pool   = await getPool();
  const result = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .execute('sp_DeletePrice');

  return result.recordsets?.[0]?.[0] ?? result.recordset?.[0] ?? null;
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