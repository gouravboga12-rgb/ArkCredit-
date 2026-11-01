const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const { initSocket } = require('./services/socketService');
const consumerRoutes = require('./routes/consumerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Connect Database
connectDB();

// Initialize WebSocket engine (Pure WebSocket transport - 0 polling overhead)
initSocket(server);

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
    realtime: 'WebSocket online',
    s3MediaBucket: process.env.AWS_S3_MEDIA_BUCKET
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Server listening on http://127.0.0.1:${PORT}`);
});
