const dateFns = require('date-fns')

// const timeZone = process.env.TIME_ZONE

const formatDate = function (dateString, format = 'dd-MM-yyyy') {
    return dateFns.format(dateString, format)
}

module.exports.formatDate = formatDate
