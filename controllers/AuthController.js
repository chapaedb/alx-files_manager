import redisClient from "../utils/redis.js";
import dbClient from "../utils/db.js";
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

class AuthController {
    static async getConnect(req, res) {
        const authHeader = req.headers.authorization || '';
        if (!authHeader || !authHeader.startsWith('Basic ')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const rawCredentials = authHeader.split(' ')[1];
        const credentials = Buffer.from(rawCredentials, 'base64').toString('ascii');
        const [email, password] = credentials.split(':');

        if (!email || !password) {
            return res.status(401).send('Unauthorized');
        }

        const sha1Password = crypto.createHash('sha1').update(password).digest('hex');
        console.log('Email:', email);
console.log('SHA1 Password:', sha1Password);

        const user = await dbClient.db.collection('users').findOne({ email, password: sha1Password });

        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const token = uuidv4();
        await redisClient.set(`auth_${token}`, user._id.toString(), 24 * 60 * 60);

        return res.status(200).json({ token });
    }

    static async getDisconnect(req, res) {
        const token = req.headers['x-token'];

        if (!token) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const userId = await redisClient.get(`auth_${token}`);
    if(!userId){
        return res.status(401).json({ error: "Unauthorized"});

    }
    await redisClient.del(`auth_${token}`);
    return res.status(204).send()
}

}

export default AuthController;