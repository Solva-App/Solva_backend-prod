const { Schema } = require("json-validace");
const Job = require("../models/Job");
const { OK } = require("http-status-codes");
const CustomError = require("../helpers/error");

module.exports.createJob = async function (req, res, next) {
  try {
    const schema = new Schema({
      title: { type: "string", required: true },
      status: { type: "array", required: true },
      description: { type: "string", required: true },
    });

    const result = schema.validate(req.body);
    if (result.error) {
      return next(CustomError.badRequest("Invalid request body", result.error));
    }

    const job = await Job.create({
      owner: req.user.id,
      status: req.body.status,
      title: req.body.title,
      description: req.body.description,
    });

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "job created successfully",
      data: job,
    });
  } catch (error) {
    return next({ error });
  }
};

module.exports.getJobs = async function (req, res, next) {
  try {
    const jobs = await Job.findAll();
    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "Jobs fetched successfully",
      data: jobs,
    });
  } catch (error) {
    return next({ error });
  }
};

module.exports.updateJob = async function (req, res, next) {
  try {
    const schema = new Schema({
      title: { type: "string", required: false },
      status: { type: "array", required: false },
      description: { type: "string", required: false },
    });

    const result = schema.validate(req.body);
    if (result.error) {
      return next(CustomError.badRequest("Invalid request body", result.error));
    }

    const job = await Job.findByPk(req.params.id);
    if (!job) {
      return next(CustomError.badRequest("Job with that id does not exist"));
    }

    job.title = req.body.title ?? job.title;
    job.status = JSON.stringify(req.body.status ?? job.status);
    job.description = req.body.description ?? job.description;

    await job.save();

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "Job updated successfully",
      data: job,
    });
  } catch (error) {
    return next({ error });
  }
};

module.exports.deleteJob = async function (req, res, next) {
  try {
    const job = await Job.findByPk(req.params.id);
    if (!job) {
      return next(CustomError.badRequest("Job with that id does not exist"));
    }

    // delete job
    await job.destroy();

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "Job deleted successfully",
      data: job,
    });
  } catch (error) {
    return next({ error });
  }
};

module.exports.getJob = async function (req, res, next) {
  try {
    const job = await Job.findByPk(req.params.id)
    if (!job) {
      return next(CustomError.badRequest('Invalid job id'))
    }
    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "Jobs fetched successfully",
      data: job,
    });
  } catch (error) {
    return next({ error });
  }
};
