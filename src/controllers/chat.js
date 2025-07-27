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

    const aiResponse = await generateResponse(prompt);

    const chat = await Chat.create({
      prompt,
      response: aiResponse,
      owner
    });

    const socketMapping = await Socket.findOne({ where: { owner } });

    if (socketMapping && socketMapping.socket) {
      const io = req.app.get("io");
      const socket = io.sockets.sockets.get(socketMapping.socket);

      if (socket && socket.connected) {
        io.to(socketMapping.socket).emit("chatReply", {
          prompt: chat.prompt,
          response: chat.response,
        });
      } else {
        console.log("Socket is not connected for user", owner);
        return res.status(500).json({
          success: false,
          status: 500,
          message: "Internal Server Error",
          error: "Not connected to socket.io server",
        });
      }
    } else {
      console.log("No socket mapping found for owner:", owner);
      return res.status(500).json({
        success: false,
        status: 500,
        message: "Internal Server Error",
        error: "Not connected to socket.io server",
      });
    }


    return res.status(200).json({
      success: true,
      status: 200,
      message: "AI response generated and sent",
      data: {
        prompt,
        response: aiResponse
      }
    });

  } catch (error) {
    return next({ error });
  }
};

