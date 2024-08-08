import crypto from 'crypto';
import dbClient from '../utils/db.js';
import AuthController from './AuthController.js';
import redisClient from '../utils/redis.js';
import { error } from 'console';
import {ObjectId} from 'mongodb'

class UsersController {
  static async postNew(req, res) {
    
    const { email, password } = req.body;

    if (!email) {
      console.log('Missing email');
      return res.status(400).json({ error: 'Missing email' });
    }

    if (!password) {
      console.log('Missing password');
      return res.status(400).json({ error: 'Missing password' });
    }

    try {
      if (!dbClient.db) {
        console.log('Database not connected');
        return res.status(500).json({ error: 'Database connection not established' });
      }

      const userExists = await dbClient.db.collection('users').findOne({ email });

      if (userExists) {
        console.log('Email already exists');
        return res.status(400).json({ error: 'Already exist' });
      }

      const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');
      const result = await dbClient.db.collection('users').insertOne({ email, password: hashedPassword });

      const user = result.insertedId;
      console.log('User created successfully:', user);
      return res.status(201).json({ id: user, email });
    } catch (err) {
      console.error('Error processing request:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getMe(req, res){
    const token = req.headers['x-token'];
    if(!token){
        return res.status(401).json({error: "Unauthorized"})
    }
    const userId = await redisClient.get(`auth_${token}`);

    if(!userId){
        return res.status(401).json({error: "Unauthorized"});
    }
    const user = dbClient.db.collection('users').findOne({_id: new ObjectId(userId)});
    if(!user){
        return res.status(401).json({error: 'Unauthorized'})
    }
    return res.status(200).json({id: user._id, email: user.email})
  }
}

export default UsersController;
