const router = require('express').Router()
const controllers = require("./../controllers/chat");

const { auth } = require("../middlewares/auth");

router.use(auth);

router.get('/:id', controllers.getUserChats);
router.post('/', controllers.handleChat);

module.exports = router;
