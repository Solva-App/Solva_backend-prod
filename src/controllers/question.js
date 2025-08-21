const { Schema } = require("json-validace");
const CustomError = require("../helpers/error");
const image = require("./../helpers/image");
const firebase = require("./../helpers/firebase");
const Project = require("../models/Project");
const User = require("../models/User");
const Document = require("../models/Document");
const { OK } = require("http-status-codes");
const Question = require("../models/Question");
const { Op } = require("sequelize");
const { sendNotification } = require("../services/notification");

module.exports.editPastQuestion = async function (req, res, next) {
  try {
    const schema = new Schema({
      title: { type: "string", required: true },
      department: { type: "string", required: true },
      university: { type: "string", required: true },
      courseCode: { type: "string", required: true },
      faculty: { type: "string", required: true }
    });

    const result = schema.validate(req.body);
    if (result.error) {
      return next(CustomError.badRequest("Invalid request body", result.error));
    }

    const question = await Question.findByPk(req.params.id);
    if (!question) {
      return next(CustomError.notFound("Question does not exist"));
    }

    const documents = await Document.findAll({
      where: {
        model: "question",
        modelId: question.id,
        status: "awaiting-approval"
      }
    });

    if (documents[0].status != "awaiting-approval") {
      return next(CustomError.notFound("This question has been approved"));
    }

    await question.update({
      owner: req.body.owner || documents[0].owner,
      title: req.body.title || question.title,
      department: req.body.department || question.department,
      university: req.body.university || question.university,
      faculty: req.body.faculty || question.faculty,
      courseCode: req.body.courseCode || question.courseCode,
    });

    const uploader = await User.findByPk(documents[0].owner);
    if (!uploader) {
      console.error(`Error: Uploader (ID: ${documents[0].owner}) for documents[0] (ID: ${documents[0].id}) not found.`);
      return next(CustomError.serverError("Uploader not found for this document. Cannot proceed."));
    }

    const fee = 100;
    if (uploader.category === "premium") {
      uploader.balance += fee;
    }
    await uploader.save();

    for (const document of documents) {
      document.status = "approved";
      await document.save();
    }

    await sendNotification({
      target: documents[0].owner,
      title: "Question Approved",
      message: "Your question has been approved",
    });

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "Question edited successfully",
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
        modelId: question.id,
        status: "approved" // Only fetch approved documents
      }
    });

    if (documents.length === 0) {
      return next(CustomError.notFound("No approved documents found for this question."));
    }

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

// module.exports.approvePastQuestion = async function(req, res, next) {
//     try {
//         const question = await Question.findByPk(req.params.id);
//         if (!question) {
//             return next(CustomError.badRequest("Question does not exist"));
//         }

//         const updatedDocuments = await Document.update(
//             { status: "approved" },
//             { where: { model: "question", modelId: question.id, status: "awaiting-approval" } }
//         );

//         if (updatedDocuments[0] === 0) {
//             return next(CustomError.notFound("No documents awaiting approval for this question."));
//         }

//         const uploader = await User.findByPk(question.owner);
//         if (!uploader) {
//             return next(CustomError.badRequest("Uploader not found for this question"));
//         }

//         uploader.balance += 100;
//         await uploader.save();

//         res.status(OK).json({
//             success: true,
//             status: res.statusCode,
//             message: "Question and its documents approved successfully",
//         });
//     } catch (error) {
//         return next({ error });
//     }
// };

// module.exports.declinePastQuestion = async function(req, res, next) {
//     try {
//         const question = await Question.findByPk(req.params.id);
//         if (!question) {
//             return next(CustomError.badRequest("Question does not exist"));
//         }

//         const updatedDocuments = await Document.update(
//             { status: "declined" },
//             { where: { model: "question", modelId: question.id, status: "awaiting-approval" } }
//         );

//         if (updatedDocuments[0] === 0) {
//             return next(CustomError.notFound("No documents awaiting approval for this question."));
//         }

//         const uploader = await User.findByPk(question.owner);
//         if (!uploader) {
//             return next(CustomError.badRequest("Uploader not found for this question"));
//         }

//         uploader.balance += 100;
//         await uploader.save();

//         res.status(OK).json({
//             success: true,
//             status: res.statusCode,
//             message: "Question and its documents declined successfully",
//         });
//     } catch (error) {
//         return next({ error });
//     }
// };

// module.exports.deletePastQuestion = async function(req, res, next) {
//     try {
//         const question = await Question.findByPk(req.params.id);
//         if (!question) {
//             return next(CustomError.badRequest("Question does not exist"));
//         }

//         await Document.destroy({
//             where: { model: "question", modelId: question.id }
//         })

//         await question.destroy();

//         res.status(OK).json({
//             success: true,
//             status: res.statusCode,
//             message: "Question and its documents deleted successfully",
//         });
//     } catch (error) {
//         return next({ error });
//     }
// };

