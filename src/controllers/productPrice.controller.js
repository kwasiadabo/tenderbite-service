const service = require('../services/productPrice.service');

// POST /api/products/:productId/prices
async function createPrice(req, res, next) {
  try {
    const price = await service.createPrice(req.params.productId, req.body);
    return res.status(201).json({ success: true, message: 'Price created successfully', data: price });
  } catch (err) {
    next(err);
  }
}

// GET /api/products/:productId/prices
async function getPricesByProductId(req, res, next) {
  try {
    const prices = await service.getPricesByProductId(req.params.productId);
    return res.status(200).json({ success: true, data: prices });
  } catch (err) {
    next(err);
  }
}

// GET /api/products/:productId/prices/active
async function getActivePrice(req, res, next) {
  try {
    const price = await service.getActivePriceByProductId(req.params.productId);
    return res.status(200).json({ success: true, data: price });
  } catch (err) {
    next(err);
  }
}

/// GET /api/prices/products/active
async function getAllProductPrices(req, res, next) {
  try {
    const data = await service.getAllProductsWithActivePrice();
    return res.status(200).json({
      success: true,
      total:   data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
}


// GET /api/prices/:id
async function getPriceById(req, res, next) {
  try {
    const price = await service.getPriceById(req.params.id);
    return res.status(200).json({ success: true, data: price });
  } catch (err) {
    next(err);
  }
}

// PUT /api/prices/:id
async function updatePrice(req, res, next) {
  try {
    const price = await service.updatePrice(req.params.id, req.body);
    return res.status(200).json({ success: true, message: 'Price updated successfully', data: price });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/prices/:id
async function deletePrice(req, res, next) {
  try {
    await service.deletePrice(req.params.id);
    return res.status(200).json({ success: true, message: 'Price deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { createPrice, getPricesByProductId, getActivePrice, getPriceById, updatePrice, deletePrice,getAllProductPrices };