const { Schema } = require("json-validace");
const CustomError = require("../helpers/error");
const image = require("./../helpers/image");
const firebase = require("./../helpers/firebase");
const Document = require("../models/Document");
const { OK } = require("http-status-codes");
const User = require("../models/User");
const Project = require("../models/Project");
const Question = require("../models/Question");
const { sendNotification } = require("../services/notification");

module.exports.uploadDocument = async function (req, res, next) {
  try {
    const schema = new Schema({
      documents: { type: "array", required: true },
      dropdown: { type: "string", required: true },
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

    let modelId;

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

    let project;
    let question;

    if (body.dropdown === "project") {
      project = await Project.create({
        owner: req.user.id,
        requiresApproval: true,
      });
      modelId = project.id;
    } else if (body.dropdown === "question") {
      question = await Question.create({
        owner: req.user.id,
        requiresApproval: true,
      });
      modelId = question.id;
    }

    const documents = await Document.bulkCreate(
      body.documents.map((d) => {
        return {
          model: body.dropdown,
          modelId,
          owner: req.user.id,
          url: d.url,
          size: d.size,
          status: "awaiting-approval",
          mimetype: d.mimetype,
          name: d.name,
        };
      })
    );

    await sendNotification({
      target: [req.user.id],
      title: "Uploads Received",
      message: "You will get a response within 3 days",
    });

    // let data;
    // if (body.dropdown === "project") {
    //   data = {
    //     project: await Project.findByPk(modelId),
    //     documents,
    //   };
    // } else if (body.dropdown === "question") {
    //   data = {
    //     question: await Question.findByPk(modelId),
    //     documents,
    //   };
    // }

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "document created successfully",
      data: body.dropdown === "project" ? { project, documents } : { question, documents },
    });

    body = null;
  } catch (error) {
    return next({ error });
  }
};

module.exports.deleteDocument = async function (req, res, next) {
  try {
    const document = await Document.findByPk(req.params.docId);
    if (!document) {
      return next(CustomError.badRequest("Document does not exist"));
    }

    await document.destroy();

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "Document deleted successfully",
    });
  } catch (error) {
    return next({ error });
  }
};

module.exports.approveDocument = async function (req, res, next) {
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
    if (uploader.category === "premium") {
      uploader.balance += fee;
    }
    await uploader.save();

    document.status = "approved";
    document.requiresApproval = false;
    await document.save();

    await sendNotification({
      target: [document.owner],
      title: "Question Approved",
      message: "Your question has been approved",
    });

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "Document approved successfully.",
      data: {
        document: document,
        uploaderBalance: uploader.balance
      },
    });
  } catch (error) {
    return next({ error });
  }
};

module.exports.declineDocument = async function (req, res, next) {
  try {
    const document = await Document.findByPk(req.params.docId);
    if (!document) {
      return next(CustomError.notFound("Document does not exist"));
    }

    document.status = "declined";
    await document.save();

    const uploader = await User.findByPk(document.owner);
    if (!uploader) {
      return next(CustomError.badRequest("Uploader not found for this document"));
    }

    uploader.balance += 100;
    await uploader.save();

    await sendNotification({
      target: [document.owner],
      title: "Document Declined",
      message: "Your document has been declined",
    });

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "Document declined successfully.",
      data: {
        document: document,
        uploaderBalance: uploader.balance
      },
    });
  } catch (error) {
    return next({ error });
  }
};

module.exports.getAllUploadedDocuments = async function (req, res, next) {
  try {
    const document = await Document.findAll();

    res.status(OK).json({
      data: document,
    });
  } catch (error) {
    return next({ error });
  }
};

module.exports.getUploadedDocuments = async function (req, res, next) {
  try {
    const document = await Document.findByPk(req.params.docId);
    if (!document) {
      return next(CustomError.notFound("Document does not exist"));
    }
    res.status(OK).json({
      data: document,
    });
  } catch (error) {
    return next({ error });
  }
};
