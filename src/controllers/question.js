const { Schema } = require("json-validace");
const CustomError = require("../helpers/error");
const image = require("./../helpers/image");
const firebase = require("./../helpers/firebase");
const Project = require("../models/Project");
const Document = require("../models/Document");
const { OK } = require("http-status-codes");
const Question = require("../models/Question");
const { Op } = require("sequelize");

module.exports.createPastQuestion = async function(req, res, next) {
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
               documents: undefined,
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

module.exports.getPastQuestions = async function(req, res, next) {
     try {
          const schema = new Schema({
               university: { type: "string", required: true },
               department: { type: "string", required: true },
               faculty: { type: "string", required: true },
          });

          let questions = await Question.findAll({
               where: { ...req.query },
          });

          questions = questions.map(async (question) => {
               const docs = await Document.findAll({ where: { model: "question", modelId: question.id , status: "approved" } });
               return {
                    question: question,
                    document: docs
               };
          });

          res.status(OK).json({
               success: true,
               status: res.statusCode,
               data: await Promise.all(questions),
          });
     } catch (error) {
          return next({ error });
     }
};

module.exports.getPastQuestion = async function(req, res, next) {
     try {
          const question = await Question.findByPk(req.params.id);
          if (!question) {
               return next(CustomError.badRequest("Question does not exist"));
          }

          const documents = await Document.findAll({ where: { model: "question", modelId: question.id, status: "approved" } });

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
