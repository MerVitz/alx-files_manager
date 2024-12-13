import Bull from 'bull';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import imageThumbnail from 'image-thumbnail';
import dbClient from './utils/db.js';
import redisClient from './utils/redis.js';

const fileQueue = new Bull('fileQueue');
const userQueue = new Bull('userQueue');

const UPLOAD_PATH = process.env.UPLOAD_PATH || '/tmp/files';

// Process fileQueue for image thumbnails
fileQueue.process(async (job) => {
  const { fileId, userId } = job.data;

  if (!fileId) throw new Error('Missing fileId');
  if (!userId) throw new Error('Missing userId');

  const file = await dbClient.files.findOne({ _id: fileId, userId });
  if (!file) throw new Error('File not found');
  if (file.type !== 'image') throw new Error('Not an image file');

  try {
    const originalFilePath = file.localPath;

    const sizes = [500, 250, 100];
    for (const size of sizes) {
      const options = { width: size };
      const thumbnail = await imageThumbnail(originalFilePath, options);

      const thumbnailPath = `${originalFilePath}_${size}`;
      await fs.writeFile(thumbnailPath, thumbnail);
    }

    console.log(`Thumbnails generated for fileId: ${fileId}`);
  } catch (error) {
    console.error(`Failed to generate thumbnails for fileId: ${fileId}`, error);
    throw error;
  }
});

// Process userQueue for welcome emails
userQueue.process(async (job) => {
  const { userId } = job.data;

  if (!userId) throw new Error('Missing userId');

  const user = await dbClient.users.findOne({ _id: userId });
  if (!user) throw new Error('User not found');

  const email = user.email;
  if (!email) throw new Error('User email not found');

  console.log(`Welcome ${email}!`);
  // In a real-world scenario, integrate with an email service like Mailgun or SendGrid here.
});

// Handle errors gracefully
fileQueue.on('failed', (job, err) => {
  console.error(`FileQueue job failed: ${job.id}`, err);
});

userQueue.on('failed', (job, err) => {
  console.error(`UserQueue job failed: ${job.id}`, err);
});

console.log('Worker is running and processing queues.');
