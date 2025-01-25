import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AuthController {
  /**
   * Connects a user and generates a token
   * @param {Object} req - The request object
   * @param {Object} res - The response object
   */
  static async getConnect(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const base64Credentials = authHeader.split(' ')[1];
    const [email, password] = Buffer.from(base64Credentials, 'base64').toString().split(':');
    const hashedPassword = createHash('sha1').update(password).digest('hex');

    try {
      const user = await dbClient.db.collection('users').findOne({ email, password: hashedPassword });
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = uuidv4();
      await redisClient.set(`auth_${token}`, user._id.toString(), 'EX', 24 * 60 * 60);

      res.status(200).json({ token });
    } catch (error) {
      console.error('Error connecting user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Disconnects a user by deleting their token
   * @param {Object} req - The request object
   * @param {Object} res - The response object
   */
  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      await redisClient.del(`auth_${token}`);
      res.status(204).send();
    } catch (error) {
      console.error('Error disconnecting user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Retrieves the currently authenticated user
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
      console.error('Error retrieving user details:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default AuthController;
