import redisClient from './utils/redis';

(async () => {
  console.log(redisClient.isAlive()); // Expected: true

  console.log(await redisClient.get('myKey')); // Expected: null (key doesn't exist yet)

  await redisClient.set('myKey', 12, 5); // Set "myKey" with value "12" and 5-second expiration
  console.log(await redisClient.get('myKey')); // Expected: 12 (key exists)

  setTimeout(async () => {
    console.log(await redisClient.get('myKey')); // Expected: null (key expired after 5 seconds)
  }, 10000); // Wait 10 seconds before checking
})();
