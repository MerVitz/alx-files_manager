import { createClient } from 'redis';

class RedisClient {
  constructor() {
    this.client = createClient();

    // Set event listeners
    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.client.on('ready', () => {
      console.log('Redis Client Connected');
    });

    // Connect the client
    this.client.connect().catch((err) => {
      console.error('Error connecting to Redis:', err);
    });
  }

  /**
   * Check if the Redis client is alive (connected).
   * @returns {boolean} true if connected, false otherwise.
   */
  isAlive() {
    return this.client.isOpen && this.client.connected;
  }

  /**
   * Get a value by key from Redis.
   * @param {string} key - The key to retrieve.
   * @returns {Promise<string | null>} The value associated with the key or null if not found.
   */
  async get(key) {
    try {
      return await this.client.get(key);
    } catch (err) {
      console.error(`Error getting key "${key}" from Redis:`, err);
      return null;
    }
  }

  /**
   * Set a key-value pair in Redis with an expiration time.
   * @param {string} key - The key to set.
   * @param {string | number} value - The value to set.
   * @param {number} duration - The expiration time in seconds.
   */
  async set(key, value, duration) {
    try {
      const valueAsString = value.toString(); // Convert value to string
      await this.client.set(key, valueAsString, { EX: duration });
    } catch (err) {
      console.error(`Error setting key "${key}" in Redis:`, err);
    }
  }

  /**
   * Delete a key from Redis.
   * @param {string} key - The key to delete.
   */
  async del(key) {
    try {
      await this.client.del(key);
    } catch (err) {
      console.error(`Error deleting key "${key}" from Redis:`, err);
    }
  }
}

// Export a single instance of RedisClient
const redisClient = new RedisClient();
export default redisClient;
