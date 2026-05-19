const { getPool, sql } = require('../config/database');
const { v4: uuidv4 }   = require('uuid');

// ── Create ────────────────────────────────────────────────────────────────
// UUID is pre-generated so the caller can build the final image URL before
// the INSERT, avoiding a two-step insert+update pattern.

async function createCategory( category ) {
  const pool  = await getPool();
//   const newId = id || uuidv4();
  const result = await pool
    .request()
    .input('category',   sql.NVarChar(50), category)
    .execute('sp_CreateCategory');
  return result.recordset[0];
}

// ── Read all (paginated) ──────────────────────────────────────────────────

async function findAllCategory({ page = 1, limit = 10, search = '' } = {}) {
    const pool        = await getPool();
    const offset      = (page - 1) * limit;
    const searchParam = search ? `%${search}%` : '%';

    const result = await pool
        .request()
        .input('search', sql.NVarChar(255), searchParam)
        .input('limit',  sql.Int,           limit)
        .input('offset', sql.Int,           offset)
        .execute('dbo.sp_GetAllCategory');
    const rows       = (result.recordsets?.[0]) ? result.recordsets[0] : [];        
    const totalCount = rows[0]?.totalCount ?? rows.length;

    return {
        data:       rows.map(({ totalCount: _, ...rest }) => rest),
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
    };
}
// ── Read one (full row) ───────────────────────────────────────────────────

async function findCategoryById(id) {
  const pool   = await getPool();
  const result = await pool
    .request()
    .input('id', sql.Int, id)
    .execute('sp_GetCategoryById');
  return result.recordset[0] || null;
}


// ── Update ────────────────────────────────────────────────────────────────

async function updateCategory(id, { category }) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('id',            sql.Int,  id)
    .input('category',   sql.NVarChar(255),     category   ?? null)
    .execute('sp_UpdateCategory');
  return result.recordset[0] || null;
}
// ── Delete ────────────────────────────────────────────────────────────────

async function deleteCategory(id) {
  const pool   = await getPool();
  const result = await pool
    .request()
    .input('Id', sql.Int, id)
    .execute('sp_DeleteCategory');

   return { success: true, message: 'Category deleted successfully' };
}

module.exports = { createCategory, findAllCategory, findCategoryById, updateCategory, deleteCategory };