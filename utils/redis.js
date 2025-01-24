import { createClient } from 'redis';

class RedisClient {
  constructor() {
    this.client = createClient();

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.client.on('ready', () => {
      console.log('Redis Client Connected');
    });

    this.client.connect().catch((err) => {
      console.error('Redis connection failed:', err);
    });
  }

  isAlive() {
    return this.client.isReady;  // Correct property for checking Redis connection
  }

  async get(key) {
    try {
      const value = await this.client.get(key);
      return value !== null ? value : null;  // Ensures proper null handling
    } catch (err) {
      console.error('Error getting key from Redis:', err);
      return null;
    }
  }

  async set(key, value, duration) {
    try {
      await this.client.set(key, value.toString(), {
        EX: duration,  // Use expiration correctly in one command
      });
    } catch (err) {
      console.error('Error setting key in Redis:', err);
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
    } catch (err) {
      console.error('Error deleting key in Redis:', err);
    }
  }
}

const redisClient = new RedisClient();
export default redisClient;
