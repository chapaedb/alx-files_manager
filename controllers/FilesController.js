import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import dbClient from '../utils/db.js';
import redisClient from '../utils/redis.js';
import { error } from 'console';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    const { name, type, parentId = '0', isPublic = false, data } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    let parentFile = null;
    if (parentId !== '0') {
      parentFile = await dbClient.db.collection('files').findOne({ _id: dbClient.getObjectId(parentId) });
      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const fileData = {
      userId: dbClient.getObjectId(userId),
      name,
      type,
      isPublic,
      parentId,
    };

    if (type === 'folder') {
      await dbClient.db.collection('files').insertOne(fileData);
      return res.status(201).json(fileData);
    }

    // Ensure FOLDER_PATH exists
    await fs.mkdir(FOLDER_PATH, { recursive: true });

    const fileUuid = uuidv4();
    const filePath = path.join(FOLDER_PATH, fileUuid);
    await fs.writeFile(filePath, Buffer.from(data, 'base64'));

    fileData.localPath = filePath;
    const result = await dbClient.db.collection('files').insertOne(fileData);

    return res.status(201).json({
      id: result.insertedId,
      userId,
      ...fileData,
    });
  }
  static async getShow(req, res){
    const {id} = req.params;
    const token = req.headers['x-token'];
    if (!token){
        return res.status(401).json({error: "Unauthorized"});
    }
    const userId = await redisClient.get(`auth_${token}`)
    if(!userId){
        return res.status(401).json({error: "Unauthorized"})
    }

    const file = await dbClient.db.collection('files').findOne({_id: dbClient.getObjectId(id), userId});
    if(!file){
        return res.status(404).json({error: 'Not found'});
    }
    return res.status(200).json(file);


  }

  static async getIndex(req, res){
    const token = req.headers['x-token'];
    const {parentId = 0, page = 0} = req.query;
    if(!token){
        return res.status(401).json({error: "Unauthorized"});

    }
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const pageNumber = parseInt(page, 10) || 0;
    const pageSize = 20;

    const files = await dbClient.db.collection('files')
    .aggregate([
        { $match : { userId, parentId: dbClient.getObjectId(parentId)}},
        {$skip: pageNumber * pagesize},
        {$limit: pageSize}
    ]).toArray();
    return res.status(200).json(files)

  }
}

export default FilesController;
