const CustomError = require("../helpers/error");
const Project = require("../models/Project");
const Question = require("../models/Question");
const Document = require("../models/Document");
const { Op } = require("sequelize");
const { OK } = require("http-status-codes");

async function loadApprovedDocuments(model, modelId) {
  return await Document.findAll({
    where: {
      model,
      modelId,
      status: "approved",
      uploadedToUser: true,
      requiresApproval: false,
    },
  });
}

async function transformMaterial(record, modelName) {
  const documents = await loadApprovedDocuments(modelName, record.id);

  if (documents.length === 0) {
    return null;
  }

  return {
    type: modelName === "project" ? "project" : "question",
    id: record.id,
    item: record,
    documents,
  };
}

module.exports.getAllStudyMaterials = async function (req, res, next) {
  try {
    const search = req.query.search?.trim();
    const projectWhere = {};
    const questionWhere = {};

    if (search) {
      projectWhere[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];

      questionWhere[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { university: { [Op.like]: `%${search}%` } },
        { faculty: { [Op.like]: `%${search}%` } },
        { department: { [Op.like]: `%${search}%` } },
        { courseCode: { [Op.like]: `%${search}%` } },
      ];
    }

    const [projects, questions] = await Promise.all([
      Project.findAll({ where: projectWhere }),
      Question.findAll({ where: questionWhere }),
    ]);

    const materials = await Promise.all([
      ...projects.map((project) => transformMaterial(project, "project")),
      ...questions.map((question) => transformMaterial(question, "question")),
    ]);

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      data: materials.filter((material) => material !== null),
    });
  } catch (error) {
    return next({ error });
  }
};

module.exports.getStudyMaterial = async function (req, res, next) {
  try {
    const { id } = req.params;
    const modelType = req.query.model?.toLowerCase();
    let results = [];

    if (modelType && !["project", "question"].includes(modelType)) {
      return next(CustomError.badRequest('Query parameter "model" must be either "project" or "question"'));
    }

    if (!modelType || modelType === "project") {
      const project = await Project.findByPk(id);
      if (project) {
        const material = await transformMaterial(project, "project");
        if (material) {
          results.push(material);
        }
      }
    }

    if (!modelType || modelType === "question") {
      const question = await Question.findByPk(id);
      if (question) {
        const material = await transformMaterial(question, "question");
        if (material) {
          results.push(material);
        }
      }
    }

    if (results.length === 0) {
      return next(CustomError.notFound("Study material not found"));
    }

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      data: results.length === 1 ? results[0] : results,
    });
  } catch (error) {
    return next({ error });
  }
};
