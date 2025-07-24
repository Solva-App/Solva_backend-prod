const CustomError = require('../helpers/error')
const Token = require('../models/Token')

module.exports.auth = async function (req, res, next) {
  try {
    // extract access token from header
    const authorization = req.headers.authorization
    if (!authorization) return next(CustomError.badRequest(`${req.method}:${req.originalUrl} Requires Authentication!`, null, false))

    const accessToken = authorization.split('Bearer ')[1]
    // verify access token
    const data = await Token.verify(accessToken)

    if (data instanceof CustomError) return next(data)
    else if (!data.user) return next(CustomError.unauthorizedRequest('User deleted by admin!', null, false))

    req.user = data.user
    req.token = data.token

    return next()
  } catch (error) {
    next({ error })
  }
}

module.exports.socketAuth = async function (socket, next) {
  try {
    let token = socket.handshake.auth?.token || socket.handshake.headers?.token

    if (token.startsWith("Bearer ")) {
      token = token.split(" ")[1];
    }

    if (!token) {
      return next(new Error("Socket auth error: No token"));
    }

    const data = await Token.verify(token);
    if (data instanceof CustomError) return next(data)
    else if (!data.user) return next(CustomError.unauthorizedRequest('Invalid socket connection!', null, false))

    socket.user = data.user;

    return next();
  } catch (error) {
    next({ error })
  }
};


module.exports.isAdmin = async function (req, res, next) {
  try {
    if (!req.user.isAdmin) {
      return next(CustomError.unauthorizedRequest('endpoint reserved for admins only'))
    }
    return next()
  } catch (error) {
    return next({ error })
  }
}
