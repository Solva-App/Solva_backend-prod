const router = require('express').Router();
const { auth } = require('../middlewares/auth');
const controllers = require('../controllers/community');
const { fileParser } = require('../middlewares')

router.use(auth);
router.get('/posts', controllers.getPosts);
router.get('/posts/:id', controllers.getPost);
router.delete('/posts/:id', controllers.deletePost);
router.get('/hashtags', controllers.getHashtags);
router.get('/hashtags/trending', controllers.getTrendingHashtags);
router.get('/hashtags/:name', controllers.getHashtag);
router.post('/posts', fileParser.array('media', 10), controllers.createPost);
router.post('/posts/:id/like', controllers.likePost);
router.delete('/posts/:id/like', controllers.unlikePost);
router.get('/posts/:id/comments', controllers.getComments);
router.post('/posts/:id/comments', controllers.createComment);
router.post('/posts/comments/:id/like', controllers.likeComment);
router.delete('/posts/comments/:id/like', controllers.unlikeComment);

module.exports = router;
