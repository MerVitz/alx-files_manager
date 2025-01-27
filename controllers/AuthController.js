import { createHash } from 'crypto';
import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AuthController {
  /**
   * Connects a user and generates an authentication token
   * @param {Object} req - The request object
   * @param {Object} res - The response object
   * @returns {Object} JSON response with the token or an error
   */
  static async getConnect(req, res) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const base64Credentials = authHeader.split(' ')[1];
      const [email, password] = Buffer.from(base64Credentials, 'base64').toString('utf-8').split(':');

      if (!email || !password) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const hashedPassword = createHash('sha1').update(password).digest('hex');

      // Fetch user from the database
      const user = await dbClient.db.collection('users').findOne({
        email,
        password: hashedPassword,
      });

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Generate token and store it in Redis
      const token = uuidv4();
      const userId = user._id.toString();

      // Correct Redis SET command with expiration in seconds (24 hours = 86400 seconds)
      await redisClient.set(`auth_${token}`, userId, 'EX', 86400);

      return res.status(200).json({ token });
    } catch (error) {
      console.error('Error during authentication:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Disconnects a user by invalidating their token
   * @param {Object} req - The request object
   * @param {Object} res - The response object
   * @returns {void} Responds with 204 on success or an error
   */
  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      // Delete token from Redis
      const deleted = await redisClient.del(`auth_${token}`);

      if (!deleted) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      return res.status(204).send(); // No content
    } catch (error) {
      console.error('Error during disconnect:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Retrieves the authenticated user's details
   * @param {Object} req - The request object
   * @param {Object} res - The response object
   * @returns {Object} JSON response with user details or an error
   */
  static async getMe(req, res) {
    const token = req.headers['x-token'];

    // Check if the token is provided
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      // Retrieve the user ID from Redis
      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Find the user in the database by their ID
      const user = await dbClient.db.collection('users').findOne({ _id: new ObjectId(userId) });
      if (!user) {
        return res.status(404).json({ error: 'Not found' });
      }

      // Return user details (id and email only)
      return res.status(200).json({ id: user._id.toString(), email: user.email });
    } catch (error) {
      console.error('Error fetching user details:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default AuthController;
