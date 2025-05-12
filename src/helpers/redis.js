const {redisClient} = require('../database/redis')

module.exports.setRedisData = async function (key, value) {
    await redisClient.set(key, JSON.stringify(value))
    await redisClient.expire(key, process.env.REDIS_AUTH_EXPIRATION_TIME)
}

module.exports.deleteRedisData = async function (key) {
    await redisClient.del(key)
} 

module.exports.getRedisData = async function (key){
    let result = await redisClient.get(key);

    if(result){
        return JSON.parse(result);
    }
    return null;
}