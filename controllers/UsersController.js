import redisClient from '../utils/redis.js';
import dbClient from '../utils/db.js';
import crypto from 'crypto';
import { ObjectId } from 'mongodb';

class UsersController {
  // Method to create a new user
  static async postNew(req, res) {
    try {
      const { email, password } = req.body;
  
      if (!email) {
        return res.status(400).json({ error: 'Missing email' });
      }
  
      if (!password) {
        return res.status(400).json({ error: 'Missing password' });
      }
  
      const existingUser = await dbClient.db.collection('users').findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Already exist' });
      }
  
      const sha1Password = crypto.createHash('sha1').update(password).digest('hex');
      const newUser = { email, password: sha1Password };
      const result = await dbClient.db.collection('users').insertOne(newUser);
  
      return res.status(201).json({ id: result.insertedId, email: newUser.email });
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  // Method to retrieve user details
  static async getMe(req, res) {
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(200).json({ email: user.email, id: user._id });
  }
}

export default UsersController;
