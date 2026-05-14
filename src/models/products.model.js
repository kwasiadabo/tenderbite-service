const { getPool, sql } = require('../config/database');
const { v4: uuidv4 }   = require('uuid');

// ── Create ────────────────────────────────────────────────────────────────
// UUID is pre-generated so the caller can build the final image URL before
// the INSERT, avoiding a two-step insert+update pattern.

async function createProduct({ id, productName, description, weight, category, productImage, imageFileName, imageMimeType, imageSize }) {
  const pool  = await getPool();
  const newId = id || uuidv4();

  const result = await pool
    .request()
    .input('id',            sql.UniqueIdentifier,  newId)
    .input('productName',   sql.NVarChar(255),     productName)
    .input('description',   sql.NVarChar(sql.MAX), description   || null)
    .input('weight',        sql.NVarChar(50),      weight        || '1kg')
    .input('category',      sql.NVarChar(50),      category)
    .input('productImage',  sql.NVarChar(500),     productImage)
    .input('imageFileName', sql.NVarChar(255),     imageFileName)
    .input('imageMimeType', sql.NVarChar(100),     imageMimeType)
    .input('imageSize',     sql.Int,               imageSize)
    .execute('sp_CreateProduct');

  return result.recordset[0];
}

// ── Read all (paginated) ──────────────────────────────────────────────────

async function findAll({ page = 1, limit = 10, search = '' } = {}) {
  const pool        = await getPool();
  const offset      = (page - 1) * limit;
  const searchParam = search ? `%${search}%` : '%';

  const result = await pool
    .request()
    .input('search', sql.NVarChar(255), searchParam)
    .input('limit',  sql.Int,           limit)
    .input('offset', sql.Int,           offset)
    .execute('sp_GetAllProducts');

  // Debug — remove once fixed
  //console.log('recordsets:', JSON.stringify(result.recordsets, null, 2));
  //console.log('recordset:',  JSON.stringify(result.recordset,  null, 2));

  const rows       = Array.isArray(result.recordsets?.[0]) ? result.recordsets[0] : [];
  const totalCount = rows[0]?.totalCount ?? 0;

  return {
    data:       rows.map(({ totalCount: _, ...rest }) => rest),
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
  };
}

// ── Read one (full row) ───────────────────────────────────────────────────

async function findById(id) {
  const pool   = await getPool();
  const result = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .execute('sp_GetProductById');

  return result.recordset[0] || null;
}

// ── Read image metadata only (uses covering index – no heap read) ─────────
// imageFileName is included in the covering index INCLUDE list so it is
// returned without a key lookup into the heap.

async function findImageById(id) {
  const pool   = await getPool();
  const result = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .execute('sp_GetProductImageById');

  return result.recordset[0] || null;
}

// ── Update ────────────────────────────────────────────────────────────────

async function updateProduct(id, { productName, description, weight, category, productImage, imageFileName, imageMimeType, imageSize }) {
  const pool = await getPool();

  const result = await pool
    .request()
    .input('id',            sql.UniqueIdentifier,  id)
    .input('productName',   sql.NVarChar(255),     productName   ?? null)
    .input('description',   sql.NVarChar(sql.MAX), description   ?? null)
    .input('weight',        sql.NVarChar(50),      weight        ?? null)
    .input('category',      sql.NVarChar(50),      category      ?? null)
    .input('productImage',  sql.NVarChar(500),     productImage  ?? null)
    .input('imageFileName', sql.NVarChar(255),     imageFileName ?? null)
    .input('imageMimeType', sql.NVarChar(100),     imageMimeType ?? null)
    .input('imageSize',     sql.Int,               imageSize     ?? null)
    .execute('sp_UpdateProduct');

  return result.recordset[0] || null;
}
// ── Delete ────────────────────────────────────────────────────────────────

async function deleteProduct(id) {
  const pool   = await getPool();
  const result = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .execute('sp_DeleteProduct');

  return result.recordset[0] || null;
}

module.exports = { createProduct, findAll, findById, findImageById, updateProduct, deleteProduct };