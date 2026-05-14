const path           = require('path');
const { v4: uuidv4 } = require('uuid');
const model          = require('../models/products.model');
const { deleteImageFile, UPLOAD_DIR } = require('../middleware/upload.middleware');

// ── Helpers ───────────────────────────────────────────────────────────────

const buildImageUrl  = (id) =>
  `${process.env.IMAGE_BASE_URL || 'http://localhost:3000'}/api/products/${id}/image`;

// imageFileName is the actual filename on disk (e.g. "abc123.webp").
// It is stored in its own DB column – never derived by splitting the URL.
const buildImagePath = (imageFileName) => path.join(UPLOAD_DIR, imageFileName);

function formatProduct(product) {
  return { ...product };
}

function makeError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function validateProductName(name) {
  if (!name || !name.toString().trim())
    throw makeError('productName is required', 400);
  if (name.trim().length > 255)
    throw makeError('productName must be 255 characters or fewer', 400);
}

function requireFile(file) {
  if (!file) throw makeError('productImage is required. Please upload an image file.', 400);
}

function notFound(id) {
  return makeError(`Product with id "${id}" not found`, 404);
}

// ── Create ────────────────────────────────────────────────────────────────

async function createProduct({ productName, description,weight,category }, file) {
  requireFile(file);
  validateProductName(productName);

  const id = uuidv4();

  const created = await model.createProduct({
    id,
    productName:   productName.trim(),
    description:   description?.trim() || null,
    weight:        weight?.trim()|| null,
    category:      category?.trim()||null,
    productImage:  buildImageUrl(id),       // final URL known before INSERT
    imageFileName: file.optimisedName,      // actual filename on disk
    imageMimeType: file.optimisedMime,
    imageSize:     file.optimisedSize,
  });

  return formatProduct(created);
}

// ── Get all (paginated) ───────────────────────────────────────────────────

// products.service.js
async function getAllProducts({ page, limit, search }) {
  const result = await model.findAll({ page, limit, search });

  // ❌ Wrong — result is the whole object { data, totalCount, page, limit, totalPages }
  // return result.map(...) 

  // ✅ Correct — access .data
  return {
    data:       result.data,
    totalCount: result.totalCount,
    page:       result.page,
    limit:      result.limit,
    totalPages: result.totalPages,
  };
}

// ── Get one ───────────────────────────────────────────────────────────────

async function getProductById(id) {
  const product = await model.findById(id);
  if (!product) throw notFound(id);
  return formatProduct(product);
}

// ── Get image (fast path via covering index) ──────────────────────────────

async function getProductImage(id) {
  const img = await model.findImageById(id);
  if (!img) throw notFound(id);

  return {
    diskPath: buildImagePath(img.imageFileName),  // use imageFileName directly
    mimeType: img.imageMimeType,
    size:     img.imageSize,
  };
}

// ── Update ────────────────────────────────────────────────────────────────

async function updateProduct(id, { productName, description,weight,category}, file) {
  const existing = await model.findById(id);
  if (!existing) throw notFound(id);

  const updates = {};

  if (productName !== undefined) {
    validateProductName(productName);
    updates.productName = productName.trim();
  }
  if (description !== undefined) {
    updates.description = description?.trim() || null;
  }
   if (weight !== undefined) {
    updates.weight = weight?.trim() || null;
  }
   if (category !== undefined) {
    updates.category = category?.trim() || null;
  }
  if (file) {
    // Delete old image using imageFileName directly — not by parsing the URL
    deleteImageFile(buildImagePath(existing.imageFileName));

    updates.productImage  = buildImageUrl(id);
    updates.imageFileName = file.optimisedName;
    updates.imageMimeType = file.optimisedMime;
    updates.imageSize     = file.optimisedSize;
  }

  const updated = await model.updateProduct(id, updates);
  return formatProduct(updated);
}

// ── Delete ────────────────────────────────────────────────────────────────

async function deleteProduct(id) {
  const deleted = await model.deleteProduct(id);
  if (!deleted) throw notFound(id);

  // Use imageFileName directly — not by parsing the URL
  deleteImageFile(buildImagePath(deleted.imageFileName));
  return { id: deleted.id };
}

module.exports = { createProduct, getAllProducts, getProductById, getProductImage, updateProduct, deleteProduct };