import redis from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = redis.createClient();

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
    });

    // Promisify methods
    this.setex = promisify(this.client.setex).bind(this.client);
    this.get = promisify(this.client.get).bind(this.client);
    this.del = promisify(this.client.del).bind(this.client);
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, value) => {
        if (err) {
          console.error('Error getting key from Redis:', err);
          reject(new Error('Error getting key from Redis'));
        } else {
          resolve(value);
        }
      });
    });
  }

  async set(key, value, duration) {
    return new Promise((resolve, reject) => {
      this.client.set(key, value, 'EX', duration, (err) => {
        if (err) {
          console.error('Error setting key in Redis:', err);
          reject(new Error('Error setting key in Redis'));
        } else {
          resolve();
        }
      });
    });
  }

  async del(key) {
    return new Promise((resolve, reject) => {
      this.client.del(key, (err) => {
        if (err) {
          console.error('Error deleting key in Redis:', err);
          reject(new Error('Error deleting key in Redis'));
        } else {
          resolve();
        }
      });
    });
  }
}

const redisClient = new RedisClient();
export default redisClient;
