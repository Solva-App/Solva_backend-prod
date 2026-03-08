const CustomError = require('./../helpers/error')
const now = new Date();
const watTime = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'short',
  timeStyle: 'medium',
  timeZone: 'Africa/Lagos'
}).format(now);

module.exports = function (error, req, res, _next) {
  error = error.instance ? error.instance : error

  console.error('----------------------------------------------------------------')
  console.error(
    `[${watTime} WAT] Error triggered by`,
    req?.user?.fullName ?? req?.user?.username ?? 'none auth user',
    'with ID of',
    req?.user?.id,
    '\n\n'
  )
  console.error(req.body)
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
