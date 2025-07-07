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
    let token = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZnVsbE5hbWUiOiJBZGFvYmkgQ2h1a3d1IiwiZ2VuZGVyIjpudWxsLCJhZGRyZXNzIjpudWxsLCJpc0FkbWluIjpmYWxzZSwicGhvbmUiOiIwODAxMjM0NTY3OCIsInJlZmVycmFsQ29kZSI6IjU4MEY4QiIsImlzQWN0aXZlIjp0cnVlLCJjYXRlZ29yeSI6InVzZXIiLCJpc1N1c3BlbmRlZCI6ZmFsc2UsInJvbGUiOiJ1c2VyIiwiYmFsYW5jZSI6MCwiY2hhcmdlQ2hhbm5lbCI6bnVsbCwiY2hhcmdlQXV0aENvZGUiOm51bGwsImxhc3RTdWJzY3JpcHRpb25QbGFuIjpudWxsLCJhdXRvQ2hhcmdlIjpmYWxzZSwibGFzdFN1YnNjcmlwdGlvbkV4cGlyZXNBdCI6bnVsbCwiY3JlYXRlZEF0IjoiMjAyNS0wNy0wNFQxMjozNzoxNC4wMDBaIiwidXBkYXRlZEF0IjoiMjAyNS0wNy0wNFQxMjozNzoxNC4wMDBaIiwiaWF0IjoxNzUxODgzNDI5LCJleHAiOjE3NTE4ODUyMjl9.sHUiwS8-3SlYVheVv6fMS7L23yFqraoqO3Qboksb-ro";

    if (token.startsWith("Bearer ")) {
      token = token.split(" ")[1];
    }

    if (!token) {
      return next(new Error("Socket auth error: No token"));
    }

    const data = await Token.verify(token);
    socket.user = data.user;

    return next();
  } catch (error) {
    return next(new Error("Socket auth error: Invalid token"));
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
