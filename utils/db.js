import { MongoClient } from 'mongodb';

class DBClient {
    constructor() {
        // Get environment variables or use default values
        this.host = process.env.DB_HOST || 'localhost';
        this.port = process.env.DB_PORT || 27017;
        this.database = process.env.DB_DATABASE || 'files_manager';
        
        // MongoDB connection URL
        const url = `mongodb://${this.host}:${this.port}`;
        
        // Create a MongoClient instance
        this.client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
        this.db = null;
    }

    // Connect to the MongoDB server and select the database
    async connect() {
        try {
            await this.client.connect();
            this.db = this.client.db(this.database);
            return true;
        } catch (error) {
            console.error('MongoDB connection error:', error);
            return false;
        }
    }

    // Check if the connection to MongoDB is alive
    isAlive() {
        return this.db !== null;
    }

    // Get the number of documents in the "users" collection
    async nbUsers() {
        if (!this.isAlive()) return 0;
        const usersCollection = this.db.collection('users');
        const count = await usersCollection.countDocuments();
        return count;
    }

    // Get the number of documents in the "files" collection
    async nbFiles() {
        if (!this.isAlive()) return 0;
        const filesCollection = this.db.collection('files');
        const count = await filesCollection.countDocuments();
        return count;
    }
}

// Create and export an instance of DBClient
const dbClient = new DBClient();
export default dbClient;
