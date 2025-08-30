const { Schema } = require("json-validace");
const CustomError = require("../helpers/error");
const image = require("./../helpers/image");
const firebase = require("./../helpers/firebase");
const User = require("../models/User");
const Document = require("../models/Document");
const { OK } = require("http-status-codes");
const Question = require("../models/Question");
const { Op } = require("sequelize");
const { sendNotification } = require("../services/notification");

module.exports.createPastQuestion = async function (req, res, next) {
  try {
    const schema = new Schema({
      title: { type: "string", required: true },
      department: { type: "string", required: true },
      university: { type: "string", required: true },
      department: { type: "string", required: true },
      courseCode: { type: "string", required: true },
      faculty: { type: "string", required: true },
      documents: { type: "array", required: true },
    });
    req.body.documents = [];

    let { user, body } = req;
    let files = {
      documents: [],
    };

    for (let file of req.files) {
      file = file;
      files[file.fieldname].push(
        await image.modifyStringImageFile(body[file.fieldname].length ? body[file.fieldname] : file)
      );
    }

    const result = schema.validate({ ...body, ...files });
    if (result.error) {
      return next(CustomError.badRequest("Invalid request body", result.error));
    }

    // upload cert to firebase or aws bucket
    for (const file of files.documents) {
      const upload = await firebase.fileUpload(file, file.fieldname);
      if (upload instanceof CustomError) {
        return next(upload);
      }
      console.log(file.mimetype, file)
      body[file.fieldname].push({
        size: file.size,
        url: upload,
        mimetype: file.mimetype,
        name: file.originalname
      });
    }

    const question = await Question.create({
      ...body,
      owner: req.user.id,
    });

    const documents = await Document.bulkCreate(
      body.documents.map((d) => {
        return {
          model: "question",
          owner: req.user.id,
          modelId: question.id,
          url: d.url,
          mimetype: d.mimetype,
          name: d.name,
          size: d.size,
          status: "awaiting-approval",
          requiresApproval: true,
        };
      })
    );

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "Question created successfully",
      data: {
        question,
        documents,
      },
    });
  } catch (error) {
    return next({ error });
  }
};

module.exports.getPastQuestions = async function (req, res, next) {
  try {
    const schema = new Schema({
      university: { type: "string", required: true },
      department: { type: "string", required: true },
      faculty: { type: "string", required: true },
    });

    let questions = await Question.findAll({
      where: { ...req.query },
    });

    const questionsWithDocsPromises = questions.map(async (question) => {
      const docs = await Document.findAll({
        where: {
          model: "question",
          modelId: question.id,
          status: "approved"
        }
      });

      // Only return the question if documents exist
      if (docs.length > 0) {
        return {
          question: question,
          document: docs
        };
      }
      return null;
    });

    let results = await Promise.all(questionsWithDocsPromises);

    results = results.filter(result => result !== null);

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      data: results,
    });
  } catch (error) {
    return next({ error });
  }
};

module.exports.getPastQuestion = async function (req, res, next) {
  try {
    const question = await Question.findByPk(req.params.id);

    if (!question) {
      return next(CustomError.badRequest("Question does not exist"));
    }

    const documents = await Document.findAll({
      where: {
        model: "question",
        modelId: req.params.id,
      }
    });

    // if (documents.length === 0) {
    //   return next(CustomError.notFound("No approved documents found for this question."));
    // }

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "Question fetched successfully",
      data: {
        question,
        documents: documents,
      },
    });
  } catch (error) {
    return next({ error });
  }
};

module.exports.deletePastQuestion = async function (req, res, next) {
  try {
    const question = await Question.findByPk(req.params.id);
    if (!question) {
      return next(CustomError.badRequest("Question does not exist"));
    }

    await Document.destroy({
      where: { model: "question", modelId: question.id }
    })

    await question.destroy();

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "Question and its documents deleted successfully",
    });
  } catch (error) {
    return next({ error });
  }
};

module.exports.approvePastQuestion = async function (req, res, next) {
  try {
    const schema = new Schema({
      title: { type: "string", required: true },
      department: { type: "string", required: true },
      university: { type: "string", required: true },
      department: { type: "string", required: true },
      courseCode: { type: "string", required: true },
      faculty: { type: "string", required: true },
      documents: { type: "array", required: false },
    });
    req.body.documents = [];

    let { body } = req;
    let files = {
      documents: [],
    };

    const result = schema.validate({ ...body, ...files });
    if (result.error) {
      return next(CustomError.badRequest("Invalid request body", result.error));
    }

    const question = await Question.findByPk(req.params.id);
    if (!question) {
      return next(CustomError.badRequest("Question does not exist"));
    }

    const updatedDocuments = await Document.update(
      {
        requiresApproval: false,
        status: "approved"
      },
      {
        where: {
          model: "question",
          modelId: question.id,
          status: "awaiting-approval"
        }
      }
    );

    if (updatedDocuments[0] === 0) {
      return next(CustomError.notFound("No documents awaiting approval for this question."));
    }

    question.requiresApproval = false;
    await question.save();

    const uploader = await User.findByPk(question.owner);
    if (!uploader) {
      return next(CustomError.badRequest("Uploader not found for this question"));
    }

    if (uploader.category === "premium") {
      uploader.balance += 100;
      await uploader.save();
    }

    await sendNotification({
      target: question.owner,
      title: "Question Approved",
      message: "Your question has been approved",
    });

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "Question approved successfully",
    });
  } catch (error) {
    return next({ error });
  }
};

module.exports.declinePastQuestion = async function (req, res, next) {
  try {
    const question = await Question.findByPk(req.params.id);
    if (!question) {
      return next(CustomError.notFound("Question does not exist"));
    }

    const updatedDocuments = await Document.update(
      {
        requiresApproval: false,
        status: "declined"
      },
      { where: { model: "question", modelId: question.id, status: "awaiting-approval" } }
    );

    if (updatedDocuments[0] === 0) {
      return next(CustomError.notFound("No documents awaiting approval for this question."));
    }

    question.requiresApproval = false;
    await question.save();

    const uploader = await User.findByPk(question.owner);
    if (!uploader) {
      return next(CustomError.badRequest("Uploader not found for this question"));
    }

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "Question and its documents declined successfully",
    });
  } catch (error) {
    return next({ error });
  }
};

module.exports.getAllPastQuestions = async function (req, res, next) {
  try {
    const questions = await Question.findAll();

    const questionsWithDocsPromises = questions.map(async (question) => {
      const docs = await Document.findAll({
        where: {
          model: "question",
          modelId: question.id,
        },
      });

      return {
        question,
        document: docs,
      };
    });

    const questionsWithDocs = await Promise.all(questionsWithDocsPromises);


    res.status(OK).json({
      success: true,
      status: res.statusCode,
      data: questionsWithDocs,
    })
  } catch (error) {
    return next({ error })
  }
}
