const schedule = require('node-schedule')
const paystack = require('./../http/paystack')
const CustomError = require('../helpers/error')
const User = require('../models/User')
const { formatDate } = require('./../helpers/time')
const Token = require('../models/Token')
const Task = require('../models/Task')
const { Op } = require('sequelize');

const initiateCharge = function (user) {
  if (user.lastSubscriptionPlan !== 'premium') {
    console.log(`Skipping charge for user ${user.id}: Plan is ${user.lastSubscriptionPlan}`)
    return user
  }

  const amount = 999

  try {
    console.log(`Initiating charge of ${amount} for ${user.email}`)

    const charge = await paystack.chargeCard({
      email: user.email,
      amount: amount,
      authorization_code: user.chargeAuthCode,
      metadata: {
        id: user.id,
        type: user.lastSubscriptionPlan,
      },
    })

    if (charge instanceof CustomError) {
      user.willChargeAgain = false
    }

    return await user.save()
  } catch (error) {
    console.error(`Error processing charge for user ${user.id}:`, error)
  }
}

module.exports.initiateSubscriptionScheduler = async function (user) {
  if (!user || !user.lastSubscriptionExpiresAt) return

  const jobName = `subscription_job_${user.id}`
  const expirationDate = new Date(user.lastSubscriptionExpiresAt)

  schedule.cancelJob(jobName)

  const executeAction = async () => {
    try {
      if (user.chargeChannel === 'card') {
        const chargeFn = initiateCharge(user)
        await chargeFn()
      } else {
        user.category = 'user'
        await user.save()
      }
    } catch (error) {
      console.error(`Error executing subscription task for user ${user.id}:`, error)
    }
    if (expirationDate <= new Date()) {
      console.log(`Expiration date passed for user ${user.id}. Processing action immediately.`)
      await executeAction()
      return
    }

    schedule.scheduleJob(jobName, expirationDate, executeAction)
  }
}

module.exports.initiateAllSubscriptionScheduler = async function () {
  try {
    const users = await User.findAll({
      where: {
        autoCharge: true,
      },
    })

    for (const user of users) {
      await initiateSubscriptionScheduler(user)
    }
  } catch (error) {
    console.error('Failed to initialize all subscription schedulers:', error)
  }
}

module.exports.stopAutoCharge = async function (user) {
  user.autoCharge = false
  await user.save()

  const jobName = `subscription_job_${user.id}`
  const canceled = schedule.cancelJob(jobName)

  if (canceled) {
    console.log(`Auto-charge scheduled job canceled for user ${user.id}`)
  }
  console.log(`Auto Charge deactivated successfully for user ${user.id}`)
}

module.exports.updateTaskStatuses = async function () {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const [activeUpdatedCount] = await Task.update(
      { status: 'active' },
      {
        where: {
          startDate: { [Op.lte]: todayStr },
          endDate: { [Op.gte]: todayStr },
          status: { [Op.not]: 'active' } // Only update if status is not already active
        }
      }
    );

    const [endedUpdatedCount] = await Task.update(
      { status: 'ended' },
      {
        where: {
          endDate: { [Op.lt]: todayStr },
          status: { [Op.not]: 'ended' } // Only update if status is not already ended
        }
      }
    );

    console.log(
      `[${new Date().toISOString()}] Task status update completed. Active updated: ${activeUpdatedCount}, Ended updated: ${endedUpdatedCount}`
    );
  } catch (error) {
    console.error('Error updating task statuses:', error);
  }
};

module.exports.scheduleDailyTaskUpdate = function () {
  schedule.scheduleJob('0 6 * * *', () => {
    console.log('Running daily task status check...');
    module.exports.updateTaskStatuses();
  });
};
