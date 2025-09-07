const { DataTypes } = require("sequelize");
const { sequelize } = require("../database/db");
const { STRING, INTEGER, BOOLEAN } = DataTypes;

const documentSchema = {
  model: {
    type: STRING,
    allowNull: true,
  },
  owner: {
    type: INTEGER,
    allowNull: true,
  },
  mimetype: {
    type: STRING,
    allowNull: false,
  },
  name: {
    type: STRING,
    allowNull: false,
  },
  modelId: {
    type: INTEGER,
    allowNull: true,
  },
  url: {
    type: STRING,
    allowNull: false,
  },
  size: {
    type: INTEGER,
    allowNull: false,
  },
  requiresApproval: {
    type: BOOLEAN,
    defaultValue: true,
  },
  status: {
    type: STRING,
    defaultValue: "awaiting-approval",
  },
  uploadedToUser: {
    type: BOOLEAN,
    defaultValue: false,
  }
};

const Document = sequelize.define("Document", documentSchema, {
  timestamps: true,
  hooks: {
    beforeValidate(_pl) { },
    beforeUpdate(_pl) { },
    afterFind(_pl) { },
  },
});

// sync database
Document.sync({ alter: true })
  .then((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === "production")
      console.log("=> Document model synced ✔️");
  })
  .catch((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === "production")
      console.log("Error while syncing Document ❌");
  });

module.exports = Document;
