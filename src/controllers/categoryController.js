const Category = require('../models/Category');

function toClient(doc) {
  return {
    id: doc._id.toString(),
    slug: doc.slug,
    label: doc.label,
    imageUrl: doc.imageUrl,
    placeholder: Boolean(doc.placeholder),
    sortOrder: doc.sortOrder,
  };
}

// @GET /api/categories
exports.listCategories = async (_req, res, next) => {
  try {
    const categories = await Category.find().sort({ sortOrder: 1, label: 1 });
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories.map(toClient),
    });
  } catch (err) {
    next(err);
  }
};

// @POST /api/categories (admin)
exports.createCategory = async (req, res, next) => {
  try {
    const { label, slug, imageUrl, placeholder, sortOrder } = req.body;
    if (!label || !slug || !imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'label, slug, and imageUrl are required',
      });
    }

    const existing = await Category.findOne({ slug: String(slug).trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A category with this slug already exists',
      });
    }

    const category = await Category.create({
      label: String(label).trim(),
      slug: String(slug).trim(),
      imageUrl,
      placeholder: placeholder != null ? Boolean(placeholder) : true,
      sortOrder: sortOrder != null ? Number(sortOrder) : 0,
    });

    res.status(201).json({
      success: true,
      message: 'Category created',
      data: toClient(category),
    });
  } catch (err) {
    next(err);
  }
};

// @PATCH /api/categories/:id (admin)
exports.updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const { label, slug, imageUrl, placeholder, sortOrder } = req.body;
    if (label != null) category.label = String(label).trim();
    if (slug != null) category.slug = String(slug).trim();
    if (imageUrl != null) category.imageUrl = imageUrl;
    if (placeholder != null) category.placeholder = Boolean(placeholder);
    if (sortOrder != null) category.sortOrder = Number(sortOrder);

    await category.save();

    res.status(200).json({
      success: true,
      message: 'Category updated',
      data: toClient(category),
    });
  } catch (err) {
    next(err);
  }
};

// @DELETE /api/categories/:id (admin)
exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.status(200).json({ success: true, message: 'Category deleted' });
  } catch (err) {
    next(err);
  }
};
