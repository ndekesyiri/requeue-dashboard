/**
 * QueueManager Dashboard API Server
 * Simple Express server to provide API endpoints for the dashboard
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const createQueueManager = require('../src/index');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(cors());
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// Initialize QueueManager
let qm = null;
let connectedClients = new Set();

async function initializeQueueManager() {
  try {
    qm = await createQueueManager({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        db: process.env.REDIS_DB || 0
      },
      cache: {
        enabled: true,
        strategy: 'write-through',
        maxSize: 1000,
        ttl: 300000
      }
    });
    console.log(' QueueManager initialized successfully');
    
    // Setup real-time event listeners
    setupRealtimeEvents();
  } catch (error) {
    console.error(' Failed to initialize QueueManager:', error.message);
    process.exit(1);
  }
}

// Setup real-time event listeners
function setupRealtimeEvents() {
  if (!qm || !qm.eventEmitter) return;
  
  // Global events
  qm.eventEmitter.on('queueCreated', (data) => {
    io.emit('queueCreated', data);
  });
  
  qm.eventEmitter.on('queueDeleted', (data) => {
    io.emit('queueDeleted', data);
  });
  
  qm.eventEmitter.on('queuePaused', (data) => {
    io.emit('queuePaused', data);
  });
  
  qm.eventEmitter.on('queueResumed', (data) => {
    io.emit('queueResumed', data);
  });
  
  qm.eventEmitter.on('jobAdded', (data) => {
    io.emit('jobAdded', data);
  });
  
  qm.eventEmitter.on('jobProcessed', (data) => {
    io.emit('jobProcessed', data);
  });
  
  qm.eventEmitter.on('jobFailed', (data) => {
    io.emit('jobFailed', data);
  });
  
  qm.eventEmitter.on('jobCancelled', (data) => {
    io.emit('jobCancelled', data);
  });
}

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(` Client connected: ${socket.id}`);
  connectedClients.add(socket.id);
  
  // Send initial data
  socket.emit('connected', { message: 'Connected to ReQueue Dashboard' });
  
  // Handle client requests
  socket.on('getStats', async () => {
    try {
      const stats = await getSystemStats();
      socket.emit('statsUpdate', stats);
    } catch (error) {
      socket.emit('error', { message: 'Failed to get stats' });
    }
  });
  
  socket.on('subscribeQueue', (queueId) => {
    socket.join(`queue:${queueId}`);
    console.log(` Client ${socket.id} subscribed to queue ${queueId}`);
  });
  
  socket.on('unsubscribeQueue', (queueId) => {
    socket.leave(`queue:${queueId}`);
    console.log(` Client ${socket.id} unsubscribed from queue ${queueId}`);
  });
  
  socket.on('disconnect', () => {
    console.log(` Client disconnected: ${socket.id}`);
    connectedClients.delete(socket.id);
  });
});

// Helper function to get system stats
async function getSystemStats() {
  try {
    const systemStats = await qm.getSystemStats();
    const queues = await qm.getAllQueues({ limit: 1000 });
    
    let totalJobs = 0;
    let activeJobs = 0;
    let failedJobs = 0;
    
    for (const queue of queues.queues) {
      try {
        const queueStats = await qm.getQueueStats(queue.id);
        totalJobs += queueStats.itemCount || 0;
        
        const jobs = await qm.getQueueItems(queue.id, 0, 1000);
        jobs.forEach(job => {
          if (job.status === 'processing' || job.status === 'pending') {
            activeJobs++;
          } else if (job.status === 'failed' || job.status === 'timed_out') {
            failedJobs++;
          }
        });
      } catch (error) {
        console.warn(`Failed to get stats for queue ${queue.id}:`, error.message);
      }
    }
    
    return {
      ...systemStats,
      system: {
        ...systemStats.system,
        totalJobs,
        activeJobs,
        failedJobs,
        totalQueues: queues.total || 0,
        connectedClients: connectedClients.size
      }
    };
  } catch (error) {
    console.error('Failed to get system stats:', error);
    throw error;
  }
}

// API Routes

// Get all queues
app.get('/api/queues', async (req, res) => {
  try {
    const queues = await qm.getAllQueues({ limit: 1000 });
    res.json(queues);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific queue
app.get('/api/queues/:queueId', async (req, res) => {
  try {
    const queue = await qm.getQueue(req.params.queueId);
    res.json(queue);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Create queue
app.post('/api/queues', async (req, res) => {
  try {
    const { name, queueId, description, maxSize } = req.body;
    const queue = await qm.createQueue(name, queueId, {
      description,
      maxSize: maxSize || 10000
    });
    res.json(queue);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete queue
app.delete('/api/queues/:queueId', async (req, res) => {
  try {
    await qm.deleteQueue(req.params.queueId);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Pause queue
app.post('/api/queues/:queueId/pause', async (req, res) => {
  try {
    await qm.pauseQueue(req.params.queueId, {
      reason: 'Dashboard pause',
      pauseScheduledJobs: true
    });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Resume queue
app.post('/api/queues/:queueId/resume', async (req, res) => {
  try {
    await qm.resumeQueue(req.params.queueId);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get queue jobs
app.get('/api/queues/:queueId/jobs', async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const jobs = await qm.getQueueItems(req.params.queueId, offset, offset + parseInt(limit) - 1);
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add job to queue
app.post('/api/queues/:queueId/jobs', async (req, res) => {
  try {
    const { data, priority } = req.body;
    const job = await qm.addToQueue(req.params.queueId, data, {
      priority: priority || 0
    });
    res.json(job);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Cancel job
app.post('/api/queues/:queueId/jobs/:jobId/cancel', async (req, res) => {
  try {
    await qm.cancelJobs(req.params.queueId, [req.params.jobId]);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all jobs (across all queues)
app.get('/api/jobs', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const allJobs = [];
    
    // Get all queues
    const queues = await qm.getAllQueues({ limit: 1000 });
    
    // Get jobs from each queue
    for (const queue of queues.queues) {
      try {
        const jobs = await qm.getQueueItems(queue.id, 0, parseInt(limit) - 1);
        jobs.forEach(job => {
          allJobs.push({
            ...job,
            queueId: queue.id,
            queueName: queue.name
          });
        });
      } catch (error) {
        console.warn(`Failed to get jobs from queue ${queue.id}:`, error.message);
      }
    }
    
    // Sort by added date (newest first)
    allJobs.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
    
    res.json(allJobs.slice(0, parseInt(limit)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get system statistics
app.get('/api/system/stats', async (req, res) => {
  try {
    const systemStats = await qm.getSystemStats();
    
    // Calculate additional stats
    const queues = await qm.getAllQueues({ limit: 1000 });
    let totalJobs = 0;
    let activeJobs = 0;
    let failedJobs = 0;
    
    for (const queue of queues.queues) {
      try {
        const queueStats = await qm.getQueueStats(queue.id);
        totalJobs += queueStats.itemCount || 0;
        
        // Get job status breakdown
        const jobs = await qm.getQueueItems(queue.id, 0, 1000);
        jobs.forEach(job => {
          if (job.status === 'processing' || job.status === 'pending') {
            activeJobs++;
          } else if (job.status === 'failed' || job.status === 'timed_out') {
            failedJobs++;
          }
        });
      } catch (error) {
        console.warn(`Failed to get stats for queue ${queue.id}:`, error.message);
      }
    }
    
    res.json({
      ...systemStats,
      system: {
        ...systemStats.system,
        totalJobs,
        activeJobs,
        failedJobs,
        totalQueues: queues.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recent activity
app.get('/api/activity/recent', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const activity = [];
    
    // Get recent jobs from all queues
    const queues = await qm.getAllQueues({ limit: 1000 });
    
    for (const queue of queues.queues) {
      try {
        const jobs = await qm.getQueueItems(queue.id, 0, 10);
        jobs.forEach(job => {
          activity.push({
            type: 'Job',
            description: `Job ${job.id} in ${queue.name}`,
            status: job.status,
            timestamp: job.addedAt,
            queueId: queue.id
          });
        });
      } catch (error) {
        console.warn(`Failed to get activity from queue ${queue.id}:`, error.message);
      }
    }
    
    // Sort by timestamp and limit
    activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json(activity.slice(0, parseInt(limit)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const health = await qm.healthCheck();
    res.json(health);
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message 
    });
  }
});

// Serve dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('API Error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n Shutting down dashboard server...');
  
  if (qm) {
    try {
      await qm.close();
      console.log(' QueueManager closed successfully');
    } catch (error) {
      console.error(' Error closing QueueManager:', error.message);
    }
  }
  
  process.exit(0);
});

// Start server
async function startServer() {
  await initializeQueueManager();
  
  server.listen(PORT, () => {
    console.log(` ReQueue Dashboard running on http://localhost:${PORT}`);
    console.log(` Dashboard: http://localhost:${PORT}`);
    console.log(`🔗 API: http://localhost:${PORT}/api`);
    console.log(` WebSocket: ws://localhost:${PORT}`);
    console.log(`❤️  Health: http://localhost:${PORT}/api/health`);
  });
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(' Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(' Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
if (require.main === module) {
  startServer().catch(error => {
    console.error(' Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = app;
