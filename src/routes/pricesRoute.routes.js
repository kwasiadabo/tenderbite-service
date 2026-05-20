const express    = require('express');
const controller = require('../controllers/productPrice.controller');
//const productRouter = express.Router({ mergeParams: true }); // for /api/products/:productId/prices
const router   = express.Router();   

                 

// ── Routes ──────────────────

/**
 * @swagger
 * tags:
 *   name: Prices
 *   description: Product price management
 */

/**
 * @swagger
 * /api/productprices/{productId}:
 *   post:
 *     summary: Set a price for a product
 *     description: >
 *       Creates a new price record for the specified product. A product can
 *       have multiple price records with different date ranges, allowing
 *       scheduled pricing. If `effectiveFrom` and `effectiveTo` are omitted
 *       the price is considered always active.
 *     tags: [Prices]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PriceInput'
 *     responses:
 *       201:
 *         description: Price created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PriceResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:productId', controller.createPrice);

/**
 * @swagger
 * /api/productprices/{productId}:
 *   get:
 *     summary: Get all prices for a product
 *     description: Returns the full price history for a product, newest first.
 *     tags: [Prices]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product UUID
 *     responses:
 *       200:
 *         description: List of prices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Price'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/price/:productId', controller.getPricesByProductId);

/**
 * @swagger
 * /api/productprices/{productId}/price:
 *   get:
 *     summary: Get the currently active price for a product
 *     description: >
 *       Returns the price record where `effectiveFrom <= now <= effectiveTo`.
 *       If multiple records match, the one with the most recent `effectiveFrom`
 *       is returned.
 *     tags: [Prices]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product UUID
 *     responses:
 *       200:
 *         description: Active price record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PriceResponse'
 *       404:
 *         description: Product not found or no active price
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:productId/price', controller.getActivePrice);


// ── /api/prices ───────────────────────────────────────────────────────────
 
/**
 * @swagger
 * /api/productprices:
 *   get:
 *     summary: List all products with their active price
 *     description: >
 *       Returns every product in the catalogue alongside its currently active
 *       price. Products that have no active price record are still returned
 *       with `activePrice: null`. Results are ordered by productName
 *       ascending. A single OUTER APPLY query is used so the entire result
 *       is fetched in one database round-trip.
 *     tags: [Prices]
 *     responses:
 *       200:
 *         description: Full product catalogue with active prices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 total:
 *                   type: integer
 *                   example: 42
 *                   description: Total number of products returned
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProductWithActivePrice'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', controller.getAllProductPrices);
 

/**
 * @swagger
 * /api/productprices/{id}:
 *   put:
 *     summary: Update a price record
 *     description: All fields are optional – only supplied fields are updated.
 *     tags: [Prices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Price record UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PriceInput'
 *     responses:
 *       200:
 *         description: Price updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PriceResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Price not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', controller.updatePrice);

/**
 * @swagger
 * /api/productprices/{id}:
 *   delete:
 *     summary: Delete a price record
 *     tags: [Prices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Price record UUID
 *     responses:
 *       200:
 *         description: Price deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Price deleted successfully
 *       404:
 *         description: Price not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', controller.deletePrice);

module.exports = router ;