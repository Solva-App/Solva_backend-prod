const Course = require('../models/Course');
const { Schema } = require('json-validace');
const CustomError = require('../helpers/error');
const { StatusCodes } = require('http-status-codes');
const image = require('../helpers/image');
const firebase = require('../helpers/firebase');

function normalizeMultipartBody(body = {}) {
  const normalized = {};

  for (const [key, value] of Object.entries(body || {})) {
    if (value === undefined || value === null) {
      normalized[key] = value;
      continue;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();

      if (trimmed === '') {
        normalized[key] = '';
        continue;
      }

      if (['true', 'false'].includes(trimmed.toLowerCase())) {
        normalized[key] = trimmed.toLowerCase() === 'true';
      } else if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
        normalized[key] = Number(trimmed);
      } else {
        normalized[key] = trimmed;
      }
    } else {
      normalized[key] = value;
    }
  }

  return normalized;
}

function getUploadedFiles(req, fieldName) {
  const files = [];

  if (req.file && req.file.fieldname === fieldName) {
    files.push(req.file);
  }

  if (!req.files) {
    return files;
  }

  if (Array.isArray(req.files)) {
    files.push(...req.files.filter((file) => file.fieldname === fieldName));
    return files;
  }

  if (typeof req.files === 'object') {
    const fieldFiles = req.files[fieldName];
    if (fieldFiles) {
      files.push(...(Array.isArray(fieldFiles) ? fieldFiles : [fieldFiles]));
    }
  }

  return files;
}

module.exports.createCourse = async function (req, res, next) {
  try {
    const schema = new Schema({
      name: {
        type: "string",
        required: true
      },
      category: {
        type: "string",
        required: true
      },
      difficulty: {
        type: "string",
        required: true
      },
      description: {
        type: "string",
        required: true
      },
      link: {
        type: "string",
        required: true
      },
      duration: {
        type: "string",
        required: false
      },
      isFree: {
        type: "boolean",
        required: false
      },
      price: {
        type: "number",
        required: false
      },
      discountPrice: {
        type: "number",
        required: false
      },
      status: {
        type: "string",
        required: false,
        enum: ["draft", "published"]
      },
      thumbnail: {
        type: "string",
        required: false
      },
      hasCertificate: {
        type: "boolean",
        required: true
      },
    });

    const body = normalizeMultipartBody(req.body);
    const thumbnailFiles = getUploadedFiles(req, 'thumbnail');

    const result = schema.validate(body);

    if (result.error) {
      return next(CustomError.badRequest("Invalid Request Body", result.error));
    }

    const data = result.data;

    if (!data.isFree && !data.price) {
      return next(CustomError.badRequest("price is required for paid courses"));
    }

    let thumbnailUrl = null;
    if (thumbnailFiles.length > 0) {
      const processedThumbnail = await image.modifyStringImageFile(thumbnailFiles[0]);
      const upload = await firebase.fileUpload(processedThumbnail, 'courses');
      if (upload instanceof CustomError) return next(upload);
      thumbnailUrl = upload;
    }

    const coursePayload = {
      name: data.name,
      category: data.category,
      difficulty: data.difficulty,
      description: data.description,
      link: data.link,
      duration: data.duration || null,
      isFree: data.isFree || true,
      price: data.isFree ? null : data.price,
      discountPrice: data.discountPrice || null,
      thumbnail: thumbnailUrl,
      status: data.status || 'draft',
      hasCertificate: data.hasCertificate || false
    };

    const course = await Course.create(coursePayload);

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
      hasCertificate: { type: "boolean", required: false },
    });

    const body = normalizeMultipartBody(req.body);
    const thumbnailFiles = getUploadedFiles(req, 'thumbnail');

    const result = schema.validate(body);

    if (result.error) {
      return next(CustomError.badRequest("Invalid Request Body", result.error));
    }

    const data = result.data;
    const course = await Course.findByPk(req.params.id);

    if (!course) {
      return next(CustomError.notFound("Course not found"));
    }

    const isFreeValue = data.isFree || course.isFree;
    const priceValue = data.price || course.price;

    if (!isFreeValue && !priceValue) {
      return next(CustomError.badRequest("price is required for paid courses"));
    }

    let thumbnailUrl = course.thumbnail;
    if (thumbnailFiles.length > 0) {
      if (course.thumbnail) {
        try {
          await firebase.deleteFile(course.thumbnail);
        } catch (err) {
          console.error("Failed to delete old course thumbnail:", err);
        }
      }

      const processedThumbnail = await image.modifyStringImageFile(thumbnailFiles[0]);
      const upload = await firebase.fileUpload(processedThumbnail, 'courses');
      if (upload instanceof CustomError) return next(upload);
      thumbnailUrl = upload;
    }

    const updatePayload = {
      name: data.name || course.name,
      category: data.category || course.category,
      difficulty: data.difficulty || course.difficulty,
      description: data.description || course.description,
      link: data.link || course.link,
      duration: data.duration || course.duration,
      isFree: isFreeValue,
      price: isFreeValue ? null : priceValue,
      discountPrice: data.discountPrice || course.discountPrice,
      status: data.status || course.status,
      thumbnail: thumbnailUrl || course.thumbnail,
      hasCertificate: data.hasCertificate || course.hasCertificate
    };

    await course.update(updatePayload);

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