const express = require('express');
const { auth, isAdmin } = require('../middlewares/auth');
const router = express.Router();
const controllers = require('../controllers/course');

router.use(auth)
router.get('/', controllers.getAllCourses);
router.get('/:id', controllers.getCourseById);

router.use(isAdmin)
router.post('/', controllers.createCourse);
router.patch('/:id', controllers.updateCourse);
router.delete('/:id', controllers.deleteCourse);

module.exports = router;
