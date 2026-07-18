const BlogPost = require('../models/BlogPost');

function toClient(doc) {
  return {
    id: doc.postId,
    mongoId: doc._id.toString(),
    title: doc.title,
    excerpt: doc.excerpt,
    category: doc.category,
    date: doc.date ? new Date(doc.date).toISOString().slice(0, 10) : undefined,
    imageUrl: doc.imageUrl,
    placeholder: Boolean(doc.placeholder),
    sortOrder: doc.sortOrder,
  };
}

// @GET /api/blog
exports.listPosts = async (_req, res, next) => {
  try {
    const posts = await BlogPost.find().sort({ sortOrder: 1, date: -1 });
    res.status(200).json({
      success: true,
      count: posts.length,
      data: posts.map(toClient),
    });
  } catch (err) {
    next(err);
  }
};

// @POST /api/blog (admin)
exports.createPost = async (req, res, next) => {
  try {
    const { id, title, excerpt, category, date, imageUrl, placeholder, sortOrder } = req.body;
    if (!title || !excerpt || !imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'title, excerpt, and imageUrl are required',
      });
    }

    const postId =
      (id && String(id).trim())
      || (
        String(title)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
        + '-'
        + Date.now().toString(36)
      );

    const existing = await BlogPost.findOne({ postId });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Post id already exists' });
    }

    const post = await BlogPost.create({
      postId,
      title: String(title).trim(),
      excerpt: String(excerpt).trim(),
      category: String(category || 'Skincare').trim(),
      date: date ? new Date(date) : new Date(),
      imageUrl,
      placeholder: placeholder != null ? Boolean(placeholder) : true,
      sortOrder: sortOrder != null ? Number(sortOrder) : 0,
    });

    res.status(201).json({
      success: true,
      message: 'Blog post created',
      data: toClient(post),
    });
  } catch (err) {
    next(err);
  }
};

// @PATCH /api/blog/:id  (id = postId or mongo _id)
exports.updatePost = async (req, res, next) => {
  try {
    let post = await BlogPost.findOne({ postId: req.params.id });
    if (!post) {
      post = await BlogPost.findById(req.params.id).catch(() => null);
    }
    if (!post) {
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }

    const { title, excerpt, category, date, imageUrl, placeholder, sortOrder } = req.body;
    if (title != null) post.title = String(title).trim();
    if (excerpt != null) post.excerpt = String(excerpt).trim();
    if (category != null) post.category = String(category).trim();
    if (date != null) post.date = new Date(date);
    if (imageUrl != null) post.imageUrl = imageUrl;
    if (placeholder != null) post.placeholder = Boolean(placeholder);
    if (sortOrder != null) post.sortOrder = Number(sortOrder);

    await post.save();

    res.status(200).json({
      success: true,
      message: 'Blog post updated',
      data: toClient(post),
    });
  } catch (err) {
    next(err);
  }
};

// @DELETE /api/blog/:id
exports.deletePost = async (req, res, next) => {
  try {
    let post = await BlogPost.findOneAndDelete({ postId: req.params.id });
    if (!post) {
      post = await BlogPost.findByIdAndDelete(req.params.id).catch(() => null);
    }
    if (!post) {
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }
    res.status(200).json({ success: true, message: 'Blog post deleted' });
  } catch (err) {
    next(err);
  }
};
