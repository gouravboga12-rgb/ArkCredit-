const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const consumerRoutes = require('./routes/consumerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Mount API routes
app.use('/api/consumer', consumerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    project: 'AKR Credit Capital Backend',
    timestamp: new Date().toISOString(),
    database: 'MongoDB connected',
    s3MediaBucket: process.env.AWS_S3_MEDIA_BUCKET
  });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Server listening on http://127.0.0.1:${PORT}`);
});
