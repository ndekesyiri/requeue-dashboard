/**
 * ReQueue Dashboard - Main Entry Point
 * Real-time queue management and monitoring dashboard
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');

/**
 * Create a new ReQueue Dashboard instance
 * @param {Object} options - Configuration options
 * @param {number} options.port - Server port (default: 3000)
 * @param {Object} options.redis - Redis configuration
 * @param {string} options.redis.host - Redis host
 * @param {number} options.redis.port - Redis port
 * @param {number} options.redis.db - Redis database
 * @param {string} [options.redis.password] - Redis password
 * @param {Object} options.features - Feature flags
 * @param {boolean} options.features.authentication - Enable authentication
 * @param {boolean} options.features.websocket - Enable WebSocket
 * @param {Object} [options.features.rateLimit] - Rate limiting configuration
 * @param {Object} [options.security] - Security configuration
 * @param {string} [options.security.jwtSecret] - JWT secret key
 * @param {number} [options.security.bcryptRounds] - Bcrypt rounds
 * @returns {Object} Dashboard instance
 */
function createDashboard(options = {}) {
  const {
    port = 3000,
    redis = {
      host: 'localhost',
      port: 6379,
      db: 0
    },
    features = {
      authentication: false,
      websocket: true
    },
    security = {
      jwtSecret: 'your-secret-key',
      bcryptRounds: 12
    }
  } = options;

  const app = express();
  const server = http.createServer(app);
  const io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

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
    windowMs: features.rateLimit?.windowMs || 15 * 60 * 1000,
    max: features.rateLimit?.max || 1000,
    message: 'Too many requests from this IP, please try again later.'
  });

  // Middleware
  app.use(cors());
  app.use(limiter);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(express.static(path.join(__dirname, '../public')));

  // Initialize QueueManager
  let qm = null;
  let connectedClients = new Set();

  async function initializeQueueManager() {
    try {
      // Try to require the main ReQueue package
      const createQueueManager = require('requeue');
      
      qm = await createQueueManager({
        redis: {
          host: redis.host,
          port: redis.port,
          db: redis.db,
          password: redis.password
        },
        cache: {
          enabled: true,
          strategy: 'write-through',
          maxSize: 1000,
          ttl: 300000
        }
      });
      
      console.log('QueueManager initialized successfully');
      
      // Setup real-time event listeners
      if (features.websocket) {
        setupRealtimeEvents();
      }
    } catch (error) {
      console.error('Failed to initialize QueueManager:', error.message);
      console.log('Dashboard will run in demo mode');
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
  if (features.websocket) {
    io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);
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
        console.log(`Client ${socket.id} subscribed to queue ${queueId}`);
      });
      
      socket.on('unsubscribeQueue', (queueId) => {
        socket.leave(`queue:${queueId}`);
        console.log(`Client ${socket.id} unsubscribed from queue ${queueId}`);
      });
      
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        connectedClients.delete(socket.id);
      });
    });
  }

  // Helper function to get system stats
  async function getSystemStats() {
    if (!qm) {
      return {
        system: {
          totalQueues: 0,
          totalJobs: 0,
          activeJobs: 0,
          failedJobs: 0,
          connectedClients: connectedClients.size
        }
      };
    }

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
  app.get('/api/health', async (req, res) => {
    try {
      const health = qm ? await qm.healthCheck() : { status: 'demo' };
      res.json(health);
    } catch (error) {
      res.status(500).json({ 
        status: 'unhealthy',
        error: error.message 
      });
    }
  });

  app.get('/api/system/stats', async (req, res) => {
    try {
      const stats = await getSystemStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/queues', async (req, res) => {
    try {
      if (!qm) {
        return res.json({ queues: [], total: 0 });
      }
      const queues = await qm.getAllQueues({ limit: 1000 });
      res.json(queues);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/queues', [
    body('name').notEmpty().withMessage('Queue name is required'),
    body('queueId').notEmpty().withMessage('Queue ID is required')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!qm) {
        return res.status(503).json({ error: 'QueueManager not available' });
      }

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

  app.delete('/api/queues/:queueId', async (req, res) => {
    try {
      if (!qm) {
        return res.status(503).json({ error: 'QueueManager not available' });
      }
      await qm.deleteQueue(req.params.queueId);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/jobs', async (req, res) => {
    try {
      if (!qm) {
        return res.json([]);
      }
      
      const { limit = 100 } = req.query;
      const allJobs = [];
      
      const queues = await qm.getAllQueues({ limit: 1000 });
      
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
      
      allJobs.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
      res.json(allJobs.slice(0, parseInt(limit)));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/activity/recent', async (req, res) => {
    try {
      if (!qm) {
        return res.json([]);
      }
      
      const { limit = 20 } = req.query;
      const activity = [];
      
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
      
      activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      res.json(activity.slice(0, parseInt(limit)));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Serve dashboard
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });

  // Error handling middleware
  app.use((error, req, res, next) => {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  });

  // Dashboard instance
  const dashboard = {
    app,
    server,
    io,
    start: async () => {
      await initializeQueueManager();
      
      return new Promise((resolve) => {
        server.listen(port, () => {
          console.log(`ReQueue Dashboard running on http://localhost:${port}`);
          console.log(`Dashboard: http://localhost:${port}`);
          console.log(`API: http://localhost:${port}/api`);
          if (features.websocket) {
            console.log(`WebSocket: ws://localhost:${port}`);
          }
          console.log(`Health: http://localhost:${port}/api/health`);
          resolve();
        });
      });
    },
    stop: async () => {
      return new Promise((resolve) => {
        server.close(() => {
          if (qm) {
            qm.close().then(() => {
              console.log('Dashboard stopped');
              resolve();
            });
          } else {
            console.log('Dashboard stopped');
            resolve();
          }
        });
      });
    }
  };

  return dashboard;
}

module.exports = {
  createDashboard
};
