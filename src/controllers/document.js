const { Schema } = require("json-validace");
const CustomError = require("../helpers/error");
const image = require("./../helpers/image");
const firebase = require("./../helpers/firebase");
const Document = require("../models/Document");
const { OK } = require("http-status-codes");
const User = require("../models/User");
const { sendNotification } = require("../services/notification");

module.exports.uploadDocument = async function(req, res, next) {
     try {
          const schema = new Schema({
               documents: { type: "array", required: true },
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
                    return next(body.documents);
               }
               body[file.fieldname].push({
                    size: file.size,
                    url: upload,
                    name: file.originalname,
                    mimetype: file.mimetype,
               });
          }

          const documents = await Document.bulkCreate(
               body.documents.map((d) => {
                    return {
                         model: req.param.filetype,
                         owner: req.user.id,
                         // modelId: ,
                         url: d.url,
                         size: d.size,
                         status: "awaiting-approval",
                         mimetype: d.mimetype,
                         name: d.name,
                    };
               })
          );

          res.status(OK).json({
               success: true,
               status: res.statusCode,
               message: "document created successfully",
               data: documents,
          });

          body = null;
     } catch (error) {
          return next({ error });
     }
};

module.exports.approveDocument = async function(req, res, next) {
     try {
          const document = await Document.findOne({
            where: {
                id: req.params.docId,
                requiresApproval: true,
                status: "awaiting-approval"
            },
        });

        if (!document) {
            return next(CustomError.badRequest("Document not found, does not require approval, or is already processed."));
        }

        const uploader = await User.findByPk(document.owner);
        if (!uploader) {
            console.error(`Error: Uploader (ID: ${document.owner}) for document (ID: ${document.id}) not found.`);
            return next(CustomError.serverError("Uploader not found for this document. Cannot proceed."));
        }

        const fee = 100;
        uploader.balance += fee;
        await uploader.save();

        document.status = "approved";
        await document.save();

                  await sendNotification({
      target: req.user.id,
      title : "Question Approved",
      message: "Your question has been approved. You have been credited 100 points.",
    });

        res.status(OK).json({
            success: true,
            status: res.statusCode,
            message: "Document approved successfully and uploader credited.",
            data: {
                document: document,
                uploaderBalance: uploader.balance
            },
        });
     } catch (error) {
          return next({ error });
     }
};

module.exports.getUploadedDocument = async function(req, res, next) {
     try {
          const document = await Document.findAll({
               where: {
                    requiresApproval: true,
                    status: "awaiting-approval",
               },
          });

          res.status(OK).json({
               data: document,
          });
     } catch (error) {
          return next({ error });
     }
};
