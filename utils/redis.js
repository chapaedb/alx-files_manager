const { createClient } = require('redis');

class RedisClient {
  constructor() {
    this.client = createClient();
    this.client.on('error', (err) => console.error('Redis client not connected to the server:', err));

    this.client.connect().catch((err) => {
      console.error('Failed to connect to Redis server:', err);
    });

  }

  isAlive() {
    return this.client.isOpen;
  }

  async get(key) {
    return this.client.get(key);
  }

  async set(key, value, duration) {
    await this.client.set(key, value, { EX: duration });
  }

  async del(key) {
    await this.client.del(key);
  }
}

const redisClient = new RedisClient();
module.exports = redisClient;
