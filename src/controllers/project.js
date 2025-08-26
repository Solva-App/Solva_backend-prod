const { Schema } = require('json-validace')
const CustomError = require('../helpers/error')
const image = require('./../helpers/image')
const firebase = require('./../helpers/firebase')
const Project = require('../models/Project')
const Document = require('../models/Document')
const User = require('../models/User')
const { OK } = require('http-status-codes')
const { Op } = require('sequelize')
const { sendNotification } = require("../services/notification");

// create
module.exports.createProject = async function (req, res, next) {
  try {
    const schema = new Schema({
      name: { type: 'string', required: true },
      description: { type: 'string', required: true },
      documents: { type: 'array', required: false },
    })
    req.body.documents = []

    let { body } = req
    let files = {
      documents: [],
    }

    for (let file of req.files) {
      file = file
      files[file.fieldname].push(await image.modifyStringImageFile(body[file.fieldname].length ? body[file.fieldname] : file))
    }

    const result = schema.validate({ ...body, ...files })
    if (result.error) {
      return next(CustomError.badRequest('Invalid request body', result.error))
    }

    // upload cert to firebase or aws bucket
    for (const file of files.documents) {
      const upload = await firebase.fileUpload(file, file.fieldname)
      if (upload instanceof CustomError) {
        return next(body.documents)
      }
      body[file.fieldname].push({
        size: file.size,
        url: upload,
        name: file.originalname,
        mimetype: file.mimetype
      })
    }

    const project = await Project.create({
      name: body.name,
      owner: req.user.id,
      description: body.description,
    })

    const documents = await Document.bulkCreate(
      body.documents.map((d) => {
        return {
          model: 'project',
          owner: req.user.id,
          modelId: project.id,
          url: d.url,
          size: d.size,
          name: d.name,
          mimetype: d.mimetype,
          requiresApproval: false,
          status: 'approved',
        }
      })
    )

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'Project created successfully',
      data: {
        project,
        documents,
      },
    })
  } catch (error) {
    return next({ error })
  }
}

module.exports.getProjects = async function (req, res, next) {
  try {
    let body;

    if (req.query.search) {
      body = {
        where: {
          // ...req.body.filter,
          [Op.or]: [{ name: { [Op.like]: `%${req.query.search}%` } }, { description: { [Op.like]: `%${req.query.search}%` } }],
        },
      }
    } else {
      body = {}
    }

    let projects = await Project.findAll(body)

    const projectsWithDocsPromises = projects.map(async (project) => {
      const docs = await Document.findAll({
        where: {
          model: "project",
          modelId: project.id,
          status: "approved"
        }
      });

      // Only return the project if documents exist
      if (docs.length > 0) {
        return {
          project: project,
          document: docs
        };
      }
      return null;
    });

    let results = await Promise.all(projectsWithDocsPromises);

    results = results.filter(result => result !== null);

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      data: results,
    })
  } catch (error) {
    return next({ error })
  }
}

module.exports.getProject = async function (req, res, next) {
  try {
    const project = await Project.findByPk(req.params.id)

    if (!project) {
      return next(CustomError.notFound('Project not found'));
    }

    const documents = await Document.findAll({
      where: {
        model: 'project',
        modelId: req.params.id
      }
    })

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      data: {
        project,
        documents,
      },
    })
  } catch (error) {
    return next({ error })
  }
}

module.exports.deleteProject = async function (req, res, next) {
  try {
    const project = await Project.findByPk(req.params.id)

    if (!project) {
      return next(CustomError.notFound('Project not found'))
    }

    await Document.destroy({
      where: { model: "project", modelId: project.id }
    })

    await project.destroy()

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "Project deleted successfully",
    })
  } catch (error) {
    return next({ error })
  }
}
module.exports.approveProject = async function (req, res, next) {
  try {
    const schema = new Schema({
      name: { type: 'string', required: true },
      description: { type: 'string', required: true },
      documents: { type: 'array', required: false },
    })

    req.body.documents = []

    let { body } = req
    let files = {
      documents: [],
    }

    const result = schema.validate({ ...body, ...files })
    if (result.error) {
      return next(CustomError.badRequest('Invalid request body', result.error))
    }

    const project = await Project.findByPk(req.params.id)

    if (!project) {
      return next(CustomError.notFound('Project not found'))
    }

    const updatedDocuments = await Document.update(
      { status: "approved" },
      {
        where: {
          model: "project",
          modelId: project.id,
          status: "awaiting-approval"
        }
      }
    );

    if (updatedDocuments[0] === 0) {
      return next(CustomError.notFound("No documents awaiting approval for this question."));
    }

    const uploader = await User.findByPk(project.owner);
    if (!uploader) {
      return next(CustomError.badRequest("Uploader not found for this question"));
    }

    if (uploader.category === "premium") {
      uploader.balance += 100;
      await uploader.save();
    }

    await sendNotification({
      target: project.owner,
      title: "Project Approved",
      message: "Your project has been approved",
    });

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "Project approved successfully",
    })
  } catch (error) {
    return next({ error })
  }
}

module.exports.declineProject = async function (req, res, next) {
  try {
    const project = await Project.findByPk(req.params.id)

    if (!project) {
      return next(CustomError.notFound('Project not found'))
    }

    const updatedDocuments = await Document.update(
      { status: "declined" },
      {
        where: {
          model: "project",
          modelId: project.id,
          status: "awaiting-approval"
        }
      }
    );

    if (updatedDocuments[0] === 0) {
      return next(CustomError.notFound("No documents awaiting approval for this project."));
    }

    const uploader = await User.findByPk(project.owner);
    if (!uploader) {
      return next(CustomError.badRequest("Uploader not found for this project"));
    }

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "Project declined successfully",
    })
  } catch (error) {
    return next({ error })
  }
}

module.exports.getAllProjects = async function (req, res, next) {
  try {
    const projects = await Project.findAll();

    const projectsWithDocsPromises = projects.map(async (project) => {
      const docs = await Document.findAll({
        where: {
          model: "project",
          modelId: project.id,
        },
      });

      return {
        project,
        document: docs,
      };
    });

    const projectsWithDocs = await Promise.all(projectsWithDocsPromises);

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      data: projectsWithDocs,
    });
  } catch (error) {
    return next({ error });
  }
}
