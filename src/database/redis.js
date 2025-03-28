const {createClient } = require('redis')

const client = createClient({
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_ENDPOINT_URL,
        port: 16110
    }
});

client.on('error', err => console.log('Redis Client Error', err));
await client.connect();

client.on('connect', ()=> console.log('Redis connected successfully'));

module.exports = { client }
