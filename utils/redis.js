import { createClient } from 'redis';

class RedisClient {
  constructor() {
    // Create the Redis client
    this.client = createClient();

    // Handle connection errors
    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    // Handle successful connection
    this.client.on('ready', () => {
      console.log('Redis Client Connected');
    });

    // Connect the client
    this.client.connect().catch((err) => {
      console.error('Error connecting to Redis:', err);
    });
  }

  /**
   * Checks if the Redis client is alive (connected and ready).
   * @returns {boolean} - True if connected, false otherwise.
   */
  isAlive() {
    return this.client.isReady;
  }

  /**
   * Retrieves a value by key from Redis.
   * @param {string} key - The key to fetch.
   * @returns {Promise<string|null>} - The value or null if not found.
   */
  async get(key) {
    try {
      const value = await this.client.get(key);
      return value || null; // Return null if the key doesn't exist
    } catch (err) {
      console.error('Error getting key from Redis:', err);
      return null;
    }
  }

  /**
   * Sets a key with a value and optional expiration in Redis.
   * @param {string} key - The key to set.
   * @param {string|number} value - The value to set.
   * @param {number} duration - Expiration time in seconds.
   */
  async set(key, value, duration) {
    try {
      if (duration) {
        await this.client.set(key, value, { EX: duration });
      } else {
        await this.client.set(key, value);
      }
    } catch (err) {
      console.error('Error setting key in Redis:', err);
    }
  }

  /**
   * Deletes a key from Redis.
   * @param {string} key - The key to delete.
   * @returns {Promise<void>}
   */
  async del(key) {
    try {
      await this.client.del(key);
    } catch (err) {
      console.error('Error deleting key in Redis:', err);
    }
  }
}

// Export a singleton instance of the RedisClient
const redisClient = new RedisClient();
export default redisClient;
