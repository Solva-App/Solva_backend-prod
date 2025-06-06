const { Schema } = require("json-validace");
const CustomError = require("../helpers/error");
const User = require("../models/User");
const { StatusCodes } = require("http-status-codes");
const Token = require("../models/Token");
const Freelancer = require("../models/Freelancer");
const { emailVerification } = require("../helpers/email");
const uuid = require("uuid");
const otpGenerate = require("otp-generator");
const OtpModel = require("../models/otp");
const { sendEmail } = require("../helpers/resend");
const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");
const bcrypt = require("bcryptjs");

module.exports.createAccount = async function (req, res, next) {
  try {
    const schema = new Schema({
      fullName: { type: "string", required: true },
      email: { type: "email", required: true },
      phone: { type: "string", required: true },
      password: { type: "string", required: true, minLength: 8 },
      referral: { type: "string", required: false },
    });

    const result = schema.validate(req.body);
    if (result.error) {
      return next(CustomError.badRequest("Invalid Request Body", result.error));
    }

    const body = result.data;

    if (body.fullName.split(" ").length < 2) {
      return next(
        CustomError.badRequest("Invalid request body", {
          fullName: { type: "Full name is invalid" },
        }),
      );
    }
    // check if email is already used
    const isEmailUsed = await User.findOne({ where: { email: body.email } });
    const isPhoneUsed = await User.findOne({ where: { phone: body.phone } });

    if (isEmailUsed) {
      return next(CustomError.unauthorizedRequest("Email already in use!"));
    } else if (isPhoneUsed) {
      return next(
        CustomError.unauthorizedRequest("Phone number is already used!"),
      );
    }

    if (body.referral) {
      const referral = await User.findOne({
        where: { referralCode: body.referral },
      });
      if (!referral)
        return next(CustomError.badRequest("Invalid referral code"));
      body.referral = referral.id; // asign the id of the referral to the user's data

      referral.balance += 100;
      await referral.save();
    }

    // create user
    // TODO: add referral to this user
    const user = await User.create({
      ...body,
      isSuspended: false,
      role: "user",
      category: "user",
      referralCode: await Token.generateReferral(body.email),
      isActive: true,
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      status: res.statusCode,
      message: "Account created sucessfully!",
      data: {
        ...user.dataValues,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports.login = async function (req, res, next) {
  try {
    const schema = new Schema({
      email: { type: "email", required: true },
      password: { type: "string", required: true },
    });
    const result = schema.validate(req.body);
    if (result.error) {
      return next(CustomError.badRequest("Invalid request body", result.error));
    }

    const body = result.data;
    const user = await User.verifyLoginCredentials(body);
    if (user instanceof CustomError) return next(user);

    const tokens = await Token.generate(user);
    if (tokens instanceof CustomError) {
      return next(tokens);
    }
    res.status(StatusCodes.OK).json({
      success: true,
      status: res.statusCode,
      message: "User login successfully",
      data: {
        user,
        tokens,
      },
    });
  } catch (error) {
    console.log(error);
    return next({ error });
  }
};

module.exports.getUser = async function (req, res, next) {
  try {
    const schema = new Schema({});
    if (schema.validate(req.body).error)
      return next(
        CustomError.badRequest("this endpoint does not require a body!"),
      );

    const getPrefix = () => {
      let n = req.user.fullName.split(" ");
      let fn = n[0][0];
      let ln = n[n.length - 1][0];
      return (fn + ln).toLowerCase();
    };

    res.status(StatusCodes.OK).json({
      success: true,
      status: res.statusCode,
      message: "sucessfully fetched user's data!",
      data: {
        hasPassword: Boolean(req?.user?.password),
        ...req.user.dataValues,
        prefix: getPrefix(),
        password: undefined,
        freelancer: await Freelancer.findOne({ where: { owner: req.user.id } }),
      },
    });
  } catch (error) {
    return next({ error });
  }
};

module.exports.getUserById = async function (req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return next(CustomError.badRequest("User does not exit"));
    }
    res.status(200).json({
      success: true,
      status: res.statusCode,
      message: "User data fetched successfully",
      data: user,
    });
  } catch (error) {
    return next({ error });
  }
};

module.exports.generateToken = async function (req, res, next) {
  try {
    const schema = new Schema({
      refreshToken: { type: "string", required: true },
    });
    const result = schema.validate(req.body);
    if (result.error) {
      return next(CustomError.badRequest("Invalid request body", result.error));
    }

    const body = result.data;

    const tokens = await Token.generateNewAccessToken(body.refreshToken);
    if (tokens instanceof CustomError) {
      return next(tokens);
    }

    res.status(200).json({
      success: true,
      status: res.statusCode,
      data: tokens,
    });
  } catch (error) {
    return next({ error });
  }
};

module.exports.updatePassword = async function (req, res, next) {
  try {
    const schema = new Schema({
      oldPassword: { type: "string", required: true },
      newPassword: { type: "string", required: true },
    });

    const result = schema.validate(req.body);
    if (result.error)
      return next(CustomError.badRequest("Invalid Body", result.error));

    const body = result.data;

    // validate the password
    const isPasswordValid = await req.user.verifyPassword(body.oldPassword);
    if (!isPasswordValid)
      return next(CustomError.badRequest("Invalid password"));

    // change the password
    req.user.password = body.newPassword;
    await req.user.encrypt();
    await req.user.save();

    return res.status(200).json({
      message: "Password changed succssfully!",
      success: true,
      status: res.statusCode,
      data: null,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports.getAllUsers = async function (req, res, next) {
  try {
    const users = await User.findAll();
    res.status(StatusCodes.OK).json({
      success: true,
      status: res.statusCode,
      message: "Users fetched successfully",
      data: users,
    });
  } catch (error) {
    return next({ error });
  }
};

// update profile
module.exports.updateProfile = async function (req, res, next) {
  try {
    const schema = new Schema({
      fullName: {
        type: "string",
        required: false,
        trim: true,
        default: req.user.firstName,
      },
      email: {
        type: "string",
        required: false,
        trim: true,
        default: req.user.lastName,
      },
      phone: { type: "string", required: false, trim: true },
      address: { type: "string", required: false, trim: true },
      gender: {
        type: "string",
        required: false,
        trim: true,
        toLower: true,
        enum: ["male", "female"],
      },
    });

    const result = schema.validate(req.body);

    if (result.error) {
      return next(CustomError.badRequest("Invalid Body", result.error));
    }

    const body = result.data;

    if (body.fullName.split(" ").length < 2) {
      return next(CustomError.badRequest("Full name is invalid"));
    }

    // update the nameobject
    req.user.fullName = body.fullName ?? req.user.fullName;
    req.user.address = body.address ?? req.user.address;
    req.user.email = body.email ?? req.user.email;
    req.user.phone = body.phone ?? req.user.phone;
    req.user.gender = body.gender ?? req.user.gender;

    await req.user.save();

    // send response
    res.status(200).json({
      message: "profile changed successfully",
      success: true,
      status: res.statusCode,
      data: req.user,
    });
  } catch (error) {
    return next({ error });
  }
};

module.exports.flagUsers = async function (req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return next(CustomError.badRequest("Invalid id"));
    }

    user.isSuspended = true;
    await user.save();

    return res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "User suspended successfully",
      data: user,
    });
  } catch (error) {
    return next({ error });
  }
};

module.exports.unFlagUsers = async function (req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return next(CustomError.badRequest("Invalid id"));
    }

    user.isSuspended = false;
    await user.save();

    return res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "User suspended successfully",
      data: user,
    });
  } catch (error) {
    return next({ error });
  }
};

// GET user balance
module.exports.getUserBalance = async function (req, res, next) {
  try {
    const user = await User.findOne({
      attributes: ["balance"],
      where: { id: req.params.id },
    });
    console.log("User balance", user);
    if (!user) {
      return next(CustomError.badRequest("Invalid user id"));
    }
    const userBalance = user.balance;
    return res.status(200).json({
      success: true,
      status: res.statusCode,
      message: "Get user balance",
      data: { balance: userBalance },
    });
  } catch (error) {
    return next({ error });
  }
};

// send otp
module.exports.sendForgotPasswordOTP = async function (req, res, next) {
  try {
    const { email } = req.body;

    if (!email) return next(CustomError.badRequest("Email field missing"));

    // get the user with the email
    const user = await User.findOne({
      where: { email },
      attributes: ["id", "fullName"],
    });

    if (!user)
      return res
        .status(200)
        .json({ message: "An OTP has been sent to the email " + email });

    // generate the otp
    let otp = otpGenerate.generate(4, {
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    });

    // check generated otp exist already
    let otpUsed = await OtpModel.findOne({ where: { otp } });

    while (otpUsed) {
      otp = otpGenerate.generate(4, {
        lowerCaseAlphabets: false,
        upperCaseAlphabets: false,
        specialChars: false,
      });

      otpUsed = await OtpModel.findOne({ where: { otp } });
    }

    const expirationDate = new Date();
    expirationDate.setMinutes(expirationDate.getMinutes() + 30);

    // store new otp in db
    await OtpModel.create({
      userId: user.id,
      otp,
      intent: "Forgot password",
      expiresIn: expirationDate,
    });

    const templatePath = path.join(
      __dirname,
      "../templates/forgotten_password_otp_email.handlebars",
    );

    const forgotPassContent = fs.readFileSync(templatePath, "utf8");

    const compileTemplate = handlebars.compile(forgotPassContent);

    const template = compileTemplate({
      fullName: user.fullName.split(" ")[0].trim(),
      email,
      otp,
    });

    // send otp to user email
    await sendEmail(email, "Reset Solva Password", template);

    res.status(200).json({
      message: "An OTP has been sent to the email " + email,
      userId: user.id,
    });
  } catch (error) {
    console.log("Failed to update forgot password\n", error);
    res.status(500).json({ error: "Something went wrong, please retry" });
  }
};

// update forgotten Password
module.exports.resetForgottenPassword = async function (req, res, next) {
  try {
    const schema = new Schema({
      userId: { type: "string", required: true },
      otpCode: { type: "string", required: true, minLength: 4 },
      newPassword: { type: "string", required: true, minLength: 8 },
    });

    const result = schema.validate(req.body);
    if (result.error) {
      return next(CustomError.badRequest("Invalid Request Body", result.error));
    }
    const { userId } = result.data;

    // validate the otp code
    const generatedOtpCode = await OtpModel.findOne({
      where: { userId },
      attributes: ["otp", "expiresIn"],
      order: [["createdAt", "DESC"]],
    });

    console.log("sent otp code", req.body.otpCode);
    console.log("db otp code", generatedOtpCode.otp);

    if (req.body.otpCode !== generatedOtpCode.otp) {
      // OTP mismatch
      return res.status(403).json({ error: "Invalid OTP" });
    }

    // check if otp code is valid
    const now = Date.now();
    const otpExpirationTime = new Date(generatedOtpCode.expiresIn).getTime();

    if (otpExpirationTime < now) {
      // OTP expired
      return res.status(403).json({ error: "Invalid OTP" });
    }

    const passwordHash = await bcrypt.hash(
      req.body.newPassword,
      Number(process.env.PASSWORD_HASH),
    );

    // save to db
    await User.update({ password: passwordHash }, { where: { id: userId } });

    // invalidate the otp
    const newDate = new Date();
    newDate.setMinutes(newDate.getMinutes() - 30);
    await OtpModel.update(
      { expiresIn: newDate },
      { where: { otp: generatedOtpCode.otp } },
    );

    res.status(200).send("Password updated successfully");
  } catch (error) {
    console.log(error);
  }
};
