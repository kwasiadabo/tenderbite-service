const model        = require('../models/category.model')

// ── Create ────────────────────────────────────────────────────────────────

async function createCategory(category) {
  const created = await model.createCategory(category);

  return (created);
}

// ── Get category by Id ──────────────────────────────────────────

async function getCategoryById(id) {
  const rows = await model.findCategoryById(id);
  return (rows);
}



// ── All categories ─────────────────────────────────
// Returns every category regardless .

 
async function getAllCategories({ page, limit, search } = {}) {
    const result = await model.findAllCategory({ page, limit, search });

    return {
        data: result.data.map((row) => ({
            categoryId: row.Id,
            category:   row.Category,  // ✅ capital C — matches DB column
        })),
        totalCount: result.totalCount,
        page:       result.page,
        limit:      result.limit,
        totalPages: result.totalPages,
    };
}
 

// ── Update ────────────────────────────────────────────────────────────────

async function updateCategory(id, category) {
  const existing = await model.updateCategory(id,category);
  if (!existing) throw notFound('category', id);

  const updates = {};

  if (category !== undefined ) {
    updates.category    = category;
  }
  const updated = await model.updateCategory(id, category);
  return (updated);
}

// ── Delete ────────────────────────────────────────────────────────────────

async function deleteCategory(id) {
  const deleted = await model.deleteCategory(id);
  if (!deleted) throw notFound('Category', id);
  return { id: deleted.id };
}

module.exports = {
  createCategory,
  getCategoryById,
  getAllCategories,
  updateCategory,
  deleteCategory,
};