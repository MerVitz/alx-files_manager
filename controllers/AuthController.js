import { SHA1 } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis.js';
import dbClient from '../utils/db.js';

class AuthController {
    static async getConnect(req, res) {
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            return res.status(400).json({ error: 'Missing authorization header' });
        }

        const [email, password] = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
        const hashedPassword = SHA1(password).toString();

        // Look for the user in the database
        const user = await dbClient.db.collection('users').findOne({ email, password: hashedPassword });
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Generate a token and store it in Redis
        const token = uuidv4();
        await redisClient.set(`auth_${token}`, user._id.toString(), 'EX', 24 * 60 * 60); // 24 hours expiration

        res.status(200).json({ token });
    }

    static async getDisconnect(req, res) {
        const token = req.headers['x-token'];
        if (!token) {
            return res.status(400).json({ error: 'Missing token' });
        }

        // Delete the token from Redis
        await redisClient.del(`auth_${token}`);

        res.status(204).send();
    }

    static async getMe(req, res) {
        const token = req.headers['x-token'];
        if (!token) {
            return res.status(400).json({ error: 'Missing token' });
        }

        // Get user ID from Redis
        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Retrieve the user details from DB
        const user = await dbClient.db.collection('users').findOne({ _id: userId });
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        res.status(200).json({ id: user._id, email: user.email });
    }
}

export default AuthController;
