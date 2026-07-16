const Course = require('../models/Course');
const { Schema } = require('json-validace');
const CustomError = require('../helpers/error');
const { StatusCodes } = require('http-status-codes');

module.exports.createCourse = async function (req, res, next) {
  try {
    const schema = new Schema({
      name: { type: "string", required: true },
      category: { type: "string", required: true },
      difficulty: { type: "string", required: true },
      description: { type: "string", required: true },
      link: { type: "string", required: true },
      duration: { type: "string", required: false },
      isFree: { type: "boolean", required: false },
      price: { type: "number", required: false },
      discountPrice: { type: "number", required: false },
      status: { type: "string", required: false, enum: ["draft", "published"] },
      thumbnail: { type: "string", required: false },
      hasCertificate: { type: "boolean", required: true },
    });

    req.body.thumbnail = null;
    let { body } = req;
    let files = { thumbnail: [] };

    if (req.files && req.files.length > 0) {
      for (let file of req.files) {
        if (file.fieldname === 'thumbnail') {
          files[file.fieldname].push(
            await image.modifyStringImageFile(body['thumbnail']?.length ? body[file.fieldname] : file)
          );
        }
      }
    }

    const result = schema.validate({ ...body, ...files });
    if (result.error) {
      return next(CustomError.badRequest("Invalid Request Body", result.error));
    }

    const data = result.data;

    if (!data.isFree && !data.price) {
      return next(CustomError.badRequest("price is required for paid courses"));
    }

    let thumbnailUrl = null;
    if (files.thumbnail.length > 0) {
      const upload = await firebase.fileUpload(files.thumbnail[0], 'courses');
      if (upload instanceof CustomError) return next(upload);
      thumbnailUrl = upload;
    }

    const course = await Course.create({
      name: data.name,
      category: data.category,
      difficulty: data.difficulty,
      description: data.description,
      link: data.link,
      duration: data.duration || null,
      isFree: data.isFree !== undefined ? data.isFree : true,
      price: data.isFree ? null : data.price,
      discountPrice: data.discountPrice || 0,
      thumbnail: thumbnailUrl,
      status: data.status || 'draft'
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Course created successfully",
      data: course
    });
  } catch (error) {
    return next(error);
  }
};

module.exports.getAllCourses = async function (req, res, next) {
  try {
    const queryConditions = {};

    if (req.user.category !== 'admin') {
      queryConditions.status = 'published';
    }

    const courses = await Course.findAll({
      where: queryConditions,
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
    const queryConditions = { id: req.params.id };

    if (req.user.category !== 'admin') {
      queryConditions.status = 'published';
    }

    const course = await Course.findOne({ where: queryConditions });

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
      category: { type: "string", required: false },
      difficulty: { type: "string", required: false },
      description: { type: "string", required: false },
      link: { type: "string", required: false },
      duration: { type: "string", required: false },
      isFree: { type: "boolean", required: false },
      price: { type: "number", required: false },
      discountPrice: { type: "number", required: false },
      status: { type: "string", required: false, enum: ["draft", "published"] },
      thumbnail: { type: "string", required: false },
      hasCertificate: { type: "boolean", required: true },
    });

    let { body } = req;
    let files = { thumbnail: [] };

    if (req.files && req.files.length > 0) {
      for (let file of req.files) {
        if (file.fieldname === 'thumbnail') {
          files[file.fieldname].push(
            await image.modifyStringImageFile(file)
          );
        }
      }
    }

    const result = schema.validate({ ...body, ...files });
    if (result.error) {
      return next(CustomError.badRequest("Invalid Request Body", result.error));
    }

    const data = result.data;
    const course = await Course.findByPk(req.params.id);

    if (!course) {
      return next(CustomError.notFound("Course not found"));
    }

    const isFreeValue = data.isFree !== undefined ? data.isFree : course.isFree;
    if (!isFreeValue && !data.price && !course.price) {
      return next(CustomError.badRequest("price is required for paid courses"));
    }

    let thumbnailUrl = course.thumbnail;
    if (files.thumbnail.length > 0) {
      if (course.thumbnail) {
        try {
          await firebase.deleteFile(course.thumbnail);
        } catch (err) {
          console.error("Failed to delete old course thumbnail:", err);
        }
      }
      const upload = await firebase.fileUpload(files.thumbnail[0], 'courses');
      if (upload instanceof CustomError) return next(upload);
      thumbnailUrl = upload;
    }

    await course.update({
      name: data.name || course.name,
      category: data.category || course.category,
      difficulty: data.difficulty || course.difficulty,
      description: data.description || course.description,
      link: data.link || course.link,
      duration: data.duration !== undefined ? data.duration : course.duration,
      isFree: isFreeValue,
      price: isFreeValue ? null : (data.price || course.price),
      discountPrice: data.discountPrice !== undefined ? data.discountPrice : course.discountPrice,
      status: data.status || course.status,
      thumbnail: thumbnailUrl
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Course updated successfully",
      data: course
    });
  } catch (error) {
    return next(error);
  }
};

module.exports.deleteCourse = async function (req, res, next) {
  try {
    const course = await Course.findByPk(req.params.id);

    if (!course) {
      return next(CustomError.notFound("Course not found"));
    }

    const thumbnailToClear = course.thumbnail;

    await course.destroy();
    if (thumbnailToClear) {
      try {
        await firebase.deleteFile(thumbnailToClear);
      } catch (firebaseError) {
        console.error("Failed to delete course thumbnail from Firebase:", firebaseError);
      }
    }

    res.status(StatusCodes.OK).json({
      success: true,
      status: res.statusCode,
      message: "Course and its associated media deleted successfully"
    });
  } catch (error) {
    return next(error);
  }
};
