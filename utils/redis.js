const redis = require('redis');
const { promisify } = require('util');

class RedisClient {
    constructor() {
        this.client = redis.createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379'
        });

        this.client.on('error', (error) => {
            console.log(`Redis could not connect to the server: ${error.message}`);
        });

        this.client.on('connect', () => {
            console.log('Redis connected successfully');
        });

        // Promisify the Redis client methods
        this.getAsync = promisify(this.client.get).bind(this.client);
        this.setAsync = promisify(this.client.set).bind(this.client);
        this.delAsync = promisify(this.client.del).bind(this.client);
    }

    isAlive() {
        return this.client.connected;
    }

    async get(key) {
        try {
            const value = await this.getAsync(key);
            return value;
        } catch (error) {
            console.error(`Error getting key ${key}: ${error.message}`);
            return null;
        }
    }

    async set(key, value, duration) {
        try {
            await this.setAsync(key, value, 'EX', duration);
        } catch (error) {
            console.error(`Error setting key ${key}: ${error.message}`);
        }
    }

    async del(key) {
        try {
            await this.delAsync(key);
        } catch (error) {
            console.error(`Error deleting key ${key}: ${error.message}`);
        }
    }
}

const redisClient = new RedisClient();
module.exports = redisClient;
