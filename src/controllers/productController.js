const Product = require('../models/Product');

function toClientProduct(doc) {
  return {
    id: doc.productId,
    name: doc.name,
    category: doc.category,
    price: doc.price,
    description: doc.description,
    ingredients: doc.ingredients,
    benefits: doc.benefits,
    featured: doc.featured,
    imageUrl: doc.imageUrl,
    stock: doc.stock,
    sku: doc.sku || '',
    status: doc.status || 'active',
    lowStockThreshold: doc.lowStockThreshold ?? 5,
    isDynamic: doc.isDynamic,
    placeholder: Boolean(doc.placeholder),
    comingSoon: Boolean(doc.comingSoon),
    marketing: doc.marketing,
    publishedAt: doc.publishedAt?.toISOString?.() ?? doc.publishedAt,
  };
}

// @GET /api/products
exports.listProducts = async (_req, res, next) => {
  try {
    const products = await Product.find().sort({ publishedAt: -1 });
    res.status(200).json({
      success: true,
      count: products.length,
      data: products.map(toClientProduct),
    });
  } catch (err) {
    next(err);
  }
};

// @GET /api/products/stats (admin)
exports.getProductStats = async (_req, res, next) => {
  try {
    const products = await Product.find().sort({ publishedAt: -1 });
    const totalProducts = products.length;
    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 5);
    const outOfStock = products.filter((p) => p.stock === 0);
    const topProducts = [...products]
      .sort((a, b) => Number(b.featured) - Number(a.featured) || b.price - a.price)
      .slice(0, 5)
      .map((p) => ({
        id: p.productId,
        name: p.name,
        category: p.category,
        price: p.price,
        stock: p.stock,
        featured: p.featured,
      }));

    res.status(200).json({
      success: true,
      data: {
        totalProducts,
        inventoryStatus: {
          inStock: products.filter((p) => p.stock > 5).length,
          lowStock: lowStock.length,
          outOfStock: outOfStock.length,
        },
        topProducts,
        lowStockItems: lowStock.slice(0, 5).map((p) => ({
          name: p.name,
          stock: p.stock,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

// @POST /api/products (admin)
exports.createProduct = async (req, res, next) => {
  try {
    const {
      id,
      name,
      category,
      price,
      description,
      ingredients,
      benefits,
      featured,
      imageUrl,
      marketing,
      publishedAt,
      stock,
      placeholder,
    } = req.body;

    if (!id || !name || !category || price == null || !description || !imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'id, name, category, price, description, and imageUrl are required',
      });
    }

    const existing = await Product.findOne({ productId: id });
    if (existing) {
      existing.name = name;
      existing.category = category;
      existing.price = Number(price);
      existing.description = description;
      existing.ingredients = ingredients || '';
      existing.benefits = Array.isArray(benefits) ? benefits : [];
      existing.featured = Boolean(featured);
      existing.imageUrl = imageUrl;
      existing.marketing = marketing || existing.marketing;
      existing.publishedAt = publishedAt ? new Date(publishedAt) : existing.publishedAt;
      if (stock != null) existing.stock = Number(stock);
      if (placeholder != null) existing.placeholder = Boolean(placeholder);
      await existing.save();

      return res.status(200).json({
        success: true,
        message: 'Product updated',
        data: toClientProduct(existing),
      });
    }

    const product = await Product.create({
      productId: id,
      name,
      category,
      price: Number(price),
      description,
      ingredients: ingredients || '',
      benefits: Array.isArray(benefits) ? benefits : [],
      featured: Boolean(featured),
      imageUrl,
      marketing: marketing || {},
      publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
      stock: stock != null ? Number(stock) : 25,
      isDynamic: true,
      placeholder: Boolean(placeholder),
    });

    res.status(201).json({
      success: true,
      message: 'Product published',
      data: toClientProduct(product),
    });
  } catch (err) {
    next(err);
  }
};

// @PATCH /api/products/:id (admin)
exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ productId: req.params.id });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const {
      name,
      category,
      price,
      description,
      ingredients,
      benefits,
      featured,
      imageUrl,
      stock,
      sku,
      status,
      comingSoon,
      lowStockThreshold,
      placeholder,
    } = req.body;

    if (name != null) product.name = String(name).trim();
    if (category != null) product.category = category;
    if (price != null) product.price = Number(price);
    if (description != null) product.description = description;
    if (ingredients != null) product.ingredients = ingredients;
    if (benefits != null) product.benefits = Array.isArray(benefits) ? benefits : product.benefits;
    if (featured != null) product.featured = Boolean(featured);
    if (imageUrl != null) product.imageUrl = imageUrl;
    if (stock != null) {
      product.stock = Number(stock);
      if (product.stock <= 0) product.status = 'out_of_stock';
      else if (product.status === 'out_of_stock') product.status = 'active';
    }
    if (sku != null) product.sku = String(sku).trim();
    if (status != null) product.status = status;
    if (comingSoon != null) product.comingSoon = Boolean(comingSoon);
    if (lowStockThreshold != null) product.lowStockThreshold = Number(lowStockThreshold);
    if (placeholder != null) product.placeholder = Boolean(placeholder);

    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product updated',
      data: toClientProduct(product),
    });
  } catch (err) {
    next(err);
  }
};

// @DELETE /api/products/:id (admin)
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findOneAndDelete({ productId: req.params.id });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.status(200).json({ success: true, message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
};
