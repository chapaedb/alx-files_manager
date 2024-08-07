const mongoose = require('mongoose');

class DBClient {
    constructor() {
        const host = process.env.DB_HOST || 'localhost';
        const port = process.env.DB_PORT || '27017';
        const database = process.env.DB_DATABASE || 'files_manager';
        this.client = mongoose.createConnection(`mongodb://${host}:${port}/${database}`);

        this.client.on('error', (error) => {
            console.log(`MongoDB error: ${error.message}`);
        });

        this.client.once('open', () => {
            console.log('Connected to MongoDB');
        });
    }

    isAlive() {
        return this.client.readyState === 1; // 1 means connected
    }

    async nbUsers() {
        if (!this.client) return 0;
        const count = await this.client.collection('users').countDocuments();
        return count;
    }

    async nbFiles() {
        if (!this.client) return 0;
        const count = await this.client.collection('files').countDocuments();
        return count;
    }
}

const dbClient = new DBClient();
module.exports = dbClient;
