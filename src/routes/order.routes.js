const express    = require('express');
const controller = require('../controllers/order.controller');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Customer order management
 */

// ── Named routes first to avoid /:id matching them ───────────────────────

/**
 * @swagger
 * /api/orders/preview:
 *   post:
 *     summary: Preview an order before submission
 *     description: >
 *       Validates all customer details and order items, calculates line totals
 *       and the order summary, then returns a full preview object.
 *       **No data is written to the database.** Use this before calling
 *       `POST /api/orders` to let the customer review their basket.
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OrderInput'
 *           example:
 *             customerName: "Kwame Mensah"
 *             customerPhone: "+233244123456"
 *             customerEmail: "kwame@example.com"
 *             customerLocation: "Accra, Ghana"
 *             additionalInstructions: "Please call before delivery"
 *             items:
 *               - category: "Electronics"
 *                 productName: "Wireless Headphones"
 *                 description: "Noise-cancelling over-ear headphones"
 *                 weight: 0.35
 *                 weightUnit: "kg"
 *                 unitPrice: 129.99
 *                 quantity: 2
 *                 currency: "USD"
 *               - category: "Accessories"
 *                 productName: "USB-C Cable"
 *                 unitPrice: 12.50
 *                 quantity: 3
 *                 currency: "USD"
 *     responses:
 *       200:
 *         description: Order preview with computed totals
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/OrderPreview'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/preview', controller.previewOrder);

/**
 * @swagger
 * /api/orders/number/{orderNumber}:
 *   get:
 *     summary: Look up an order by its human-readable order number
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: orderNumber
 *         required: true
 *         schema:
 *           type: string
 *           example: ORD-LB4X2A-K9MZ
 *     responses:
 *       200:
 *         description: Order found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderResponse'
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/number/:orderNumber', controller.getOrderByNumber);

// ── Collection routes ─────────────────────────────────────────────────────

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: List all orders
 *     description: Returns a paginated list of orders. Supports filtering by status and searching by customer name, email, or order number.
 *     tags: [Orders]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, pending, confirmed, processing, completed, cancelled]
 *         description: Filter by order status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search customer name, email, or order number
 *     responses:
 *       200:
 *         description: Paginated order list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedOrders'
 *       400:
 *         description: Invalid status filter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', controller.getAllOrders);

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a draft order
 *     description: >
 *       Creates the order as a **draft** (nothing is confirmed yet). The customer
 *       can review the returned order and call `POST /api/orders/:id/submit` to
 *       confirm. Draft orders can be cancelled any time before submission.
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OrderInput'
 *     responses:
 *       201:
 *         description: Draft order created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', controller.createOrder);

// ── Single-order routes ───────────────────────────────────────────────────

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get an order by ID
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Order details with all items
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderResponse'
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', controller.getOrderById);

/**
 * @swagger
 * /api/orders/{id}/submit:
 *   post:
 *     summary: Submit a draft order
 *     description: >
 *       Transitions a **draft** order to **pending** and records the submission
 *       timestamp. Only draft orders can be submitted. This is the final
 *       customer confirmation step.
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Order submitted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderResponse'
 *       409:
 *         description: Order is not in draft status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/submit', controller.submitOrder);

/**
 * @swagger
 * /api/orders/{id}/status:
 *   patch:
 *     summary: Update order status (admin)
 *     description: >
 *       Allows administrators to advance the order through the fulfilment
 *       pipeline. Valid transitions: `pending → confirmed → processing → completed`.
 *       Completed and cancelled orders cannot be changed.
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [draft, pending, confirmed, processing, completed, cancelled]
 *                 example: confirmed
 *     responses:
 *       200:
 *         description: Status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderResponse'
 *       400:
 *         description: Invalid status value
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Status transition not allowed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/:id/status', controller.updateOrderStatus);

/**
 * @swagger
 * /api/orders/{id}/cancel:
 *   post:
 *     summary: Cancel an order
 *     description: >
 *       Cancels a **draft** or **pending** order. Confirmed, processing,
 *       or completed orders cannot be cancelled through this endpoint.
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Order cancelled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderResponse'
 *       409:
 *         description: Order cannot be cancelled in its current state
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/cancel', controller.cancelOrder);

module.exports = router;