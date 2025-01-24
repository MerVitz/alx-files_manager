import { createClient } from 'redis';

class RedisClient {
  constructor() {
    this.client = createClient();

    this.isReady = false;
    this.readyPromise = new Promise((resolve, reject) => {
      this.client.on('ready', () => {
        this.isReady = true;
        console.log('Redis Client Connected');
        resolve();
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        reject(err);
      });
    });
  }

  async isAlive() {
    await this.readyPromise;
    return this.isReady;
  }

  async get(key) {
    await this.readyPromise;
    try {
      const value = await this.client.get(key);
      return value; // Returns the value as a string or null if the key doesn't exist
    } catch (err) {
      console.error('Error getting key from Redis:', err);
      return null;
    }
  }

  async set(key, value, duration) {
    await this.readyPromise;
    try {
      await this.client.set(key, value); // Sets the key-value pair
      if (duration) {
        await this.client.expire(key, duration); // Sets the expiration time
      }
    } catch (err) {
      console.error('Error setting key in Redis:', err);
    }
  }

  async del(key) {
    await this.readyPromise;
    try {
      await this.client.del(key); 
    } catch (err) {
      console.error('Error deleting key in Redis:', err);
    }
  }
}

const redisClient = new RedisClient();
export default redisClient;
