const User = require("../models/User");
const Job = require("../models/Job");
const Cashout = require("../models/Cashout");
const { OK } = require('http-status-codes')

module.exports.getStats = async function (req, res, next) {
  try {
    const [totalJobs, approvedCashouts, totalUsers] = await Promise.all([
      Job.count(),
      Cashout.sum('amount', {
        where: {
          status: 'approved',
        },
      }),
      User.count(),
    ]);

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'Stats fetched successfully',
      data: {
        totalJobs,
        approvedCashouts,
        totalUsers,
      },
    });
  } catch (error) {
    return next({ error });
  }
}
