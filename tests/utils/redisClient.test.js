import redisClient from '../../utils/redis.js';

describe('Redis Client', () => {
  it('should connect to Redis', async () => {
    const isAlive = await redisClient.isAlive();
    expect(isAlive).toBe(true);
  });

  it('should set and get a value', async () => {
    await redisClient.set('testKey', 'testValue', 10);
    const value = await redisClient.get('testKey');
    expect(value).toBe('testValue');
  });
});
