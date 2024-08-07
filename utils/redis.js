// utils/redis.js
const redis = require('redis');
const { promisify } = require('util');

class RedisClient {
    constructor() {
        this.client = redis.createClient();

        this.client.on('error', (error) => {
            console.log(`Redis could not connect to the server: ${error.message}`);
        });

        // Promisify the Redis client methods
        this.getAsync = promisify(this.client.get).bind(this.client);
        this.setAsync = promisify(this.client.set).bind(this.client);
        this.delAsync = promisify(this.client.del).bind(this.client);
    }

    isAlive() {
        // Redis does not have a built-in isConnected method
        // This is a simple way to check if the client is alive
        return this.client.connected;
    }

    async get(key) {
        return await this.getAsync(key);
    }

    async set(key, value, duration) {
        await this.setAsync(key, value, 'EX', duration);
    }

    async del(key) {
        await this.delAsync(key);
    }
}

const redisClient = new RedisClient();
module.exports = redisClient;
