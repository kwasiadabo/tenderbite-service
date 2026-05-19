const fs      = require('fs');
const service = require('../services/category.service');

/**
 * Controllers – thin HTTP translation layer only.
 * All business logic stays in the service.
 */

// POST /api/category
async function createCategory(req, res, next) {
    try {
        const { category } = req.body;

        if (!category || category.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Category is required.',
            });
        }

        const created = await service.createCategory(category.trim());

        return res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: created,
        });
    } catch (err) {
        next(err);
    }
}

// GET /api/products
async function getAllCategories(req, res, next) {
  try {
    const { page, limit, search } = req.query;
    const result = await service.getAllCategories({ page, limit, search });
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

// GET /api/products/:id
async function getCategoryById(req, res, next) {
  try {
    const category = await service.getCategoryById(req.params.id);
    return res.status(200).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
}

// PUT /api/products/:id
async function updateCategory(req, res, next) {
  try {
    const category = await service.updateCategory(req.params.id, req.body);
    return res.status(200).json({ success: true, message: 'Category updated successfully', data: category });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/products/:id
async function deleteCategory(req, res, next) {
  try {
    await service.deleteCategory(req.params.id);
    return res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { createCategory, getAllCategories, getCategoryById, updateCategory, deleteCategory };