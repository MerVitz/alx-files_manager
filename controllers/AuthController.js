import sha1 from 'sha1';
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
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const base64Credentials = authHeader.split(' ')[1];
      const decodedCredentials = Buffer.from(base64Credentials.trim(), 'base64').toString('binary').trim();
      const separatorIndex = decodedCredentials.indexOf(':');

      if (separatorIndex === -1) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const email = decodedCredentials.substring(0, separatorIndex);
      const password = decodedCredentials.substring(separatorIndex + 1);

      if (!email || !password) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const hashedPassword = sha1(password.trim());

      // Ensure database is connected before query
      const isConnected = await dbClient.db.command({ ping: 1 });
      if (!isConnected) {
        return res.status(500).json({ error: 'Database not connected' });
      }

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

      console.log('Storing token in Redis:', token, 'for user:', userId);

      try {
        await redisClient.setex(`auth_${token}`, 86400, userId);
        console.log('Token successfully stored in Redis');
        return res.status(200).json({ token });
      } catch (error) {
        console.error('Error setting token in Redis:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
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
      // Check if the token exists in Redis
      const exists = await redisClient.get(`auth_${token}`);
      if (!exists) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Token exists, now delete it
      await redisClient.del(`auth_${token}`);

      return res.status(204).send(); // No content on success
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
