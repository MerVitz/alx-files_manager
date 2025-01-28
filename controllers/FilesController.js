import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import fs from 'fs';
import util from 'util';
import path from 'path';
import Bull from 'bull';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

// Promisify file system methods for async/await usage
const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);
const stat = util.promisify(fs.stat);
const readFile = util.promisify(fs.readFile);

// Default paths
const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
const fileQueue = new Bull('fileQueue');

class FilesController {
  /** Helper: Get userId from token */
  static async getUserFromToken(token) {
    if (!token) return null;
    const userId = await redisClient.get(`auth_${token}`);
    return userId || null;
  }

  /** Helper: Validate parent folder */
  static async validateParentFolder(parentId, userId) {
    if (parentId === 0) return null;

    const parentFile = await dbClient.files.findOne({ _id: parentId, userId });
    if (!parentFile) throw new Error('Parent not found');
    if (parentFile.type !== 'folder') throw new Error('Parent is not a folder');
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

  /** POST /files: Create a file or folder */
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    const userId = await FilesController.getUserFromToken(token);

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, type, parentId = 0, isPublic = false, data } = req.body;

    try {
      // Input validation
      if (!name) return res.status(400).json({ error: 'Missing name' });
      if (!type || !['folder', 'file', 'image'].includes(type)) {
        return res.status(400).json({ error: type ? 'Invalid type' : 'Missing type' });
      }
      if (type !== 'folder' && !data) {
        return res.status(400).json({ error: 'Missing data' });
      }

      // Validate parent folder
      await FilesController.validateParentFolder(parentId, userId);

      // Prepare file/folder data
      const file = {
        userId,
        name,
        type,
        isPublic,
        parentId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (type !== 'folder') {
        await FilesController.ensureFolderExists(FOLDER_PATH);
        const fileId = uuidv4();
        const filePath = path.join(FOLDER_PATH, fileId);
        await writeFile(filePath, Buffer.from(data, 'base64'));
        file.localPath = filePath;
      }

      // Insert into database
      const result = await dbClient.files.insertOne(file);
      return res.status(201).json({
        id: result.insertedId.toString(),
        ...file,
      });
    } catch (err) {
      console.error('Error creating file:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /** GET /files/:id: Retrieve file details */
  static async getShow(req, res) {
    const token = req.headers['x-token'];
    const userId = await FilesController.getUserFromToken(token);

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const file = await dbClient.files.findOne({ _id: req.params.id, userId });
      if (!file) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(file);
    } catch (err) {
      console.error('Error retrieving file:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /** GET /files/:id/data: Retrieve file content */
  static async getFile(req, res) {
    try {
      const file = await dbClient.files.findOne({ _id: req.params.id });
      if (!file || !(await FilesController.canAccessFile(req, file))) {
        return res.status(404).json({ error: 'Not found' });
      }

      if (file.type === 'folder') {
        return res.status(400).json({ error: 'A folder doesn’t have content' });
      }

      const size = req.query.size;
      const filePath = size && ['100', '250', '500'].includes(size)
        ? `${file.localPath}_${size}`
        : file.localPath;

      const content = await readFile(filePath);
      res.setHeader('Content-Type', mime.lookup(file.name) || 'application/octet-stream');
      return res.status(200).send(content);
    } catch (err) {
      console.error('Error retrieving file content:', err.message);
      return res.status(404).json({ error: 'Not found' });
    }
  }

  /** PUT /files/:id/publish */
  static async putPublish(req, res) {
    await FilesController.updateFileVisibility(req, res, true);
  }

  /** PUT /files/:id/unpublish */
  static async putUnpublish(req, res) {
    await FilesController.updateFileVisibility(req, res, false);
  }

  /** Helper: Update file visibility */
  static async updateFileVisibility(req, res, isPublic) {
    const token = req.headers['x-token'];
    const userId = await FilesController.getUserFromToken(token);

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const file = await dbClient.files.findOne({ _id: req.params.id, userId });
      if (!file) return res.status(404).json({ error: 'Not found' });

      await dbClient.files.updateOne({ _id: req.params.id }, { $set: { isPublic } });
      return res.status(200).json({ ...file, isPublic });
    } catch (err) {
      console.error(`Error updating visibility:`, err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /** Helper: Check file access (public or owner) */
  static async canAccessFile(req, file) {
    const userId = await FilesController.getUserFromToken(req.headers['x-token']);
    return file.isPublic || (userId && file.userId === userId);
  }
}

export default FilesController;
