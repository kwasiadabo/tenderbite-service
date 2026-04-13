const express           = require('express');
const controller = require('../controllers/products.controller');
const { upload, optimiseImage } = require('../middleware/upload.middleware');

const router = express.Router();

// Multer + Sharp pipeline for single-file uploads
const uploadAndOptimise = [
  upload.single('productImage'),
  optimiseImage,
];

// ── Routes ───────────────────────────────────────────────────────────────

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product management endpoints
 */

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product
 *     description: >
 *       Creates a new product. The `productImage` field is **mandatory**.
 *       The uploaded image is automatically converted to WebP and resized
 *       (max width 1200 px) before storage.
 *     tags:
 *       - Products
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - productName
 *               - productImage
 *             properties:
 *               productName:
 *                 type: string
 *                 maxLength: 255
 *                 example: Processed Full Chicken
 *               description:
 *                 type: string
 *                 example: 5kg Premium processed full chicken
 *               weight:
 *                 type: string
 *                 example: 1kg
 *               category:
 *                 type: string
 *                 example: Ofal
 *               productImage:
 *                 type: string
 *                 format: binary
 *                 description: JPEG, PNG, WebP or GIF – max 5 MB
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation error or missing image
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', uploadAndOptimise, controller.createProduct);


/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products (paginated)
 *     description: >
 *       Returns a paginated list of products. Supports optional full-text
 *       search across `productName` and `description`.
 *     tags:
 *       - Products
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Results per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for productName or description
 *     responses:
 *       200:
 *         description: Paginated list of products
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedProducts'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', controller.getAllProducts);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get a product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product UUID
 *     responses:
 *       200:
 *         description: Product found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', controller.getProductById);

/**
 * @swagger
 * /api/products/{id}/image:
 *   get:
 *     summary: Retrieve the product image (fast path)
 *     description: >
 *       Streams the optimised WebP image directly from disk.
 *       The response includes aggressive `Cache-Control` and `ETag` headers
 *       so browsers cache the image for 7 days.
 *       The DB query uses a covering index – no heap read is performed.
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product UUID
 *     responses:
 *       200:
 *         description: Image binary (image/webp)
 *         content:
 *           image/webp:
 *             schema:
 *               type: string
 *               format: binary
 *       304:
 *         description: Not Modified (client cache is fresh)
 *       404:
 *         description: Product or image file not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id/image', controller.getProductImage);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update a product
 *     description: >
 *       Updates one or more fields of a product. All fields are optional.
 *       If `productImage` is supplied, the old image is deleted from disk
 *       and replaced with the new optimised WebP.
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product UUID
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               productName:
 *                 type: string
 *                 maxLength: 255
 *               description:
 *                 type: string
 *               productImage:
 *                 type: string
 *                 format: binary
 *                 description: Optional replacement image (JPEG, PNG, WebP, GIF – max 5 MB)
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
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
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', uploadAndOptimise, controller.updateProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete a product
 *     description: Deletes the product record and its associated image file from disk.
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product UUID
 *     responses:
 *       200:
 *         description: Product deleted successfully
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
 *                   example: Product deleted successfully
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', controller.deleteProduct);

module.exports = router;