const fs      = require('fs');
const service = require('../services/products.service');

/**
 * Controllers – thin HTTP translation layer only.
 * All business logic stays in the service.
 */

// POST /api/products
async function createProduct(req, res, next) {
  try {
    const product = await service.createProduct(req.body, req.file);
    return res.status(201).json({ success: true, message: 'Product created successfully', data: product });
  } catch (err) {
    next(err);
  }
}

// GET /api/products
async function getAllProducts(req, res, next) {
  try {
    const { page, limit, search } = req.query;
    const result = await service.getAllProducts({ page, limit, search });
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

// GET /api/products/:id
async function getProductById(req, res, next) {
  try {
    const product = await service.getProductById(req.params.id);
    return res.status(200).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

// GET /api/products/:id/image  – streams optimised WebP directly from disk
async function getProductImage(req, res, next) {
  try {
    const { diskPath, mimeType, size } = await service.getProductImage(req.params.id);

    if (!fs.existsSync(diskPath)) {
      return res.status(404).json({ success: false, message: 'Image file not found on disk' });
    }

    res.set({
      'Content-Type':   mimeType,
      'Content-Length': size,
      'Cache-Control':  'public, max-age=604800, immutable',
      'ETag':           `"${req.params.id}"`,
    });

    if (req.headers['if-none-match'] === `"${req.params.id}"`) {
      return res.status(304).end();
    }

    fs.createReadStream(diskPath).pipe(res);
  } catch (err) {
    next(err);
  }
}

// PUT /api/products/:id
async function updateProduct(req, res, next) {
  try {
    const product = await service.updateProduct(req.params.id, req.body, req.file);
    return res.status(200).json({ success: true, message: 'Product updated successfully', data: product });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/products/:id
async function deleteProduct(req, res, next) {
  try {
    await service.deleteProduct(req.params.id);
    return res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { createProduct, getAllProducts, getProductById, getProductImage, updateProduct, deleteProduct };