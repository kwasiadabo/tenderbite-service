const express    = require('express');
const controller = require('../controllers/category.controller');
const router     = express.Router();

// ── Routes ──────────────────

/**
 * @swagger
 * tags:
 *   name: Category
 *   description: Product Category Management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       properties:
 *         Id:
 *           type: integer
 *           example: 1
 *         Category:
 *           type: string
 *           example: Electronics
 *     CategoryInput:
 *       type: object
 *       required:
 *         - category
 *       properties:
 *         category:
 *           type: string
 *           example: Electronics
 *     SuccessResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Operation successful
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: An error occurred
 */

// ── POST /api/category ───────────────────────────────────────────────────────

/**
 * @swagger
 * /api/category:
 *   post:
 *     summary: Create a new category
 *     description: Saves a new category record into the Category table.
 *     tags: [Category]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoryInput'
 *           example:
 *             category: Electronics
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *             example:
 *               success: true
 *               data:
 *                 Id: 1
 *                 Category: Electronics
 *       400:
 *         description: Validation error — category is missing, empty, or already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Category already exists.
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: An unexpected error occurred.
 */
router.post('/', controller.createCategory);

// ── GET /api/category ────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/category:
 *   get:
 *     summary: Get all categories
 *     description: Returns a list of all categories ordered alphabetically.
 *     tags: [Category]
 *     responses:
 *       200:
 *         description: List of categories retrieved successfully
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
 *                   example: 3
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 *             example:
 *               success: true
 *               total: 3
 *               data:
 *                 - Id: 1
 *                   Category: Electronics
 *                 - Id: 2
 *                   Category: Fashion
 *                 - Id: 3
 *                   Category: Home & Garden
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: An unexpected error occurred.
 */
router.get('/', controller.getAllCategories);

// ── GET /api/category/:id ────────────────────────────────────────────────────

/**
 * @swagger
 * /api/category/{id}:
 *   get:
 *     summary: Get a category by ID
 *     description: Returns a single category record matching the given ID.
 *     tags: [Category]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: The numeric ID of the category to retrieve
 *     responses:
 *       200:
 *         description: Category retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *             example:
 *               success: true
 *               data:
 *                 Id: 1
 *                 Category: Electronics
 *       400:
 *         description: Invalid ID — must be a positive integer
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Id must be a positive integer.
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Category not found.
 */
router.get('/:id', controller.getCategoryById);

// ── PUT /api/category/:id ────────────────────────────────────────────────────

/**
 * @swagger
 * /api/category/{id}:
 *   put:
 *     summary: Update a category
 *     description: Updates the category name for the record matching the given ID.
 *     tags: [Category]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: The numeric ID of the category to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoryInput'
 *           example:
 *             category: Updated Electronics
 *     responses:
 *       200:
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *             example:
 *               success: true
 *               data:
 *                 Id: 1
 *                 Category: Updated Electronics
 *       400:
 *         description: Validation error — category is empty or name already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Category name already exists.
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Category not found.
 */
router.put('/:id', controller.updateCategory);

// ── DELETE /api/category/:id ─────────────────────────────────────────────────

/**
 * @swagger
 * /api/category/{id}:
 *   delete:
 *     summary: Delete a category
 *     description: Permanently removes the category record matching the given ID.
 *     tags: [Category]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: The numeric ID of the category to delete
 *     responses:
 *       200:
 *         description: Category deleted successfully
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
 *                   example: Category deleted successfully
 *             example:
 *               success: true
 *               message: Category deleted successfully.
 *       400:
 *         description: Invalid ID — must be a positive integer
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Id must be a positive integer.
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Category not found.
 */
router.delete('/:id', controller.deleteCategory);

module.exports = router;