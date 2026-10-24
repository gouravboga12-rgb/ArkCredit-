const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

// Multer memory storage for in-memory buffer before S3 upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB max limit
});

/**
 * Uploads a file buffer directly to S3 bucket
 */
async function uploadToS3(fileBuffer, originalName, mimeType, folder = 'uploads') {
  const extension = path.extname(originalName);
  const cleanName = path.basename(originalName, extension).replace(/[^a-zA-Z0-9_-]/g, '');
  const key = `${folder}/${cleanName}-${Date.now()}${extension}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_MEDIA_BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType
  });

  await s3Client.send(command);

  // Return permanent public URL
  return `https://${process.env.AWS_S3_MEDIA_BUCKET}.s3.${process.env.AWS_REGION || 'ap-south-2'}.amazonaws.com/${key}`;
}

module.exports = {
  s3Client,
  upload,
  uploadToS3
};
