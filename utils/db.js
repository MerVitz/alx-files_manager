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

    // Connect to the database
    this.connect();
  }

  async connect() {
    try {
      await this.client.connect();
      this.db = this.client.db(this.database);
      console.log('MongoDB connected successfully');
    } catch (err) {
      console.error('MongoDB connection error:', err);
    }
  }

  // Check if the connection to MongoDB is alive
  isAlive() {
    return this.db && this.client.topology.isConnected();
  }

  // Get the number of documents in the "users" collection
  async nbUsers() {
    if (!this.isAlive()) return 0;
    return this.db.collection('users').countDocuments();
  }

  // Get the number of documents in the "files" collection
  async nbFiles() {
    if (!this.isAlive()) return 0;
    return this.db.collection('files').countDocuments();
  }

  // Close the connection when the application stops
  async close() {
    await this.client.close();
    console.log('MongoDB connection closed');
  }
}

// Create and export an instance of DBClient
const dbClient = new DBClient();
export default dbClient;
