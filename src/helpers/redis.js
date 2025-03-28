const { client: client } = require('../database/redis').default

module.exports.setRedisData = async function (key, value) {
    await client.set(key, JSON.stringify(value))
    await client.expire(key, process.env.REDIS_AUTH_EXPIRATION_TIME)
}

module.exports.deleteRedisData = async (key) => await client.del(key)

module.exports.getRedisData = async (key) => {
    const result = await client.get(key)
    return JSON.parse(result)
}
