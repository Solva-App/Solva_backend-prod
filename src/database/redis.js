async function createRedisClientConnect() {
    const { createClient } = await import('redis');

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

    client.on('connect', () => console.log('Redis connected successfully'));

    return client
}

const client = createRedisClientConnect();

export default { client }
