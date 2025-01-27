import { createHash } from 'crypto';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
  /**
   * Creates a new user
   * @param {Object} req - The request object
   * @param {Object} res - The response object
   * @returns {Object} JSON response
   */
  static async postNew(req, res) {
    const { email, password } = req.body;

    // Validate email and password presence
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    try {
      // Check if user already exists
      const existingUser = await dbClient.db.collection('users').findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Already exist' });
      }

      // Hash the password and insert a new user
      const hashedPassword = createHash('sha1').update(password).digest('hex');
      const newUser = await dbClient.db.collection('users').insertOne({
        email,
        password: hashedPassword,
        createdAt: new Date().toISOString(),
      });

      // Return success response
      return res.status(201).json({ id: newUser.insertedId.toString(), email });
    } catch (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Gets the currently authenticated user
   * @param {Object} req - The request object
   * @param {Object} res - The response object
   * @returns {Object} JSON response
   */
  static async getMe(req, res) {
    const token = req.headers['x-token'];

    // Validate the presence of a token
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      // Retrieve the user ID from Redis
      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Find the user by ID
      const user = await dbClient.db.collection('users').findOne({ _id: new ObjectId(userId) });
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Return user details
      return res.status(200).json({ id: user._id.toString(), email: user.email });
    } catch (error) {
      console.error('Error fetching user:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default UsersController;
