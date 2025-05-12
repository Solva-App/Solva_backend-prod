const { DataTypes } = require("sequelize");
const { sequelize } = require("../database/db");
const { STRING, NOW, DATE } = DataTypes;

const OtpModel = sequelize.define(
  "OTP",
  {
    userId: { type: STRING, allowNull: false },
    otp: { type: STRING, allowNull: false },
    intent: { type: STRING, allowNull: false },
    expiresIn: { type: DATE, allowNull: false },
    createdAt: { type: DATE, defaultValue: NOW },
  },
  { timestamps: false, tableName: "otps" },
);

OtpModel.sync({ alter: true })
  .then(
    (_) =>
      process.env.NODE_ENV === "development" &&
      console.log("OtpModel has be created and synced to db!"),
  )
  .catch((err) =>
    console.log("Failed to create and sync OtpModel to db\n", err),
  );

module.exports = OtpModel;
