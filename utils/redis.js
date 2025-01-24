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
  }

  /**
   * Checks if the Redis client is connected
   * @returns {boolean} - True if connected, false otherwise
   */
  isAlive() {
    return this.client.isReady; // Use isReady (Redis v4+ API)
  }

  /**
   * Retrieves a value by key from Redis
   * @param {string} key - The key to fetch
   * @returns {Promise<string|null>} - The value or null if not found
   */
  async get(key) {
    try {
      const value = await this.client.get(key); // Fetch the value
      return value; // Return value directly
    } catch (err) {
      console.error('Error getting key from Redis:', err);
      return null;
    }
  }

  /**
   * Sets a key with a value and expiration time
   * @param {string} key - The key to set
   * @param {string|number} value - The value to set
   * @param {number} duration - Expiration time in seconds
   */
  async set(key, value, duration) {
    try {
      await this.client.setEx(key, duration, value); // Use setEx for atomic operation
    } catch (err) {
      console.error('Error setting key in Redis:', err);
    }
  }

  /**
   * Deletes a key from Redis
   * @param {string} key - The key to delete
   */
  async del(key) {
    try {
      await this.client.del(key);
    } catch (err) {
      console.error('Error deleting key in Redis:', err);
    }
  }
}

// Create and export an instance of RedisClient
const redisClient = new RedisClient();
export default redisClient;
