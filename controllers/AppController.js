import dbClient from '../utils/db.js';
import redisClient from '../utils/redis.js';

class AppController {
    static async getStatus(req, res) {
        try {
            const redisStatus = redisClient.isAlive();
            const dbStatus = dbClient.isAlive();

            res.status(200).json({ redis: redisStatus, db: dbStatus });
        } catch (error) {
            res.status(500).json({ error: 'Error checking system status' });
        }
    }

    static async getStats(req, res) {
        try {
            const usersCount = await dbClient.nbUsers();
            const filesCount = await dbClient.nbFiles();

            res.status(200).json({ users: usersCount, files: filesCount });
        } catch (error) {
            res.status(500).json({ error: 'Error fetching statistics' });
        }
    }
}

export default AppController;
