const CustomError = require('./../helpers/error')

function maskSensitiveData(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  const cloned = Array.isArray(obj) ? [...obj] : { ...obj };
  const sensitiveKeys = ['password', 'confirmpassword', 'token', 'cvv', 'pin', 'oldpassword', 'newpassword'];

  for (const key in cloned) {
    if (Object.prototype.hasOwnProperty.call(cloned, key)) {
      if (sensitiveKeys.includes(key.toLowerCase())) {
        cloned[key] = '[CONCEALED]';
      } else if (typeof cloned[key] === 'object') {
        cloned[key] = maskSensitiveData(cloned[key]);
      }
    }
  }
  return cloned;
}

module.exports = function (error, req, res, _next) {
  error = error.instance ? error.instance : error

  const now = new Date();
  const watTime = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: 'Africa/Lagos'
  }).format(now);

  console.error('----------------------------------------------------------------')
  console.error(
    `[${watTime} WAT] Error triggered by`,
    req?.user?.fullName ?? req?.user?.username ?? 'none auth user',
    'with ID of',
    req?.user?.id,
    '\n\n'
  )

  if (req.body) {
    console.error('Request Body:', maskSensitiveData(req.body));
  }

  console.error(error)
  console.error('----------------------------------------------------------------')

  if (error instanceof CustomError) {
    return res.status(error.status).send(error)
  }

  return res.status(500).send({
    message: 'something went wrong',
    status: 500,
    success: false,
    error: error.message,
  })
}