const { createDashboard } = require('./src/index');

const PORT = process.env.PORT || 3000;

// Create dashboard instance
const dashboard = createDashboard({
  port: PORT,
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
    db: process.env.REDIS_DB || 0,
    password: process.env.REDIS_PASSWORD
  },
  features: {
    authentication: false,
    websocket: true
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n Shutting down dashboard server...');
  
    try {
    await dashboard.stop();
    console.log(' Dashboard closed successfully');
    } catch (error) {
    console.error(' Error closing dashboard:', error.message);
  }
  
  process.exit(0);
});

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
  dashboard.start().catch(error => {
    console.error(' Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = dashboard;
