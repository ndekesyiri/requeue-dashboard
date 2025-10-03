/**
 * ReQueue Dashboard Integration Examples
 * Demonstrates how to use the dashboard in your applications
 */

const { createDashboard } = require('../src/index');

// Example 1: Basic Dashboard Setup
async function basicExample() {
  console.log('Starting basic dashboard example...');
  
  const dashboard = createDashboard({
    port: 3000,
    redis: {
      host: 'localhost',
      port: 6379,
      db: 0
    },
    features: {
      authentication: false,
      websocket: true
    }
  });

  try {
    await dashboard.start();
    console.log('Dashboard started successfully!');
    console.log('Visit: http://localhost:3000');
  } catch (error) {
    console.error('Failed to start dashboard:', error);
  }
}

// Example 2: Dashboard with Authentication
async function authExample() {
  console.log('Starting dashboard with authentication...');
  
  const dashboard = createDashboard({
    port: 3001,
    redis: {
      host: 'localhost',
      port: 6379,
      db: 0
    },
    features: {
      authentication: true,
      websocket: true
    },
    security: {
      jwtSecret: 'your-super-secret-key',
      bcryptRounds: 12
    }
  });

  try {
    await dashboard.start();
    console.log('Authenticated dashboard started!');
    console.log('Visit: http://localhost:3001');
  } catch (error) {
    console.error('Failed to start authenticated dashboard:', error);
  }
}

// Example 3: Custom Configuration
async function customExample() {
  console.log('Starting dashboard with custom configuration...');
  
  const dashboard = createDashboard({
    port: 3002,
    redis: {
      host: 'redis.example.com',
      port: 6379,
      db: 1,
      password: 'your-redis-password'
    },
    features: {
      authentication: true,
      websocket: true,
      rateLimit: {
        windowMs: 5 * 60 * 1000, // 5 minutes
        max: 500 // 500 requests per window
      }
    },
    security: {
      jwtSecret: process.env.JWT_SECRET || 'fallback-secret',
      bcryptRounds: 14
    }
  });

  try {
    await dashboard.start();
    console.log('Custom dashboard started!');
    console.log('Visit: http://localhost:3002');
  } catch (error) {
    console.error('Failed to start custom dashboard:', error);
  }
}

// Example 4: Programmatic Control
async function programmaticExample() {
  console.log('Starting programmatic dashboard example...');
  
  const dashboard = createDashboard({
    port: 3003,
    redis: {
      host: 'localhost',
      port: 6379,
      db: 0
    }
  });

  try {
    await dashboard.start();
    console.log('Programmatic dashboard started!');
    
    // Access the Express app
    const app = dashboard.app;
    
    // Add custom routes
    app.get('/api/custom', (req, res) => {
      res.json({ message: 'Custom endpoint from dashboard' });
    });
    
    // Access WebSocket
    const io = dashboard.io;
    io.on('connection', (socket) => {
      console.log('Custom connection handler:', socket.id);
    });
    
    // Graceful shutdown after 30 seconds
    setTimeout(async () => {
      console.log('Shutting down dashboard...');
      await dashboard.stop();
      process.exit(0);
    }, 30000);
    
  } catch (error) {
    console.error('Failed to start programmatic dashboard:', error);
  }
}

// Example 5: Integration with Express App
async function expressIntegrationExample() {
  console.log('Starting Express integration example...');
  
  const express = require('express');
  const mainApp = express();
  
  // Your main application
  mainApp.get('/', (req, res) => {
    res.json({ message: 'Main application' });
  });
  
  // Create dashboard
  const dashboard = createDashboard({
    port: 3004,
    redis: {
      host: 'localhost',
      port: 6379,
      db: 0
    }
  });
  
  try {
    await dashboard.start();
    
    // Mount dashboard on subpath
    mainApp.use('/dashboard', dashboard.app);
    
    // Start main app on different port
    const mainServer = mainApp.listen(8080, () => {
      console.log('Main app: http://localhost:8080');
      console.log('Dashboard: http://localhost:8080/dashboard');
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down...');
      mainServer.close();
      await dashboard.stop();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Failed to start Express integration:', error);
  }
}

// Run examples based on command line argument
const example = process.argv[2] || 'basic';

switch (example) {
  case 'basic':
    basicExample();
    break;
  case 'auth':
    authExample();
    break;
  case 'custom':
    customExample();
    break;
  case 'programmatic':
    programmaticExample();
    break;
  case 'express':
    expressIntegrationExample();
    break;
  default:
    console.log('Available examples:');
    console.log('  node examples/integration.js basic');
    console.log('  node examples/integration.js auth');
    console.log('  node examples/integration.js custom');
    console.log('  node examples/integration.js programmatic');
    console.log('  node examples/integration.js express');
}
