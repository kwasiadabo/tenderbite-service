const model        = require('../models/productPrice.model');
const productModel = require('../models/products.model');

// ── Helpers ───────────────────────────────────────────────────────────────

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'GHS', 'NGN', 'KES', 'ZAR'];

function makeError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function notFound(entity, id) {
  return makeError(`${entity} with id "${id}" not found`, 404);
}

function formatPrice(row) {
  return { ...row };
}

function validatePriceInput({ price, currency }) {
  if (price === undefined || price === null)
    throw makeError('price is required', 400);

  const parsed = parseFloat(price);
  if (isNaN(parsed) || parsed < 0)
    throw makeError('price must be a non-negative number', 400);
  if (parsed > 99999999.99)
    throw makeError('price exceeds maximum allowed value', 400);

  if (!currency)
    throw makeError('currency is required', 400);

  const upper = currency.toUpperCase();
  if (upper.length !== 3)
    throw makeError('currency must be a 3-letter ISO 4217 code (e.g. USD)', 400);

  return { price: parsed, currency: upper };
}

function parseDateOrNull(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const d = new Date(value);
  if (isNaN(d.getTime())) throw makeError(`Invalid date value: "${value}"`, 400);
  return d;
}

async function assertProductExists(productId) {
  const product = await productModel.findById(productId);
  if (!product) throw notFound('Product', productId);
}

// ── Create ────────────────────────────────────────────────────────────────

async function createPrice(productId, body) {
  await assertProductExists(productId);

  const { price, currency } = validatePriceInput(body);
  const effectiveFrom = parseDateOrNull(body.effectiveFrom);
  const effectiveTo   = parseDateOrNull(body.effectiveTo);

  if (effectiveFrom && effectiveTo && effectiveTo <= effectiveFrom)
    throw makeError('effectiveTo must be after effectiveFrom', 400);

  const created = await model.createPrice({
    productId,
    price,
    currency,
    effectiveFrom: effectiveFrom ?? null,
    effectiveTo:   effectiveTo   ?? null,
  });

  return formatPrice(created);
}

// ── Get all prices for a product ──────────────────────────────────────────

async function getPricesByProductId(productId) {
  await assertProductExists(productId);
  const rows = await model.findByProductId(productId);
  return rows.map(formatPrice);
}

// ── Get active price for a product ────────────────────────────────────────

async function getActivePriceByProductId(productId) {
  await assertProductExists(productId);
  const row = await model.findActivePriceByProductId(productId);
  if (!row) throw makeError(`No active price found for product "${productId}"`, 404);
  return formatPrice(row);
}

// ── All products with their active price ─────────────────────────────────
// Returns every product regardless of whether it has an active price.
// Products without an active price have activePrice: null.
 
async function getAllProductsWithActivePrice() {
  const rows = await model.findAllProductsWithActivePrice();
 //console('Price services')
  return rows.map((row) => ({
    priceId:        row.Id,
    productName:      row.productName,
    description:      row.description,
    productImage:     row.productImage,
    price:            row.price,
    effectiveFrom:    row.effectiveFrom,
    effectiveTo:      row.effectiveTo,
  }));
}
 

// ── Get single price record ───────────────────────────────────────────────

async function getPriceById(id) {
  const row = await model.findById(id);
  if (!row) throw notFound('Price', id);
  return formatPrice(row);
}

// ── Update ────────────────────────────────────────────────────────────────

async function updatePrice(id, body) {
  const existing = await model.findById(id);
  if (!existing) throw notFound('Price', id);

  const updates = {};

  if (body.price !== undefined || body.currency !== undefined) {
    const { price, currency } = validatePriceInput({
      price:    body.price    ?? existing.price,
      currency: body.currency ?? existing.currency,
    });
    updates.price    = price;
    updates.currency = currency;
  }

  if (body.effectiveFrom !== undefined)
    updates.effectiveFrom = parseDateOrNull(body.effectiveFrom) ?? null;

  if (body.effectiveTo !== undefined)
    updates.effectiveTo = parseDateOrNull(body.effectiveTo) ?? null;

  const from = updates.effectiveFrom ?? existing.effectiveFrom;
  const to   = updates.effectiveTo   ?? existing.effectiveTo;
  if (from && to && to <= from)
    throw makeError('effectiveTo must be after effectiveFrom', 400);

  const updated = await model.updatePrice(id, updates);
  return formatPrice(updated);
}

// ── Delete ────────────────────────────────────────────────────────────────

async function deletePrice(id) {
  const deleted = await model.deletePrice(id);
  if (!deleted) throw notFound('Price', id);
  return { id: deleted.id };
}

module.exports = {
  createPrice,
  getPricesByProductId,
  getActivePriceByProductId,
  getAllProductsWithActivePrice,
  getPriceById,
  updatePrice,
  deletePrice,
};