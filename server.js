import express from 'express';
import routes from './routes/index.js';
import dbClient from './utils/db.js';
import redisClient from './utils/redis.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware to parse JSON
app.use(express.json());

// Load all routes
app.use(routes);

// Start server
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
});
