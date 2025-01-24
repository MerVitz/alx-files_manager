import { createClient } from 'redis';

class RedisClient {
  constructor() {
    this.client = createClient();

    // Handle connection errors
    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    // Log when connected
    this.client.on('connect', () => {
      console.log('Redis Client Connected');
    });
  }

  /**
   * Checks if the Redis client is alive
   * @returns {boolean} - True if connected, false otherwise
   */
  isAlive() {
    return this.client.isReady; // Check if the client is ready
  }

  /**
   * Retrieves a value by key from Redis
   * @param {string} key - The key to fetch
   * @returns {Promise<string|null>} - The value or null if not found
   */
  async get(key) {
    try {
      const value = await this.client.get(key);
      return value; // Will return `null` if the key doesn't exist
    } catch (err) {
      console.error('Error getting key from Redis:', err);
      return null; // Ensure `null` is returned on error
    }
  }

  /**
   * Sets a key with a value and optional expiration
   * @param {string} key - The key to set
   * @param {string|number} value - The value to set
   * @param {number} duration - Expiration time in seconds
   */
  async set(key, value, duration) {
    try {
      if (duration) {
        await this.client.set(key, value, { EX: duration }); // Set with expiration
      } else {
        await this.client.set(key, value); // Set without expiration
      }
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
      await this.client.del(key); // Delete the key
    } catch (err) {
      console.error('Error deleting key in Redis:', err);
    }
  }
}

// Export a singleton instance of the RedisClient
const redisClient = new RedisClient();
export default redisClient;
