const { getPool, sql } = require('../config/database');
const { v4: uuidv4 }   = require('uuid');

// ── Create ────────────────────────────────────────────────────────────────
// UUID is pre-generated so the caller can build the final image URL before
// the INSERT, avoiding a two-step insert+update pattern.

async function createProduct({ id, productName, description, weight,category, productImage, imageFileName, imageMimeType, imageSize }) {
  const pool   = await getPool();
  const newId  = id || uuidv4();

  const result = await pool
    .request()
    .input('id',            sql.UniqueIdentifier,  newId)
    .input('productName',   sql.NVarChar(255),     productName)
    .input('description',   sql.NVarChar(sql.MAX), description || null)
    .input('weight',        sql.NVarChar(50),      weight || '1kg')
    .input('category',      sql.NVarChar(50), category)
    .input('productImage',  sql.NVarChar(500),     productImage)
    .input('imageFileName', sql.NVarChar(255),     imageFileName)
    .input('imageMimeType', sql.NVarChar(100),     imageMimeType)
    .input('imageSize',     sql.Int,               imageSize)
    .query(`
      INSERT INTO Products
        (id, productName, description,weight,category, productImage, imageFileName, imageMimeType, imageSize)
      OUTPUT
        INSERTED.id,
        INSERTED.productName,
        INSERTED.description,
        INSERTED.weight,
        INSERTED.category,
        INSERTED.productImage,
        INSERTED.imageFileName,
        INSERTED.imageMimeType,
        INSERTED.imageSize,
        INSERTED.createdAt,
        INSERTED.updatedAt
      VALUES
        (@id, @productName, @description,@weight,@category, @productImage, @imageFileName, @imageMimeType, @imageSize)
    `);

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
    .query(`
      WITH Filtered AS (
        SELECT
          id, productName, description, productImage,weight,category,
          imageFileName, imageMimeType, imageSize, createdAt, updatedAt,
          COUNT(*) OVER () AS totalCount
        FROM Products
        WHERE productName LIKE @search
           OR description  LIKE @search
      )
      SELECT * FROM Filtered
      ORDER BY createdAt DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `);

  const total = result.recordset[0]?.totalCount ?? 0;
  const rows  = result.recordset.map(({ totalCount, ...row }) => row);

  return { rows, total };
}

// ── Read one (full row) ───────────────────────────────────────────────────

async function findById(id) {
  const pool   = await getPool();
  const result = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query(`
      SELECT
        id, productName, description, weight,category, productImage,
        imageFileName, imageMimeType, imageSize, createdAt, updatedAt
      FROM Products
      WHERE id = @id
    `);

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
    .query(`
      SELECT productImage, imageFileName, imageMimeType, imageSize
      FROM   Products WITH (INDEX(IX_Products_Image))
      WHERE  id = @id
    `);

  return result.recordset[0] || null;
}

// ── Update ────────────────────────────────────────────────────────────────

async function updateProduct(id, { productName, description,productImage, imageFileName, imageMimeType, imageSize }) {
  const pool       = await getPool();
  const setClauses = ['updatedAt = SYSDATETIME()'];
  const request    = pool.request().input('id', sql.UniqueIdentifier, id);

  if (productName !== undefined) {
    setClauses.push('productName = @productName');
    request.input('productName', sql.NVarChar(255), productName);
  }
  if (description !== undefined) {
    setClauses.push('description = @description');
    request.input('description', sql.NVarChar(sql.MAX), description);
    //  request.input('weight', sql.NVarChar(50), weight);
    //   request.input('category', sql.NVarChar(50), category);
  }
  if (productImage !== undefined) {
    // All four image columns must be updated together
    setClauses.push('productImage = @productImage');
    setClauses.push('imageFileName = @imageFileName');
    setClauses.push('imageMimeType = @imageMimeType');
    setClauses.push('imageSize = @imageSize');
    request.input('productImage',  sql.NVarChar(500), productImage);
    request.input('imageFileName', sql.NVarChar(255), imageFileName);
    request.input('imageMimeType', sql.NVarChar(100), imageMimeType);
    request.input('imageSize',     sql.Int,           imageSize);
  }

  const result = await request.query(`
    UPDATE Products
    SET    ${setClauses.join(', ')}
    OUTPUT
      INSERTED.id,
      INSERTED.productName,
      INSERTED.description,
      INSERTED.weight,
      INSERTED.category,
      INSERTED.productImage,
      INSERTED.imageFileName,
      INSERTED.imageMimeType,
      INSERTED.imageSize,
      INSERTED.createdAt,
      INSERTED.updatedAt
    WHERE id = @id
  `);

  return result.recordset[0] || null;
}

// ── Delete ────────────────────────────────────────────────────────────────

async function deleteProduct(id) {
  const pool   = await getPool();
  const result = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query(`
      DELETE FROM Products
      OUTPUT DELETED.id, DELETED.productImage, DELETED.imageFileName
      WHERE  id = @id
    `);

  return result.recordset[0] || null;
}

module.exports = { createProduct, findAll, findById, findImageById, updateProduct, deleteProduct };