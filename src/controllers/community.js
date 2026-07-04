const CustomError = require('../helpers/error');
const { Schema } = require('json-validace');
const { OK } = require('http-status-codes');
const { Op, fn, col, where } = require('sequelize');
const Post = require('../models/Post');
const PostComment = require('../models/PostComment');
const PostLike = require('../models/PostLike');
const CommentLike = require('../models/PostCommentLike');
const Hashtag = require('../models/Hashtag');
const firebase = require('../helpers/firebase');
const { sequelize } = require('../database/db')

module.exports.getPosts = async function (req, res, next) {
  try {
    const where = {};
    if (req.query.search) {
      where.content = { [Op.like]: `%${req.query.search}%` };
    }
    const posts = await Post.findAll({ where, order: [['createdAt', 'DESC']] });
    const userId = req.user.id;
    let postsWithLike = posts;
    const postIds = posts.map((p) => p.id);
    const likes = await PostLike.findAll({ where: { userId, postId: { [Op.in]: postIds } } });
    const likedSet = new Set(likes.map((l) => l.postId));
    postsWithLike = posts.map((p) => {
      const postData = p.toJSON();
      return {
        ...postData,
        liked: likedSet.has(p.id),
        hashtags: typeof postData.hashtags === 'string' ? JSON.parse(postData.hashtags) : postData.hashtags,
      };
    });
    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'Posts fetched successfully',
      data: postsWithLike,
    });
  } catch (error) {
    return next({ error });
  }
};

module.exports.getPost = async function (req, res, next) {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) return next(CustomError.notFound('Post not found'));
    const userId = req.user.id;
    let liked = false;
    if (userId) {
      const existing = await PostLike.findOne({ where: { userId, postId: post.id } });
      liked = !!existing;
    }

    const postData = post.toJSON ? post.toJSON() : post;
    const normalizedPost = {
      ...postData,
      hashtags: typeof postData.hashtags === 'string' ? JSON.parse(postData.hashtags) : postData.hashtags,
    };

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'Post fetched successfully',
      data: { post: normalizedPost, liked },
    });
  } catch (error) {
    return next({ error });
  }
};


module.exports.getHashtags = async function (req, res, next) {
  try {
    const hashtags = await Hashtag.findAll({ order: [['postsCount', 'DESC']] });
    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'Hashtags fetched successfully',
      data: hashtags,
    });
  } catch (error) {
    return next({ error });
  }
};

module.exports.getTrendingHashtags = async function (req, res, next) {
  try {
    const hashtags = await Hashtag.findAll({ order: [['postsCount', 'DESC']], limit: 5 });
    res.status(OK).json({ success: true, status: res.statusCode, data: hashtags });
  } catch (error) {
    return next({ error });
  }
};

module.exports.getHashtag = async function (req, res, next) {
  try {
    const hashtagName = req.params.name.startsWith('#') ? req.params.name : `#${req.params.name}`;
    const hashtag = await Hashtag.findOne({ where: { name: hashtagName } });
    if (!hashtag) return next(CustomError.notFound('Hashtag not found'));
    const posts = await Post.findAll({
      where: where(fn('JSON_CONTAINS', col('hashtags'), JSON.stringify([hashtag.name])), 1),
      order: [['createdAt', 'DESC']],
    });
    res.status(OK).json({ success: true, status: res.statusCode, data: { hashtag, postsCount: posts.length, posts } });
  } catch (error) {
    return next({ error });
  }
};

module.exports.createPost = async function (req, res, next) {
  try {
    const schema = new Schema({
      content: { type: 'string', required: true },
      media: { type: 'string', required: false },
      hashtags: { type: 'array', required: false, items: { type: 'string' } },
      campus: { type: 'string', required: false },
    });

    const result = schema.validate(req.body);
    if (result.error) {
      return next(CustomError.badRequest('Invalid request body', result.error));
    }

    let media = null;
    const file = req.file || (Array.isArray(req.files?.media) ? req.files.media[0] : req.files?.media);

    if (file) {
      const upload = await firebase.fileUpload(file, 'posts');
      if (upload instanceof CustomError) {
        return next(upload);
      }
      media = upload;
    }

    const { content, hashtags: rawHashtags, campus } = result.data;

    let processedHashtags = [];

    if (rawHashtags && rawHashtags.length > 0) {
      processedHashtags = [...new Set(rawHashtags
        .filter((tag) => typeof tag === 'string' && tag.trim())
        .map((tag) => {
          const cleanTag = tag.trim().toLowerCase();
          return cleanTag.startsWith('#') ? cleanTag : `#${cleanTag}`;
        })
      )];
    }

    const post = await Post.create({
      userId: req.user.id,
      username: req.user.fullName,
      profilePic: req.user.profilePic || null,
      campus: (campus && campus.trim()) || '',
      content: content.trim(),
      mediaUrl: media,
      hashtags: processedHashtags,
    });

    if (processedHashtags.length > 0) {
      for (const tag of processedHashtags) {
        const [hashtag, created] = await Hashtag.findOrCreate({
          where: { name: tag },
          defaults: { postsCount: 1 }
        });

        if (!created) {
          await hashtag.increment('postsCount', { by: 1 });
        }
      }
    }

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'Post created successfully',
      data: post,
    });
  } catch (error) {
    return next({ error });
  }
};

module.exports.deletePost = async function (req, res, next) {
  const t = await sequelize.transaction();

  try {
    const post = await Post.findByPk(req.params.id, { transaction: t });

    if (!post) {
      await t.rollback();
      return next(CustomError.notFound('Post not found'));
    }

    if (post.userId != req.user.id) {
      await t.rollback();
      return next(CustomError.badRequest('Unauthorized to delete this post'));
    }

    const comments = await PostComment.findAll({
      where: { postId: post.id },
      attributes: ['id'],
      transaction: t
    });
    const commentIds = comments.map((c) => c.id);

    if (commentIds.length > 0) {
      await CommentLike.destroy({
        where: { postCommentId: { [Op.in]: commentIds } },
        transaction: t
      });
    }

    await PostComment.destroy({ where: { postId: post.id }, transaction: t });
    await PostLike.destroy({ where: { postId: post.id }, transaction: t });

    const hashtags = Array.isArray(post.hashtags)
      ? post.hashtags
      : (typeof post.hashtags === 'string' ? JSON.parse(post.hashtags) : []);

    if (hashtags.length > 0) {
      for (const tag of hashtags) {
        const hashtag = await Hashtag.findOne({ where: { name: tag }, transaction: t });
        if (hashtag) {
          const newCount = Math.max(0, hashtag.postsCount - 1);
          if (newCount === 0) {
            await hashtag.destroy({ transaction: t });
          } else {
            await hashtag.update({ postsCount: newCount }, { transaction: t });
          }
        }
      }
    }

    const mediaUrl = post.mediaUrl;

    await post.destroy({ transaction: t });

    await t.commit();

    if (mediaUrl) {
      try {
        await firebase.deleteFile(mediaUrl);
      } catch (firebaseError) {
        console.error("Failed to delete media from Firebase:", firebaseError);
      }
    }

    return res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'Post deleted successfully'
    });

  } catch (error) {
    if (!t.finished) {
      await t.rollback();
    }
    return next({ error });
  }
};

module.exports.likePost = async function (req, res, next) {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) return next(CustomError.notFound('Post not found'));

    const existing = await PostLike.findOne({ where: { userId: req.user.id, postId: post.id } });
    if (existing) return next(CustomError.badRequest('Post already liked'));

    await PostLike.create({ userId: req.user.id, postId: post.id });
    post.likes += 1;
    await post.save();

    res.status(OK).json({ success: true, status: res.statusCode, message: 'Post liked', data: { likes: post.likes } });
  } catch (error) {
    return next({ error });
  }
};

module.exports.unlikePost = async function (req, res, next) {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) return next(CustomError.notFound('Post not found'));
    const existing = await PostLike.findOne({ where: { userId: req.user.id, postId: post.id } });
    if (!existing) return next(CustomError.badRequest('Post not liked yet'));

    await existing.destroy();
    post.likes = Math.max(0, post.likes - 1);
    await post.save();

    res.status(OK).json({ success: true, status: res.statusCode, message: 'Post unliked', data: { likes: post.likes } });
  } catch (error) {
    return next({ error });
  }
};

module.exports.createComment = async function (req, res, next) {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) return next(CustomError.notFound('Post not found'));

    const schema = new Schema({
      content: { type: 'string', required: true },
    });

    const result = schema.validate(req.body);
    if (result.error) {
      return next(CustomError.badRequest('Invalid request body', result.error));
    }

    const comment = await PostComment.create({
      content: result.data.content.trim(),
      userId: req.user.id,
      username: req.user.fullName,
      profilePic: req.user.profilePic || null,
      postId: post.id,
    });

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'Comment added successfully',
      data: comment,
    });
  } catch (error) {
    return next({ error });
  }
};

module.exports.likeComment = async function (req, res, next) {
  try {
    const comment = await PostComment.findByPk(req.params.id);
    if (!comment) return next(CustomError.notFound('Comment not found'));

    const existing = await CommentLike.findOne({ where: { userId: req.user.id, postCommentId: comment.id } });
    if (existing) return next(CustomError.badRequest('Comment already liked'));

    await CommentLike.create({ userId: req.user.id, postCommentId: comment.id });
    comment.likes += 1;
    await comment.save();

    res.status(OK).json({ success: true, status: res.statusCode, message: 'Comment liked', data: { likes: comment.likes } });
  } catch (error) {
    return next({ error });
  }
};

module.exports.unlikeComment = async function (req, res, next) {
  try {
    const comment = await PostComment.findByPk(req.params.id);
    if (!comment) return next(CustomError.notFound('Comment not found'));

    const existing = await CommentLike.findOne({ where: { userId: req.user.id, postCommentId: comment.id } });
    if (!existing) return next(CustomError.badRequest('Comment not liked yet'));

    await existing.destroy();
    comment.likes = Math.max(0, comment.likes - 1);
    await comment.save();

    res.status(OK).json({ success: true, status: res.statusCode, message: 'Comment unliked', data: { likes: comment.likes } });
  } catch (error) {
    return next({ error });
  }
};

module.exports.getComments = async function (req, res, next) {
  try {
    const comments = await PostComment.findAll({ where: { postId: req.params.id }, order: [['createdAt', 'ASC']] });
    const userId = req.user.id;

    let commentsWithLike = comments;
    if (userId) {
      const commentIds = comments.map((c) => c.id);
      const likes = await CommentLike.findAll({ where: { userId, postCommentId: { [Op.in]: commentIds } } });
      const likedSet = new Set(likes.map((l) => l.postCommentId));
      commentsWithLike = comments.map((c) => ({ ...c.toJSON(), liked: likedSet.has(c.id) }));
    } else {
      commentsWithLike = comments.map((c) => ({ ...c.toJSON(), liked: false }));
    }

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'Comments fetched successfully',
      data: commentsWithLike,
    });
  } catch (error) {
    return next({ error });
  }
};