const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';

    const url = `mongodb://${host}:${port}`;
    this.client = new MongoClient(url, { useUnifiedTopology: true });

    this.client.connect()
      .then(() => {
        console.log('Connected to MongoDB');
        this.db = this.client.db(database);
      })
      .catch((err) => {
        console.error('MongoDB connection error:', err);
      });
  }

  isAlive() {
    return this.client.isConnected();
  }

  async nbUsers() {
    return this.db.collection('users').countDocuments();
  }

  async nbFiles() {
    return this.db.collection('files').countDocuments();
  }
  getObjectId(id) {
    return new ObjectId(id);
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
