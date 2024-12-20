import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import fs from 'fs/promises';
import path from 'path';
import imageThumbnail from 'image-thumbnail';
import dbClient from '../utils/db.js';
import redisClient from '../utils/redis.js';
import Bull from 'bull';

const UPLOAD_PATH = process.env.UPLOAD_PATH || '/tmp/files';
const fileQueue = new Bull('fileQueue');

class FilesController {
  static async postUpload(req, res) {
    const { userId } = await FilesController.getUserFromToken(req.headers['x-token']);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, type, parentId = 0, isPublic = false, data } = req.body;
    if (!name) return res.status(400).json({ error: 'Missing name' });
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing or invalid type' });
    }
    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    let parentFile = null;
    if (parentId) {
      parentFile = await dbClient.files.findOne({ _id: parentId, userId });
      if (!parentFile || parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent not found or not a folder' });
      }
    }

    const file = {
      userId,
      name,
      type,
      isPublic,
      parentId: parentId === 0 ? 0 : parentId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (type !== 'folder') {
      const fileId = uuidv4();
      const filePath = path.join(UPLOAD_PATH, fileId);
      await fs.writeFile(filePath, Buffer.from(data, 'base64'));
      file.localPath = filePath;

      if (type === 'image') {
        fileQueue.add({ fileId, userId });
      }
    }

    const result = await dbClient.files.insertOne(file);
    res.status(201).json({
      id: result.insertedId,
      userId,
      name,
      type,
      isPublic,
      parentId: parentId === 0 ? 0 : parentId,
    });
  }

  static async getIndex(req, res) {
    const { userId } = await FilesController.getUserFromToken(req.headers['x-token']);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const parentId = req.query.parentId || 0;
    const page = parseInt(req.query.page, 10) || 0;

    const files = await dbClient.files
      .find({ userId, parentId })
      .skip(page * 20)
      .limit(20)
      .toArray();

    res.status(200).json(files);
  }

  static async getShow(req, res) {
    const { userId } = await FilesController.getUserFromToken(req.headers['x-token']);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const file = await dbClient.files.findOne({ _id: req.params.id, userId });
    if (!file) return res.status(404).json({ error: 'Not found' });

    res.status(200).json(file);
  }

  static async putPublish(req, res) {
    await FilesController.updateFilePublishStatus(req, res, true);
  }

  static async putUnpublish(req, res) {
    await FilesController.updateFilePublishStatus(req, res, false);
  }

  static async getFile(req, res) {
    const file = await dbClient.files.findOne({ _id: req.params.id });
    if (!file || (file.isPublic === false && !(await FilesController.isFileOwner(req, file)))) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (file.type === 'folder') {
      return res.status(400).json({ error: 'A folder doesn’t have content' });
    }

    const size = req.query.size;
    let filePath = file.localPath;

    if (size && ['100', '250', '500'].includes(size)) {
      filePath = `${file.localPath}_${size}`;
    }

    try {
      const content = await fs.readFile(filePath);
      const mimeType = mime.lookup(file.name) || 'application/octet-stream';
      res.setHeader('Content-Type', mimeType);
      res.status(200).send(content);
    } catch (err) {
      res.status(404).json({ error: 'Not found' });
    }
  }

  static async updateFilePublishStatus(req, res, publishStatus) {
    const { userId } = await FilesController.getUserFromToken(req.headers['x-token']);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const file = await dbClient.files.findOne({ _id: req.params.id, userId });
    if (!file) return res.status(404).json({ error: 'Not found' });

    await dbClient.files.updateOne(
      { _id: req.params.id },
      { $set: { isPublic: publishStatus, updatedAt: new Date() } }
    );

    file.isPublic = publishStatus;
    res.status(200).json(file);
  }

  static async getUserFromToken(token) {
    if (!token) return {};
    const userId = await redisClient.get(`auth_${token}`);
    return userId ? { userId } : {};
  }

  static async isFileOwner(req, file) {
    const { userId } = await FilesController.getUserFromToken(req.headers['x-token']);
    return userId === file.userId;
  }
}

export default FilesController;
