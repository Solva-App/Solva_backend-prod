const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db');

const commentLikeSchema = {
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  postCommentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
};

const CommentLike = sequelize.define('CommentLike', commentLikeSchema, {
  timestamps: true,
  hooks: {
    beforeValidate(_pl) {},
    beforeUpdate(_pl) {},
    afterFind(_pl) {},
  },
});

CommentLike.sync({ alter: true })
  .then((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> CommentLike model synced ✔️');
  })
  .catch((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing CommentLike ❌');
  });

module.exports = CommentLike;
