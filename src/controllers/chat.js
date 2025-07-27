const CustomError = require('../helpers/error')
const { Schema } = require('json-validace')
const Chat = require('../models/Chat')
const { OK } = require('http-status-codes')
const { generateResponse } = require('../helpers/huggingface');
const Socket = require('../models/Socket')

module.exports.getUserChats = async (req, res, next) => {
  const owner = req.params.id;

  try {
    const chats = await Chat.findAll({
      where: { owner },
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "Chat History gotten successfully",
      data: chats,
    });
  } catch (error) {
    return next({ error });
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
    console.log(`💬 Prompt from user ${owner}:`, prompt);

    const aiResponse = await generateResponse(prompt);

    const chat = await Chat.create({ prompt, response: aiResponse, owner });

    const socketMapping = await Socket.findOne({ where: { owner } });

    if (!socketMapping) {
      console.log(`No socket mapping found for owner: ${owner}`);
      return res.status(200).json({
        success: true,
        status: 200,
        message: "Response generated, but user is not connected via socket",
        data: { prompt: chat.prompt, response: chat.response }
      });
    }

    const socketId = socketMapping.socket;
    const io = req.app.get("io");
    const socket = io.sockets.sockets.get(socketId);

    if (!socket || !socket.connected) {
      console.log(`Socket not connected for user: ${owner}, Socket ID: ${socketId}`);
      return res.status(200).json({
        success: true,
        status: 200,
        message: "Response generated, but socket is not active",
        data: { prompt: chat.prompt, response: chat.response }
      });
    }

    io.to(socketId).emit("chatReply", {
      prompt: chat.prompt,
      response: chat.response,
    });

    return res.status(200).json({
      success: true,
      status: 200,
      message: "AI response generated and sent",
      data: {
        prompt: chat.prompt,
        response: chat.response
      }
    });

  } catch (error) {
    console.error("Chat error:", error.message);
    return next({ error });
  }
};

