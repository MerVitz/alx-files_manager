import dbClient from '../utils/db.js';
import redisClient from '../utils/redis.js';

class AppController {
    static async getStatus(req, res) {
        try {
            const redisStatus = redisClient.isAlive(); // Check if Redis is alive
            const dbStatus = await dbClient.isAlive(); // Check if DB is alive

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

