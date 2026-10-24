const express = require('express');
const router = express.Router();
const { upload, uploadToS3 } = require('../config/s3');

// POST /api/upload - Direct upload to AWS S3
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const folder = req.body.folder || 'documents';
    const s3Url = await uploadToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      folder
    );

    return res.json({
      success: true,
      url: s3Url,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (err) {
    console.error('S3 Upload Error:', err);
    return res.status(500).json({ error: 'Failed to upload to S3: ' + err.message });
  }
});

module.exports = router;
