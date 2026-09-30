const { Op } = require("sequelize");
const { randomInt, randomUUID } = require("crypto");
const { CREATED, OK } = require("http-status-codes");
const { Schema } = require("json-validace");
const CustomError = require("../helpers/error");
const paystack = require("../http/paystack");
const firebase = require("../helpers/firebase");
const image = require("../helpers/image");
const Season = require("../models/HuntSeason");
const Faculty = require("../models/HuntFaculty");
const FacultyMember = require("../models/HuntFacultyMember");
const Vote = require("../models/HuntVote");
const Stage = require("../models/HuntStage");
const Challenge = require("../models/HuntChallenge");
const StageSubmission = require("../models/HuntStageSubmission");
const Leaderboard = require("../models/HuntLeaderboard");
const User = require("../models/User");

const VOTE_PRICE_NAIRA = 50;

async function getMembership(userId, transaction) {
  return FacultyMember.findOne({ where: { user_id: userId }, transaction });
}

async function requireActiveFaculty(facultyId, userId, transaction) {
  const faculty = await Faculty.findByPk(facultyId, {
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });
  if (!faculty) throw CustomError.notFound("Faculty not found");
  if (!faculty.is_activated)
    throw CustomError.forbiddenRequest("Faculty is not activated");
  const membership = await FacultyMember.findOne({
    where: { faculty_id: facultyId, user_id: userId },
    transaction,
  });
  if (!membership)
    throw CustomError.forbiddenRequest("Join this faculty to continue");
  return faculty;
}

async function refreshStageLeaderboard(stageId, transaction) {
  const totals = await StageSubmission.findAll({
    attributes: [
      "faculty_id",
      [
        StageSubmission.sequelize.fn(
          "SUM",
          StageSubmission.sequelize.col("score_awarded"),
        ),
        "total_score",
      ],
    ],
    where: { stage_id: stageId },
    group: ["faculty_id"],
    order: [[StageSubmission.sequelize.literal("total_score"), "DESC"]],
    transaction,
  });

  await Leaderboard.destroy({ where: { stage_id: stageId }, transaction });
  for (const [index, total] of totals.entries()) {
    await Leaderboard.create(
      {
        stage_id: stageId,
        faculty_id: total.faculty_id,
        total_score: Number(total.get("total_score")) || 0,
        rank: index + 1,
      },
      { transaction },
    );
  }
}

module.exports.createSeason = async function (req, res, next) {
  const { title, description, start_date, end_date, stages } = req.body;
  if (
    typeof title !== "string" ||
    !title.trim() ||
    !Array.isArray(stages) ||
    stages.length === 0
  ) {
    return next(
      CustomError.badRequest("A title and at least one stage are required"),
    );
  }
  if (
    !stages.every(
      (stage) => stage && typeof stage === "object" && !Array.isArray(stage),
    )
  ) {
    return next(CustomError.badRequest("Each stage must be an object"));
  }
  const startDate = start_date ? new Date(start_date) : null;
  const endDate = end_date ? new Date(end_date) : null;
  if (
    (start_date && Number.isNaN(startDate.getTime())) ||
    (end_date && Number.isNaN(endDate.getTime()))
  ) {
    return next(
      CustomError.badRequest("start_date and end_date must be valid dates"),
    );
  }
  if (startDate && endDate && endDate <= startDate) {
    return next(
      CustomError.badRequest("end_date must be later than start_date"),
    );
  }

  const normalizedStages = stages.map((stage, index) => ({
    ...stage,
    stage_no: stage.stage_no === undefined ? index + 1 : stage.stage_no,
  }));
  const stageNumbers = new Set();
  for (const stage of normalizedStages) {
    const challenge = stage.challenge;
    if (
      !Number.isInteger(stage.stage_no) ||
      stage.stage_no < 1 ||
      stageNumbers.has(stage.stage_no)
    ) {
      return next(
        CustomError.badRequest(
          "Each stage must have a unique positive stage_no",
        ),
      );
    }
    stageNumbers.add(stage.stage_no);
    if (
      typeof stage.title !== "string" ||
      !stage.title.trim() ||
      !challenge ||
      typeof challenge.question_hint !== "string" ||
      !challenge.question_hint.trim() ||
      typeof challenge.challenge_type !== "string" ||
      !challenge.challenge_type.trim() ||
      typeof challenge.correct_answer !== "string" ||
      !challenge.correct_answer.trim() ||
      !Number.isInteger(challenge.points) ||
      challenge.points < 0
    ) {
      return next(
        CustomError.badRequest(
          "Each stage requires a title and exactly one valid challenge",
        ),
      );
    }
    if (
      stage.unlock_time &&
      Number.isNaN(new Date(stage.unlock_time).getTime())
    ) {
      return next(
        CustomError.badRequest("Stage unlock_time must be a valid date"),
      );
    }
    if (
      stage.points_reward !== undefined &&
      (!Number.isInteger(stage.points_reward) || stage.points_reward < 0)
    ) {
      return next(
        CustomError.badRequest("points_reward must be a non-negative integer"),
      );
    }
  }

  let transaction;
  try {
    transaction = await Season.sequelize.transaction();
    const season = await Season.create(
      {
        title: title.trim(),
        description: description || null,
        status: "active",
        start_date: startDate,
        end_date: endDate,
      },
      { transaction },
    );
    const createdStages = [];
    for (const stageInput of normalizedStages) {
      const stage = await Stage.create(
        {
          season_id: season.id,
          stage_no: stageInput.stage_no,
          title: stageInput.title.trim(),
          description: stageInput.description || null,
          unlock_time: stageInput.unlock_time
            ? new Date(stageInput.unlock_time)
            : null,
          points_reward: stageInput.points_reward || 0,
        },
        { transaction },
      );
      const challenge = await Challenge.create(
        {
          stage_id: stage.id,
          question_hint: stageInput.challenge.question_hint.trim(),
          challenge_type: stageInput.challenge.challenge_type.trim(),
          correct_answer: stageInput.challenge.correct_answer.trim(),
          points: stageInput.challenge.points,
        },
        { transaction },
      );
      createdStages.push({ ...stage.toJSON(), challenge });
    }
    await transaction.commit();
    return res.status(CREATED).json({
      success: true,
      status: res.statusCode,
      message: "Season created successfully",
      data: { ...season.toJSON(), stages: createdStages },
    });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    return next(error);
  }
};

module.exports.createFacultyAccessCode = async function (req, res, next) {
  try {
    const schema = new Schema({
      season_id: { type: "number", required: true },
      name: { type: "string", required: true },
      description: { type: "string", required: false },
    });
    const result = schema.validate(req.body);
    if (result.error)
      return next(CustomError.badRequest("Invalid request body", result.error));
    const { season_id, name, description } = result.data;
    if (!Number.isInteger(season_id) || season_id < 1 || !name.trim()) {
      return next(
        CustomError.badRequest(
          "season_id and a valid faculty name are required",
        ),
      );
    }
    const season = await Season.findByPk(season_id);
    if (!season) return next(CustomError.notFound("Season not found"));
    if (season.status !== "active")
      return next(
        CustomError.forbiddenRequest(
          "Faculty access codes require an active season",
        ),
      );
    const prefix = name
      .replace(/[^a-z]/gi, "")
      .slice(0, 3)
      .toUpperCase();
    if (prefix.length !== 3) {
      return next(
        CustomError.badRequest(
          "Faculty name must contain at least three letters",
        ),
      );
    }

    let faculty;
    for (let attempt = 0; attempt < 10 && !faculty; attempt += 1) {
      const accessCode = `${prefix}-${randomInt(1000, 10000)}`;
      if (await Faculty.findOne({ where: { access_code: accessCode } }))
        continue;
      faculty = await Faculty.create({
        season_id,
        name: name.trim(),
        description: description || null,
        access_code: accessCode,
        is_activated: false,
      });
    }
    if (!faculty)
      return next(
        CustomError.internalServerError(
          "Could not generate a unique faculty access code",
        ),
      );
    return res.status(CREATED).json({
      success: true,
      status: res.statusCode,
      message: "Faculty access code created successfully",
      data: faculty,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports.getSeasons = async function (_req, res, next) {
  try {
    const seasons = await Season.findAll({ order: [["start_date", "DESC"]] });
    return res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "Seasons fetched successfully",
      data: seasons,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports.getSeason = async function (req, res, next) {
  try {
    const season = await Season.findByPk(req.params.id);
    if (!season) return next(CustomError.notFound("Season not found"));
    return res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "Season fetched successfully",
      data: season,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports.getSeasonStages = async function (req, res, next) {
  try {
    const season = await Season.findByPk(req.params.id);
    if (!season) return next(CustomError.notFound("Season not found"));
    if (season.status !== "active")
      return next(CustomError.forbiddenRequest("Season is not active"));
    const stages = await Stage.findAll({
      where: { season_id: season.id },
      order: [["stage_no", "ASC"]],
    });
    return res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "Season stages fetched successfully",
      data: stages,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports.getSeasonLeaderboard = async function (req, res, next) {
  try {
    const season = await Season.findByPk(req.params.id);
    if (!season) return next(CustomError.notFound("Season not found"));
    const stages = await Stage.findAll({
      where: { season_id: season.id },
      attributes: ["id"],
    });
    const stageIds = stages.map((stage) => stage.id);
    const entries = stageIds.length
      ? await Leaderboard.findAll({
          where: { stage_id: { [Op.in]: stageIds } },
          attributes: [
            "faculty_id",
            [
              Leaderboard.sequelize.fn(
                "SUM",
                Leaderboard.sequelize.col("total_score"),
              ),
              "total_score",
            ],
          ],
          group: ["faculty_id"],
          order: [[Leaderboard.sequelize.literal("total_score"), "DESC"]],
        })
      : [];
    const facultyIds = entries.map((entry) => entry.faculty_id);
    const faculties = facultyIds.length
      ? await Faculty.findAll({
          where: { id: { [Op.in]: facultyIds } },
          attributes: ["id", "name"],
        })
      : [];
    const facultyNames = new Map(
      faculties.map((faculty) => [faculty.id, faculty.name]),
    );
    const leaderboard = entries.map((entry, index) => ({
      faculty_id: entry.faculty_id,
      faculty_name: facultyNames.get(entry.faculty_id),
      total_score: Number(entry.get("total_score")) || 0,
      rank: index + 1,
    }));
    return res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "Season leaderboard fetched successfully",
      data: leaderboard,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports.initializeFacultyVote = async function (req, res, next) {
  try {
    const schema = new Schema({
      faculty_id: { type: "number", required: true },
      vote_count: { type: "number", required: true },
    });
    const result = schema.validate(req.body);
    if (result.error)
      return next(CustomError.badRequest("Invalid request body", result.error));
    const { faculty_id, vote_count } = result.data;
    if (
      !Number.isInteger(faculty_id) ||
      faculty_id < 1 ||
      !Number.isSafeInteger(vote_count) ||
      vote_count < 1
    ) {
      return next(
        CustomError.badRequest(
          "faculty_id and vote_count must be positive integers",
        ),
      );
    }
    const faculty = await Faculty.findByPk(faculty_id);
    if (!faculty || !faculty.is_activated)
      return next(CustomError.notFound("Activated faculty not found"));
    const season = await Season.findByPk(faculty.season_id);
    if (!season || season.status !== "active")
      return next(CustomError.forbiddenRequest("Season is not active"));

    const amount = vote_count * VOTE_PRICE_NAIRA;
    if (!Number.isSafeInteger(amount * 100) || !req.user.email)
      return next(
        CustomError.badRequest(
          "Vote amount is invalid or account email is missing",
        ),
      );
    const reference = `hunt_vote_${randomUUID()}`;
    const vote = await Vote.create({
      season_id: season.id,
      faculty_id: faculty.id,
      user_id: req.user.id,
      vote_count,
      amount,
      reference,
      status: "pending",
    });
    const payment = await paystack.generatePaymentLink({
      amount: amount * 100,
      email: req.user.email,
      reference,
      currency: "NGN",
      metadata: JSON.stringify({
        type: "hunt_vote",
        hunt_vote_id: vote.id,
        faculty_id: faculty.id,
        vote_count,
      }),
    });
    if (payment instanceof CustomError) {
      vote.status = "failed";
      await vote.save();
      return next(payment);
    }
    if (
      !payment?.status ||
      payment.data?.reference !== reference ||
      !payment.data?.authorization_url
    ) {
      vote.status = "failed";
      await vote.save();
      return next(
        CustomError.internalServerError(
          "Paystack did not return a valid authorization link",
        ),
      );
    }
    return res.status(CREATED).json({
      success: true,
      status: res.statusCode,
      message: "Vote payment initialized successfully",
      data: {
        authorization_url: payment.data.authorization_url,
        reference,
        faculty_id: faculty.id,
        vote_count,
        amount,
        currency: "NGN",
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports.verifyFacultyVote = async function (req, res, next) {
  let transaction;
  try {
    const vote = await Vote.findOne({
      where: { reference: req.params.reference, user_id: req.user.id },
    });
    if (!vote) return next(CustomError.notFound("Vote payment not found"));
    if (vote.status === "paid") {
      return res.status(OK).json({
        success: true,
        status: res.statusCode,
        message: "Vote payment already verified",
        data: vote,
      });
    }

    const verification = await paystack.verifyTransaction(vote.reference);
    if (verification instanceof CustomError) return next(verification);
    const paymentData = verification?.data;
    if (!verification?.status || paymentData?.reference !== vote.reference) {
      return next(
        CustomError.badRequest("Paystack could not verify this vote payment"),
      );
    }
    if (paymentData.status !== "success") {
      if (["failed", "abandoned"].includes(paymentData.status)) {
        vote.status = "failed";
        await vote.save();
      }
      return next(CustomError.badRequest("Vote payment has not succeeded"));
    }
    if (
      Number(paymentData.amount) !== vote.amount * 100 ||
      paymentData.currency !== "NGN"
    ) {
      return next(
        CustomError.badRequest(
          "Verified payment amount does not match the vote order",
        ),
      );
    }

    transaction = await Vote.sequelize.transaction();
    const lockedVote = await Vote.findByPk(vote.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (lockedVote.status !== "paid") {
      lockedVote.status = "paid";
      lockedVote.paid_at = new Date();
      await lockedVote.save({ transaction });
    }
    await transaction.commit();
    return res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "Vote payment verified successfully",
      data: lockedVote,
    });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    return next(error);
  }
};

module.exports.getSeasonVotes = async function (req, res, next) {
  try {
    const season = await Season.findByPk(req.params.id);
    if (!season) return next(CustomError.notFound("Season not found"));
    const faculties = await Faculty.findAll({
      where: { season_id: season.id, is_activated: true },
      attributes: ["id", "name", "team_contact_name", "crest_logo"],
    });
    const totals = await Vote.findAll({
      attributes: [
        "faculty_id",
        [
          Vote.sequelize.fn("SUM", Vote.sequelize.col("vote_count")),
          "votes",
        ],
      ],
      where: { season_id: season.id, status: "paid" },
      group: ["faculty_id"],
    });
    const votesByFaculty = new Map(
      totals.map((total) => [
        Number(total.faculty_id),
        Number(total.get("votes")) || 0,
      ]),
    );
    const voteResults = faculties
      .map((faculty) => ({
        faculty_id: faculty.id,
        name: faculty.name,
        team_contact_name: faculty.team_contact_name,
        crest_logo: faculty.crest_logo,
        votes: votesByFaculty.get(Number(faculty.id)) || 0,
      }))
      .sort((left, right) => right.votes - left.votes);
    voteResults.forEach((faculty, index) => {
      faculty.rank = index + 1;
    });
    return res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "Season vote totals fetched successfully",
      data: voteResults,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports.getFaculties = async function (req, res, next) {
  try {
    const where = { is_activated: true };
    if (req.query.season_id) where.season_id = req.query.season_id;
    const faculties = await Faculty.findAll({
      where,
      attributes: [
        "id",
        "season_id",
        "name",
        "description",
        "representative_user_id",
        "team_contact_name",
        "crest_logo",
        "is_activated",
      ],
      order: [["name", "ASC"]],
    });
    return res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "Faculties fetched successfully",
      data: faculties,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports.registerFaculty = async function (req, res, next) {
  let { member_user_ids, ...bodyToValidate } = req.body;

  const schema = new Schema({
    access_code: { type: "string", required: true },
    team_contact_name: { type: "string", required: true },
    crest_logo: { type: "string", required: false },
  });

  const result = schema.validate(bodyToValidate);
  if (result.error) {
    return next(CustomError.badRequest("Invalid request body", result.error));
  }

  const { access_code, team_contact_name, crest_logo } = result.data;

  let memberUserIds = req.body.member_user_ids;
  if (typeof memberUserIds === "string") {
    try {
      memberUserIds = JSON.parse(memberUserIds);
    } catch (_error) {
      return next(
        CustomError.badRequest("member_user_ids must be a valid JSON array"),
      );
    }
  }

  if (
    !access_code.trim() ||
    !team_contact_name.trim() ||
    !Array.isArray(memberUserIds) ||
    memberUserIds.length !== 3
  ) {
    return next(
      CustomError.badRequest(
        "access_code, team_contact_name, and exactly three member_user_ids are required",
      ),
    );
  }

  memberUserIds = memberUserIds.map(Number);
  const currentUserId = Number(req.user.id);

  if (
    memberUserIds.some((id) => !Number.isInteger(id) || id < 1) ||
    new Set(memberUserIds).size !== 3 ||
    !memberUserIds.includes(currentUserId)
  ) {
    return next(
      CustomError.badRequest(
        "Provide three distinct valid user IDs, including your own",
      ),
    );
  }

  try {
    let crestLogo = typeof crest_logo === "string" ? crest_logo.trim() : "";

    if (req.file) {
      if (!req.file.mimetype || !req.file.mimetype.startsWith("image/")) {
        return next(
          CustomError.unsuportedMediaTypeError(
            "Faculty crest must be an image",
          ),
        );
      }
      const processedCrest = await image.modifyStringImageFile(req.file);
      const uploadedCrest = await firebase.fileUpload(
        processedCrest,
        "hunt-faculties",
      );
      if (uploadedCrest instanceof CustomError) return next(uploadedCrest);
      crestLogo = uploadedCrest;
    }

    const users = await User.findAll({
      where: { id: { [Op.in]: memberUserIds } },
      attributes: ["id"],
    });
    if (users.length !== 3) {
      return next(
        CustomError.badRequest("All three member user IDs must exist"),
      );
    }

    let facultyData;
    await Faculty.sequelize.transaction(async (transaction) => {
      const faculty = await Faculty.findOne({
        where: { access_code: access_code.trim().toUpperCase() },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!faculty) {
        throw CustomError.notFound("Faculty access code not found");
      }
      if (faculty.is_activated) {
        throw CustomError.badRequest(
          "Faculty access code has already been used",
        );
      }

      const season = await Season.findByPk(faculty.season_id, { transaction });
      if (!season || season.status !== "active") {
        throw CustomError.forbiddenRequest("Associated season is not active");
      }

      const seasonFaculties = await Faculty.findAll({
        where: { season_id: faculty.season_id },
        attributes: ["id"],
        transaction,
      });
      const seasonFacultyIds = seasonFaculties.map((f) => f.id);

      const existingMemberships = await FacultyMember.findAll({
        where: {
          user_id: { [Op.in]: memberUserIds },
          faculty_id: { [Op.in]: seasonFacultyIds },
        },
        transaction,
      });

      if (existingMemberships.length > 0) {
        throw CustomError.badRequest(
          "One or more members already belong to a faculty in this season",
        );
      }

      faculty.is_activated = true;
      faculty.team_contact_name = team_contact_name.trim();
      faculty.crest_logo = crestLogo;
      faculty.representative_user_id = currentUserId;
      await faculty.save({ transaction });

      await FacultyMember.bulkCreate(
        memberUserIds.map((user_id) => ({ faculty_id: faculty.id, user_id })),
        { transaction },
      );

      facultyData = faculty.toJSON();
    });

    delete facultyData.access_code;

    return res.status(201).json({
      success: true,
      status: 201,
      message: "Faculty registered and activated successfully",
      data: { ...facultyData, member_user_ids: memberUserIds },
    });
  } catch (error) {
    return next(error);
  }
};

// module.exports.joinFaculty = async function (req, res, next) {
//   let transaction;
//   try {
//     transaction = await Faculty.sequelize.transaction();
//     const faculty = await Faculty.findByPk(req.params.id, {
//       transaction,
//       lock: transaction.LOCK.UPDATE,
//     });
//     if (!faculty) {
//       await transaction.rollback();
//       return next(CustomError.notFound("Faculty not found"));
//     }
//     if (!faculty.is_activated) {
//       await transaction.rollback();
//       return next(CustomError.forbiddenRequest("Faculty is not activated"));
//     }
//     if (await getMembership(req.user.id, transaction)) {
//       await transaction.rollback();
//       return next(CustomError.badRequest("You already belong to a faculty"));
//     }
//     const memberCount = await FacultyMember.count({
//       where: { faculty_id: faculty.id },
//       transaction,
//     });
//     if (memberCount >= 3) {
//       await transaction.rollback();
//       return next(
//         CustomError.badRequest("A faculty can have no more than three members"),
//       );
//     }
//     const membership = await FacultyMember.create(
//       {
//         faculty_id: faculty.id,
//         user_id: req.user.id,
//       },
//       { transaction },
//     );
//     if (!faculty.representative_user_id) {
//       faculty.representative_user_id = req.user.id;
//       await faculty.save({ transaction });
//     }
//     await transaction.commit();
//     return res.status(CREATED).json({
//       success: true,
//       status: res.statusCode,
//       message: "Joined faculty successfully",
//       data: membership,
//     });
//   } catch (error) {
//     if (transaction && !transaction.finished) await transaction.rollback();
//     return next(error);
//   }
// };

// module.exports.leaveFaculty = async function (req, res, next) {
//   let transaction;
//   try {
//     transaction = await FacultyMember.sequelize.transaction();
//     const faculty = await Faculty.findByPk(req.params.id, {
//       transaction,
//       lock: transaction.LOCK.UPDATE,
//     });
//     if (!faculty) {
//       await transaction.rollback();
//       return next(CustomError.notFound("Faculty not found"));
//     }
//     const membership = await FacultyMember.findOne({
//       where: { faculty_id: req.params.id, user_id: req.user.id },
//       transaction,
//     });
//     if (!membership) {
//       await transaction.rollback();
//       return next(CustomError.notFound("Faculty membership not found"));
//     }
//     if (Number(faculty.representative_user_id) === Number(req.user.id)) {
//       const nextRepresentative = await FacultyMember.findOne({
//         where: {
//           faculty_id: faculty.id,
//           user_id: { [Op.ne]: req.user.id },
//         },
//         order: [["joined_at", "ASC"]],
//         transaction,
//         lock: transaction.LOCK.UPDATE,
//       });
//       faculty.representative_user_id = nextRepresentative
//         ? nextRepresentative.user_id
//         : null;
//       await faculty.save({ transaction });
//     }
//     await membership.destroy({ transaction });
//     await transaction.commit();
//     return res.status(OK).json({
//       success: true,
//       status: res.statusCode,
//       message: "Left faculty successfully",
//       data: null,
//     });
//   } catch (error) {
//     if (transaction && !transaction.finished) await transaction.rollback();
//     return next(error);
//   }
// };

module.exports.getStage = async function (req, res, next) {
  try {
    const stage = await Stage.findByPk(req.params.id);
    if (!stage) return next(CustomError.notFound("Stage not found"));
    const season = await Season.findByPk(stage.season_id);
    if (!season || season.status !== "active")
      return next(CustomError.forbiddenRequest("Season is not active"));
    if (stage.unlock_time && new Date(stage.unlock_time) > new Date()) {
      return next(CustomError.forbiddenRequest("Stage is locked"));
    }
    const challenges = await Challenge.findAll({
      where: { stage_id: stage.id },
      attributes: [
        "id",
        "stage_id",
        "question_hint",
        "challenge_type",
        "points",
      ],
    });
    return res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "Stage fetched successfully",
      data: { ...stage.toJSON(), challenges },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports.submitStage = async function (req, res, next) {
  const schema = new Schema({
    challenge_id: { type: "number", required: false },
    answer_provided: { type: "string", required: true },
  });
  const result = schema.validate(req.body);
  if (result.error)
    return next(CustomError.badRequest("Invalid request body", result.error));

  const { challenge_id, answer_provided } = result.data;
  if (
    (challenge_id !== undefined &&
      (!Number.isInteger(challenge_id) || challenge_id < 1)) ||
    !answer_provided.trim()
  ) {
    return next(
      CustomError.badRequest(
        "challenge_id must be a positive integer and answer_provided is required",
      ),
    );
  }

  let transaction;
  try {
    transaction = await StageSubmission.sequelize.transaction();
    const stage = await Stage.findByPk(req.params.id, { transaction });
    if (!stage) {
      await transaction.rollback();
      return next(CustomError.notFound("Stage not found"));
    }
    const season = await Season.findByPk(stage.season_id, { transaction });
    if (!season || season.status !== "active") {
      await transaction.rollback();
      return next(CustomError.forbiddenRequest("Season is not active"));
    }
    if (stage.unlock_time && new Date(stage.unlock_time) > new Date()) {
      await transaction.rollback();
      return next(CustomError.forbiddenRequest("Stage is locked"));
    }

    const membership = await getMembership(req.user.id, transaction);
    if (!membership) {
      await transaction.rollback();
      return next(
        CustomError.forbiddenRequest("Join an activated faculty to submit"),
      );
    }
    const faculty = await requireActiveFaculty(
      membership.faculty_id,
      req.user.id,
      transaction,
    );
    let challenge;
    if (challenge_id) {
      challenge = await Challenge.findOne({
        where: { id: challenge_id, stage_id: stage.id },
        transaction,
      });
    } else {
      const stageChallenges = await Challenge.findAll({
        where: { stage_id: stage.id },
        transaction,
      });
      if (stageChallenges.length === 1) challenge = stageChallenges[0];
    }
    if (!challenge) {
      await transaction.rollback();
      return next(
        CustomError.badRequest(
          "A valid challenge_id is required for this stage",
        ),
      );
    }
    const previousCorrect = await StageSubmission.findOne({
      where: {
        stage_id: stage.id,
        challenge_id: challenge.id,
        faculty_id: faculty.id,
        is_correct: true,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const answer = answer_provided.trim();
    const isCorrect =
      answer.localeCompare(challenge.correct_answer.trim(), undefined, {
        sensitivity: "accent",
      }) === 0;
    const scoreAwarded =
      isCorrect && !previousCorrect ? Number(challenge.points) : 0;
    const submission = await StageSubmission.create(
      {
        stage_id: stage.id,
        challenge_id: challenge.id,
        faculty_id: faculty.id,
        submitted_by: req.user.id,
        answer_provided: answer,
        is_correct: isCorrect,
        score_awarded: scoreAwarded,
      },
      { transaction },
    );
    if (scoreAwarded > 0) await refreshStageLeaderboard(stage.id, transaction);
    await transaction.commit();
    return res.status(CREATED).json({
      success: true,
      status: res.statusCode,
      message: "Answer submitted successfully",
      data: submission,
    });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    return next(error);
  }
};

module.exports.getStageSubmissions = async function (req, res, next) {
  try {
    const stage = await Stage.findByPk(req.params.id);
    if (!stage) return next(CustomError.notFound("Stage not found"));
    const where = { stage_id: stage.id };
    if (!req.user.isAdmin) {
      const membership = await getMembership(req.user.id);
      if (!membership)
        return next(
          CustomError.forbiddenRequest("Join a faculty to view submissions"),
        );
      where.faculty_id = membership.faculty_id;
    }
    const submissions = await StageSubmission.findAll({
      where,
      order: [["id", "DESC"]],
    });
    return res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "Stage submissions fetched successfully",
      data: submissions,
    });
  } catch (error) {
    return next(error);
  }
};
