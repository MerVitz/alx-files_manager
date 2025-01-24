import { createClient } from 'redis';

class RedisClient {
  constructor() {
    this.client = createClient();

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
    });

    this.connectRedis();
  }

  async connectRedis() {
    try {
      await this.client.connect();
      console.log('Connected to Redis successfully');
    } catch (err) {
      console.error('Failed to connect to Redis:', err);
    }
  }

  isAlive() {
    return this.client.isReady;  // `isReady` correctly indicates Redis connection status
  }

  async get(key) {
    try {
      const value = await this.client.get(key);
      return value !== null ? value : null;
    } catch (err) {
      console.error('Error getting key from Redis:', err);
      return null;
    }
  }

  async set(key, value, duration) {
    try {
      await this.client.set(key, value.toString(), {
        EX: duration,  // Use expiration (EX) correctly
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
