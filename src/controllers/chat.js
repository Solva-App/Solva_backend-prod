const CustomError = require('../helpers/error')
const { Schema } = require('json-validace')
const Chat = require('../models/Chat')
const { OK } = require('http-status-codes')
const { generateResponse } = require('../helpers/huggingface');
const Socket = require('../models/Socket')

module.exports.getUserChats = async (req, res) => {
  const owner = req.params.id;

  try {
    const chats = await Chat.findAll({
      where: { owner },
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    res.json({ chats });
  } catch (error) {
    console.error('[Chat History Error]', error.message);
    res.status(500).json({ error: 'Failed to retrieve chats' });
  }
};

module.exports.handleChat = async function (req, res, next) {
  try {
    const schema = new Schema({
      prompt: { type: 'string', required: true },
      owner: { type: 'number', required: true }
    });

    const result = schema.validate(req.body);
    if (result.errors && result.errors.length > 0) {
      return next(CustomError.badRequest("Invalid request body", result.errors));
    }

    const { prompt, owner } = req.body;

    const aiResponse = await generateResponse(prompt);

    const chat = await Chat.create({
      prompt,
      response: aiResponse,
      owner
    });

    const socketMapping = await Socket.findOne({ where: { owner } });

    const io = req.app.get('io');
    io.to(socketMapping.socket).emit('chatReply', aiResponse );

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "AI response generated successfully",
      data: {
        prompt,
        response: aiResponse
      }
    });

  } catch (error) {
    return next({ error });
  }
};
