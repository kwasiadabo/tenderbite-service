const service = require('../services/order.service');

// POST /api/orders/preview
async function previewOrder(req, res, next) {
  try {
    const preview = service.previewOrder(req.body);
    return res.status(200).json({ success: true, data: preview });
  } catch (err) {
    next(err);
  }
}

// POST /api/orders
async function createOrder(req, res, next) {
  try {
    const order = await service.createDraftOrder(req.body);
    return res.status(201).json({
      success: true,
      message: 'Order created as draft. Call POST /api/orders/:id/submit to confirm.',
      data:    order,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/orders/:id/submit
async function submitOrder(req, res, next) {
  try {
    const order = await service.submitOrder(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Order submitted successfully.',
      data:    order,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/orders
async function getAllOrders(req, res, next) {
  try {
    const { page, limit, status, search } = req.query;
    const result = await service.getAllOrders({ page, limit, status, search });
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

// GET /api/orders/:id
async function getOrderById(req, res, next) {
  try {
    const order = await service.getOrderById(req.params.id);
    return res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

// GET /api/orders/number/:orderNumber
async function getOrderByNumber(req, res, next) {
  try {
    const order = await service.getOrderByNumber(req.params.orderNumber);
    return res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/orders/:id/status
async function updateOrderStatus(req, res, next) {
  try {
    const { status } = req.body;
    const order = await service.updateOrderStatus(req.params.id, status);
    return res.status(200).json({
      success: true,
      message: `Order status updated to "${status}".`,
      data:    order,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/orders/:id/cancel
async function cancelOrder(req, res, next) {
  try {
    const order = await service.cancelOrder(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Order cancelled successfully.',
      data:    order,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  previewOrder,
  createOrder,
  submitOrder,
  getAllOrders,
  getOrderById,
  getOrderByNumber,
  updateOrderStatus,
  cancelOrder,
};