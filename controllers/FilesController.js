import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import fs from 'fs';
import util from 'util';
import path from 'path';
import Bull from 'bull';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);
const stat = util.promisify(fs.stat);
const readFile = util.promisify(fs.readFile);

const UPLOAD_PATH = process.env.UPLOAD_PATH || '/tmp/files';
const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
const fileQueue = new Bull('fileQueue');

class FilesController {
  /** Helper: Get userId from token */
  static async getUserFromToken(token) {
    if (!token) return null;
    const userId = await redisClient.get(`auth_${token}`);
    return userId || null;
  }

  /** Helper: Validate and check parent folder */
  static async validateParentId(parentId, userId) {
    const parentFile = await dbClient.files.findOne({ _id: parentId, userId });
    if (!parentFile) {
      throw new Error('Parent not found');
    }
    if (parentFile.type !== 'folder') {
      throw new Error('Parent is not a folder');
    }
    return parentFile;
  }
  
  /** Helper: Ensure folder exists */
  static async ensureFolderExists(folderPath) {
    try {
      await stat(folderPath);
    } catch (err) {
      if (err.code === 'ENOENT') {
        await mkdir(folderPath, { recursive: true });
      } else {
        throw err;
      }
    }
  }

  /** Helper: Check file access (public or owner) */
  static async canAccessFile(req, file) {
    const userId = await FilesController.getUserFromToken(req.headers['x-token']);
    return file.isPublic || (userId && file.userId === userId);
  }

  /** POST /files: Upload a file or folder */
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    const userId = await FilesController.getUserFromToken(token);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  
    const { name, type, parentId = 0, isPublic = false, data } = req.body;
  
    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }
    if (!type) {
      return res.status(400).json({ error: 'Missing type' });
    }
    if (!['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type' });
    }
    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }
  
    // Validate parentId
    let parentFile = null;
    if (parentId !== 0) {
      try {
        parentFile = await FilesController.validateParentId(new ObjectId(parentId), userId);
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }
    }
  
    // Prepare file data
    const file = {
      userId,
      name,
      type,
      isPublic,
      parentId: parentId === 0 ? 0 : parentId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  
    try {
      // For files (not folders), write data to local storage
      if (type !== 'folder') {
        await FilesController.ensureFolderExists(FOLDER_PATH);
  
        const fileId = uuidv4();
        const filePath = path.join(FOLDER_PATH, fileId);
        await writeFile(filePath, Buffer.from(data, 'base64'));
        file.localPath = filePath;
      }
  
      // Insert file/folder into the database
      const result = await dbClient.files.insertOne(file);
  
      return res.status(201).json({
        id: result.insertedId.toString(),
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      });
    } catch (err) {
      console.error('Error uploading file:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  /** GET /files/:id: Retrieve file details */
  static async getShow(req, res) {
    const { userId } = await FilesController.getUserFromToken(req.headers['x-token']);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const file = await dbClient.files.findOne({ _id: req.params.id, userId });
    if (!file) return res.status(404).json({ error: 'Not found' });

    res.status(200).json(file);
  }

  /** GET /files/:id/data: Retrieve file content */
  static async getFile(req, res) {
    const file = await dbClient.files.findOne({ _id: req.params.id });
    if (!file || !(await FilesController.canAccessFile(req, file))) {
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
      const content = await readFile(filePath);
      const mimeType = mime.lookup(file.name) || 'application/octet-stream';
      res.setHeader('Content-Type', mimeType);
      return res.status(200).send(content);
    } catch {
      return res.status(404).json({ error: 'Not found' });
    }
  }

  /** PUT /files/:id/publish */
  static async putPublish(req, res) {
    const { userId } = await FilesController.getUserFromToken(req.headers['x-token']);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const file = await dbClient.files.findOne({ _id: req.params.id, userId });
    if (!file) return res.status(404).json({ error: 'Not found' });

    await dbClient.files.updateOne({ _id: req.params.id }, { $set: { isPublic: true } });
    return res.status(200).json({ ...file, isPublic: true });
  }

  /** PUT /files/:id/unpublish */
  static async putUnpublish(req, res) {
    const { userId } = await FilesController.getUserFromToken(req.headers['x-token']);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const file = await dbClient.files.findOne({ _id: req.params.id, userId });
    if (!file) return res.status(404).json({ error: 'Not found' });

    await dbClient.files.updateOne({ _id: req.params.id }, { $set: { isPublic: false } });
    return res.status(200).json({ ...file, isPublic: false });
  }
}

export default FilesController;
