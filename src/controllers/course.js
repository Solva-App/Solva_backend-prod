const Course = require('../models/Course');
const { Schema } = require('json-validace');
const CustomError = require('../helpers/error');
const { StatusCodes } = require('http-status-codes');

module.exports.createCourse = async function (req, res, next) {
  try {
    const schema = new Schema({
      name: { type: "string", required: true },
      duration: { type: "string", required: false },
      isFree: { type: "boolean", required: false },
      cost: { type: "number", required: false },
      link: { type: "string", required: false },
    });

    const result = schema.validate(req.body);
    if (result.error) {
      return next(CustomError.badRequest("Invalid Request Body", result.error));
    }

    const body = result.data;

    if (!body.isFree && !body.cost) {
      return next(CustomError.badRequest("Cost is required for paid courses"));
    }

    const course = await Course.create({
      name: body.name,
      duration: body.duration || null,
      isFree: body.isFree !== undefined ? body.isFree : true,
      cost: body.isFree ? null : body.cost,
      link: body.link || null
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Course created successfully",
      data: course
    });
  } catch (error) {
    console.error('Course Controller Error:', error);
    return next(CustomError.internalServerError("Server error creating course", error));
  }
};

module.exports.getAllCourses = async function (req, res, next) {
  try {
    const courses = await Course.findAll({
      order: [['createdAt', 'DESC']]
    });

    res.status(StatusCodes.OK).json({ success: true, data: courses });
  } catch (error) {
    console.error('Course Controller Error:', error);
    return next(CustomError.internalServerError("Server error fetching courses", error));
  }
};

module.exports.getCourseById = async function (req, res, next) {
  try {
    const course = await Course.findByPk(req.params.id);

    if (!course) {
      return next(CustomError.notFound("Course not found"));
    }

    res.status(StatusCodes.OK).json({ success: true, data: course });
  } catch (error) {
    console.error('Course Controller Error:', error);
    return next(CustomError.internalServerError("Server error fetching course", error));
  }
};

module.exports.updateCourse = async function (req, res, next) {
  try {
    const schema = new Schema({
      name: { type: "string", required: false },
      duration: { type: "string", required: false },
      isFree: { type: "boolean", required: false },
      cost: { type: "number", required: false },
      link: { type: "string", required: false },
    });

    const result = schema.validate(req.body);
    if (result.error) {
      return next(CustomError.badRequest("Invalid Request Body", result.error));
    }

    const body = result.data;
    const course = await Course.findByPk(req.params.id);

    if (!course) {
      return next(CustomError.notFound("Course not found"));
    }

    const isFreeValue = body.isFree !== undefined ? body.isFree : course.isFree;
    if (!isFreeValue && !body.cost && !course.cost) {
      return next(CustomError.badRequest("Cost is required for paid courses"));
    }

    await course.update({
      name: body.name || course.name,
      duration: body.duration !== undefined ? body.duration : course.duration,
      isFree: isFreeValue,
      cost: isFreeValue ? null : (body.cost || course.cost),
      link: body.link !== undefined ? body.link : course.link
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Course updated successfully",
      data: course
    });
  } catch (error) {
    console.error('Course Controller Error:', error);
    return next(CustomError.internalServerError("Server error updating course", error));
  }
};

module.exports.deleteCourse = async function (req, res, next) {
  try {
    const course = await Course.findByPk(req.params.id);

    if (!course) {
      return next(CustomError.notFound("Course not found"));
    }

    await course.destroy();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Course deleted successfully"
    });
  } catch (error) {
    console.error('Course Controller Error:', error);
    return next(CustomError.internalServerError("Server error deleting course", error));
  }
};
