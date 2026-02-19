const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db');
const { STRING, TEXT, INTEGER } = DataTypes;

const cardSchema = {
  flashcardId: {
    type: INTEGER,
    allowNull: false,
  },
  front: {
    type: TEXT,
    allowNull: false,
    comment: 'The question or prompt'
  },
  back: {
    type: TEXT,
    allowNull: false,
    comment: 'The answer or explanation'
  }
};

const card = sequelize.define('card', cardSchema, {
  timestamps: true,
});

// Sync Database
card.sync({ alter: true })
  .then(() => {
    if (process.env.NODE_ENV?.toLowerCase() === 'production') console.log('=> card model synced ✔️');
  })
  .catch((err) => {
    console.error('Error while syncing card ❌', err);
  });

module.exports = card;