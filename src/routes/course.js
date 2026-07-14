const express = require('express');
const { auth, isAdmin } = require('../middlewares/auth');
const { fileParser } = require("../middlewares");

const router = express.Router();
const controllers = require('../controllers/course');

router.use(auth)
router.get('/', controllers.getAllCourses);
router.get('/:id', controllers.getCourseById);

router.use(isAdmin)
router.post('/', fileParser.single('profilePic'), controllers.createCourse);
router.patch('/:id', fileParser.single('profilePic'), controllers.updateCourse);
router.delete('/:id', controllers.deleteCourse);

module.exports = router;
