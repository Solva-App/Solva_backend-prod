const { Schema } = require("json-validace");
const CustomError = require("../helpers/error");
const image = require("./../helpers/image");
const firebase = require("./../helpers/firebase");
const Document = require("../models/Document");
const { OK } = require("http-status-codes");
const User = require("../models/User");

module.exports.uploadDocument = async function (req, res, next) {
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
    console.log(file);
    for (const file of files.documents) {
      const upload = await firebase.fileUpload(file, file.fieldname);
      if (upload instanceof CustomError) {
        return next(body.documents);
      }
      body[file.fieldname].push({
        size: file.size,
        url: upload,
        name: file.originalname,
        memetype: file.memetype,
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
          memetype: file.mimetype,
          name: file.originalname,
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

module.exports.approveDocument = async function (req, res, next) {
  try {
    const document = await Document.findOne({
      where: {
        id: req.params.docId,
        requiresApproval: true,
      },
    });

    if (!document) {
      return next(CustomError.badRequest("Invalid document id"));
    } else if (document.approved) {
      return next(CustomError.badRequest("Document already approved"));
    }

    const uploader = await User.findByPk(document.owner);
    if (!uploader) {
      return console.log("how is uploader not exiting");
    }

    const fee = 100;
    uploader.balance += uploader.balance;
    await uploader.save();

    document.status = "approved";
  } catch (error) {
    return next({ error });
  }
};

module.exports.getUploadedDocument = async function (req, res, next) {
  try {
    const documents = await Document.findAll({
      where: {
        requiresApproval: true,
        status: "awaiting-approval",
      },
    });

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      data: documents,
    });
  } catch (error) {
    return next({ error });
  }
};
