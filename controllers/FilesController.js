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
  static async getShow(req, res) {
    const token = req.headers['x-token'];
    const { id } = req.params;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const file = await dbClient.db.collection('files').findOne({ _id: dbClient.getObjectId(id), userId });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.status(200).json(file);
  }

  static async getIndex(req, res) {
    const token = req.headers['x-token'];
    const { parentId = 0, page = 0 } = req.query;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const pageNumber = parseInt(page, 10) || 0;
    const pageSize = 20;

    const files = await dbClient.db.collection('files')
      .aggregate([
        { $match: { userId, parentId: dbClient.getObjectId(parentId) } },
        { $skip: pageNumber * pageSize },
        { $limit: pageSize }
      ])
      .toArray();

    return res.status(200).json(files);
  }
  static async putPublish(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;
    const fileCollection = dbClient.db.collection('files');
    const file = await fileCollection.findOne({ _id: dbClient.objectId(fileId), userId });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    await fileCollection.updateOne({ _id: dbClient.objectId(fileId) }, { $set: { isPublic: true } });
    const updatedFile = await fileCollection.findOne({ _id: dbClient.objectId(fileId) });

    return res.status(200).json({
      id: updatedFile._id,
      userId: updatedFile.userId,
      name: updatedFile.name,
      type: updatedFile.type,
      isPublic: updatedFile.isPublic,
      parentId: updatedFile.parentId,
    });
  }

  static async putUnpublish(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;
    const fileCollection = dbClient.db.collection('files');
    const file = await fileCollection.findOne({ _id: dbClient.objectId(fileId), userId });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    await fileCollection.updateOne({ _id: dbClient.objectId(fileId) }, { $set: { isPublic: false } });
    const updatedFile = await fileCollection.findOne({ _id: dbClient.objectId(fileId) });

    return res.status(200).json({
      id: updatedFile._id,
      userId: updatedFile.userId,
      name: updatedFile.name,
      type: updatedFile.type,
      isPublic: updatedFile.isPublic,
      parentId: updatedFile.parentId,
    });
  }

  static async getFile(req, res) {
    const { id } = req.params;
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    
    const fileCollection = dbClient.db.collection('files');
    const file = await fileCollection.findOne({ _id: dbClient.objectId(id) });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    // Check if file is a folder
    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    // Check if file is not public and user is either not authenticated or not the owner
    if (!file.isPublic && (!userId || userId !== file.userId.toString())) {
      return res.status(404).json({ error: 'Not found' });
    }

    // Check if file exists on disk
    const filePath = path.join('/path/to/upload/directory', file.localPath); // Replace with actual upload directory
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Not found' });
    }

    // Get MIME type of the file
    const mimeType = mime.lookup(file.name);
    if (!mimeType) {
      return res.status(400).json({ error: 'Cannot determine MIME type' });
    }

    // Return the file content with the correct MIME type
    res.setHeader('Content-Type', mimeType);
    const fileContent = fs.readFileSync(filePath);
    return res.status(200).send(fileContent);
  }
}

export default FilesController;
