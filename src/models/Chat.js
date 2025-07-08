const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db');
const { TEXT, INTEGER } = DataTypes;

const chatSchema = {
  owner: {
    type: INTEGER,
    allowNull: false,
  },
  prompt: {
    type: TEXT,
    allowNull: false,
  },
  response: {
    type: TEXT,
    allowNull: false,
  },
};

const Chat = sequelize.define('Chat', chatSchema, {
  timestamps: true,
});

Chat.sync({ alter: true })
  .then(() => {
    if (process.env.NODE_ENV?.toLowerCase() === 'production') {
      console.log('✅ Chat model synced');
    }
  })
  .catch((err) => {
    if (process.env.NODE_ENV?.toLowerCase() === 'production') {
      console.error('❌ Error syncing Chat model:', err.message);
    }
  });

module.exports = Chat
