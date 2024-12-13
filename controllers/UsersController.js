import { createHash } from 'crypto';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db.js';
import redisClient from '../utils/redis.js';

class UsersController {
  /**
   * Creates a new user
   * @param {Object} req - The request object
   * @param {Object} res - The response object
   */
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    try {
      // Check if the user already exists
      const existingUser = await dbClient.db.collection('users').findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Already exist' });
      }

      // Hash the password
      const hash = createHash('sha1');
      const hashedPassword = hash.update(password).digest('hex');

      // Insert the new user
      const newUser = await dbClient.db.collection('users').insertOne({
        email,
        password: hashedPassword,
        createdAt: new Date(),
      });

      res.status(201).json({ id: newUser.insertedId, email });

      // Add a job to the userQueue for sending a welcome email
      const userQueue = require('../workers/worker.js').userQueue;
      await userQueue.add({ userId: newUser.insertedId });

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Gets the currently logged-in user
   * @param {Object} req - The request object
   * @param {Object} res - The response object
   */
  static async getMe(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const user = await dbClient.db.collection('users').findOne({ _id: new ObjectId(userId) });
      if (!user) {
        return res.status(404).json({ error: 'Not found' });
      }

      res.status(200).json({ id: user._id, email: user.email });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default UsersController;
