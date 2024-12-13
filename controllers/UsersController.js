import { SHA1 } from 'crypto';
import dbClient from '../utils/db.js';

class UsersController {
    static async postNew(req, res) {
        const { email, password } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Missing email' });
        }

        if (!password) {
            return res.status(400).json({ error: 'Missing password' });
        }

        // Check if email already exists in DB
        const existingUser = await dbClient.db.collection('users').findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Already exist' });
        }

        // Hash the password and save the new user
        const hashedPassword = SHA1(password).toString();

        const newUser = await dbClient.db.collection('users').insertOne({
            email,
            password: hashedPassword
        });

        res.status(201).json({ id: newUser.insertedId, email });
    }
}

export default UsersController;
