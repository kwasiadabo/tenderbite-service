const orderModel = require('../models/order.model');

// ── Constants ─────────────────────────────────────────────────────────────

const ORDER_STATUSES = ['draft', 'pending', 'confirmed', 'processing', 'completed', 'cancelled'];
const WEIGHT_UNITS   = ['kg', 'g', 'lb', 'oz', 'ton'];

// ── Helpers ───────────────────────────────────────────────────────────────

function makeError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function notFound(id) {
  return makeError(`Order with id "${id}" not found`, 404);
}

function generateOrderNumber() {
  const ts  = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${ts}-${rnd}`;
}

// ── Validation ────────────────────────────────────────────────────────────

function validateCustomer({ customerName, customerPhone, customerEmail, customerLocation }) {
  const errors = [];

  if (!customerName?.trim())
    errors.push('customerName is required');

  if (!customerPhone?.trim())
    errors.push('customerPhone is required');
  else if (!/^\+?[\d\s\-().]{7,20}$/.test(customerPhone.trim()))
    errors.push('customerPhone must be a valid phone number');

  if (!customerEmail?.trim())
    errors.push('customerEmail is required');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim()))
    errors.push('customerEmail must be a valid email address');

  if (!customerLocation?.trim())
    errors.push('customerLocation is required');

  if (errors.length) throw makeError(errors.join('; '), 400);
}

function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0)
    throw makeError('items must be a non-empty array', 400);

  return items.map((item, idx) => {
    const errors = [];
    const prefix = `items[${idx}]`;

    if (!item.category?.trim())       errors.push(`${prefix}.category is required`);
    if (!item.productName?.trim())    errors.push(`${prefix}.productName is required`);

    const qty   = parseInt(item.quantity);
    if (!qty || qty < 1)              errors.push(`${prefix}.quantity must be a positive integer`);

    const price = parseFloat(item.unitPrice);
    if (isNaN(price) || price < 0)   errors.push(`${prefix}.unitPrice must be a non-negative number`);

    if (item.weight !== undefined && item.weight !== null) {
      const w = parseFloat(item.weight);
      if (isNaN(w) || w <= 0)         errors.push(`${prefix}.weight must be a positive number`);
      if (item.weightUnit && !WEIGHT_UNITS.includes(item.weightUnit))
        errors.push(`${prefix}.weightUnit must be one of: ${WEIGHT_UNITS.join(', ')}`);
    }

    if (errors.length) throw makeError(errors.join('; '), 400);

    const validQty   = qty;
    const validPrice = price;
    const lineTotal  = parseFloat((validPrice * validQty).toFixed(2));

    return {
      productId:   item.productId   || null,
      category:    item.category.trim(),
      productName: item.productName.trim(),
      description: item.description?.trim() || null,
      weight:      item.weight != null ? parseFloat(parseFloat(item.weight).toFixed(3)) : null,
      weightUnit:  item.weight != null ? (item.weightUnit || 'kg') : null,
      unitPrice:   validPrice,
      quantity:    validQty,
      lineTotal,
      currency:    (item.currency || 'USD').toUpperCase(),
    };
  });
}

function calculateTotals(validatedItems) {
  const subtotal    = parseFloat(validatedItems.reduce((sum, i) => sum + i.lineTotal, 0).toFixed(2));
  const totalAmount = subtotal; // extend here for tax / shipping
  const currency    = validatedItems[0].currency;
  return { subtotal, totalAmount, currency };
}

function formatOrder(order) {
  return { ...order };
}

// ── Preview order (no DB write) ───────────────────────────────────────────

function previewOrder({ customerName, customerPhone, customerEmail, customerLocation, additionalInstructions, items }) {
  validateCustomer({ customerName, customerPhone, customerEmail, customerLocation });
  const validatedItems = validateItems(items);
  const { subtotal, totalAmount, currency } = calculateTotals(validatedItems);

  return {
    preview: true,
    customer: {
      customerName:           customerName.trim(),
      customerPhone:          customerPhone.trim(),
      customerEmail:          customerEmail.trim(),
      customerLocation:       customerLocation.trim(),
      additionalInstructions: additionalInstructions?.trim() || null,
    },
    items: validatedItems,
    summary: {
      itemCount:   validatedItems.length,
      totalQty:    validatedItems.reduce((s, i) => s + i.quantity, 0),
      subtotal,
      totalAmount,
      currency,
    },
    message: 'This is a preview. Submit the order to confirm.',
  };
}

// ── Create a draft order ──────────────────────────────────────────────────

async function createDraftOrder(body) {
  const { customerName, customerPhone, customerEmail, customerLocation, additionalInstructions, items } = body;

  validateCustomer({ customerName, customerPhone, customerEmail, customerLocation });
  const validatedItems = validateItems(items);
  const { subtotal, totalAmount, currency } = calculateTotals(validatedItems);

  const orderNumber = generateOrderNumber();

  const order = await orderModel.createOrder({
    orderNumber,
    status:                 'draft',
    customerName:           customerName.trim(),
    customerPhone:          customerPhone.trim(),
    customerEmail:          customerEmail.trim(),
    customerLocation:       customerLocation.trim(),
    additionalInstructions: additionalInstructions?.trim() || null,
    subtotal,
    totalAmount,
    currency,
  });

  const orderItems = await orderModel.createOrderItems(
    validatedItems.map((item) => ({ ...item, orderId: order.id }))
  );

  return formatOrder({ ...order, items: orderItems });
}

// ── Submit a draft order ──────────────────────────────────────────────────

async function submitOrder(id) {
  const existing = await orderModel.findById(id);
  if (!existing) throw notFound(id);

  if (existing.status !== 'draft')
    throw makeError(`Only draft orders can be submitted. Current status: "${existing.status}"`, 409);

  const updated = await orderModel.updateStatus(id, 'pending', new Date());
  const items   = await orderModel.findById(id);

  return formatOrder({ ...updated, items: items.items });
}

// ── Get all orders (paginated) ────────────────────────────────────────────

async function getAllOrders({ page, limit, status, search } = {}) {
  const parsedPage  = Math.max(1, parseInt(page)  || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit) || 10));

  if (status && !ORDER_STATUSES.includes(status))
    throw makeError(`Invalid status. Must be one of: ${ORDER_STATUSES.join(', ')}`, 400);

  const { rows, total } = await orderModel.findAll({
    page:   parsedPage,
    limit:  parsedLimit,
    status: status || null,
    search: search?.trim() || null,
  });

  return {
    data: rows.map(formatOrder),
    pagination: {
      total,
      page:       parsedPage,
      limit:      parsedLimit,
      totalPages: Math.ceil(total / parsedLimit),
    },
  };
}

// ── Get single order ──────────────────────────────────────────────────────

async function getOrderById(id) {
  const order = await orderModel.findById(id);
  if (!order) throw notFound(id);
  return formatOrder(order);
}

// ── Get order by order number ─────────────────────────────────────────────

async function getOrderByNumber(orderNumber) {
  const order = await orderModel.findByOrderNumber(orderNumber);
  if (!order) throw makeError(`Order "${orderNumber}" not found`, 404);
  return formatOrder(order);
}

// ── Update order status (admin) ───────────────────────────────────────────

async function updateOrderStatus(id, status) {
  if (!ORDER_STATUSES.includes(status))
    throw makeError(`Invalid status. Must be one of: ${ORDER_STATUSES.join(', ')}`, 400);

  const existing = await orderModel.findById(id);
  if (!existing) throw notFound(id);

  // Guard against illogical transitions
  const FINAL = ['completed', 'cancelled'];
  if (FINAL.includes(existing.status))
    throw makeError(`Cannot change status of a "${existing.status}" order`, 409);

  const updated = await orderModel.updateStatus(id, status, null);
  const full    = await orderModel.findById(id);

  return formatOrder({ ...updated, items: full.items });
}

// ── Cancel / delete a draft order ────────────────────────────────────────

async function cancelOrder(id) {
  const existing = await orderModel.findById(id);
  if (!existing) throw notFound(id);

  if (!['draft', 'pending'].includes(existing.status))
    throw makeError(`Only draft or pending orders can be cancelled. Current status: "${existing.status}"`, 409);

  // Soft-cancel: update status to cancelled
  const updated = await orderModel.updateStatus(id, 'cancelled', null);
  return formatOrder(updated);
}

module.exports = {
  previewOrder,
  createDraftOrder,
  submitOrder,
  getAllOrders,
  getOrderById,
  getOrderByNumber,
  updateOrderStatus,
  cancelOrder,
};