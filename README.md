#  ReQueue Dashboard

> **Real-time queue management and monitoring dashboard for ReQueue**

[![npm version](https://badge.fury.io/js/%40requeue%2Fdashboard.svg)](https://badge.fury.io/js/%40requeue%2Fdashboard)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/@requeue/dashboard)](https://nodejs.org/)

A powerful, real-time dashboard for monitoring and managing your ReQueue instances.

## Features  (What it i can do)

###  Real-time Monitoring
- **Live Statistics**: Queue counts, job status, system health
- **WebSocket Updates**: Instant notifications for all queue events
- **Performance Metrics**: Throughput, latency, error rates
- **Activity Feed**: Real-time job and queue activity

###  Advanced Management
- **Queue Operations**: Create, pause, resume, delete queues
- **Job Management**: Add, cancel, monitor jobs across queues
- **Bulk Operations**: Multi-select operations for efficiency
- **Search & Filtering**: Advanced job and queue filtering

###  Security & Authentication
- **Role-based Access**: Viewer, Operator, Admin roles
- **JWT Authentication**: Secure token-based auth
- **Rate Limiting**: API protection against abuse
- **Input Validation**: Comprehensive data validation

###  Modern UI/UX
- **Responsive Design**: Works on desktop, tablet, mobile
- **Progressive Web App**: Offline capability, push notifications
- **Dark/Light Themes**: User preference support
- **Touch Gestures**: Mobile-optimized interactions

###  Production Ready
- **Docker Support**: Containerized deployment
- **Health Checks**: System monitoring endpoints
- **Error Handling**: Graceful error recovery
- **Logging**: Comprehensive audit trails

##  Quick Start

### Installation

```bash
# Install globally
npm install -g @requeue/dashboard

# Or install locally
npm install @requeue/dashboard
```

### Basic Usage

```bash
# Start dashboard with default settings
requeue-dashboard start

# Start on custom port
requeue-dashboard start --port 8080

# Start with custom Redis config
requeue-dashboard start --redis-host redis.example.com --redis-port 6379
```

### Programmatic Usage

```javascript
const { createDashboard } = require('@requeue/dashboard');

const dashboard = createDashboard({
  port: 3000,
  redis: {
    host: 'localhost',
    port: 6379,
    db: 0
  },
  features: {
    authentication: true,
    websocket: true
  }
});

dashboard.start().then(() => {
  console.log('Dashboard running on http://localhost:3000');
});
```

## 📖 Documentation

### Configuration

Create a `config.json` file:

```json
{
  "port": 3000,
  "redis": {
    "host": "localhost",
    "port": 6379,
    "db": 0,
    "password": "optional"
  },
  "features": {
    "authentication": true,
    "websocket": true,
    "rateLimit": {
      "windowMs": 900000,
      "max": 1000
    }
  },
  "security": {
    "jwtSecret": "your-secret-key",
    "bcryptRounds": 12
  }
}
```

### Environment Variables

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=optional

# Security
JWT_SECRET=your-secret-key
BCRYPT_ROUNDS=12

# Features
ENABLE_AUTH=true
ENABLE_WEBSOCKET=true
```

### API Endpoints

#### System Information
- `GET /api/health` - Health check
- `GET /api/system/stats` - System statistics
- `GET /api/activity/recent` - Recent activity

#### Queue Management
- `GET /api/queues` - List all queues
- `POST /api/queues` - Create new queue
- `GET /api/queues/:id` - Get specific queue
- `DELETE /api/queues/:id` - Delete queue
- `POST /api/queues/:id/pause` - Pause queue
- `POST /api/queues/:id/resume` - Resume queue

#### Job Management
- `GET /api/jobs` - List all jobs
- `GET /api/queues/:id/jobs` - Get queue jobs
- `POST /api/queues/:id/jobs` - Add job to queue
- `POST /api/queues/:id/jobs/:jobId/cancel` - Cancel job

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/register` - Register new user

##  Advanced Usage

### Custom Themes

```css
/* Custom CSS variables */
:root {
  --primary-color: #667eea;
  --secondary-color: #764ba2;
  --success-color: #28a745;
  --warning-color: #ffc107;
  --danger-color: #dc3545;
  --background-color: #ffffff;
  --text-color: #333333;
}
```

### WebSocket Events

```javascript
const socket = io('http://localhost:3000');

// Listen for real-time updates
socket.on('queueCreated', (data) => {
  console.log('New queue created:', data);
});

socket.on('jobAdded', (data) => {
  console.log('New job added:', data);
});

socket.on('jobProcessed', (data) => {
  console.log('Job processed:', data);
});
```

### Custom Middleware

```javascript
const dashboard = createDashboard({
  // ... config
  middleware: [
    (req, res, next) => {
      // Custom middleware
      next();
    }
  ]
});
```

##  Docker Deployment

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/
COPY public/ ./public/

EXPOSE 3000

CMD ["npm", "start"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  dashboard:
    build: .
    ports:
      - "3000:3000"
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
```

##  Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run linting
npm run lint
```

##  Monitoring

### Health Checks

```bash
# Basic health check
curl http://localhost:3000/api/health

# Detailed system stats
curl http://localhost:3000/api/system/stats
```

### Metrics Endpoints

- `/api/metrics/performance` - Performance metrics
- `/api/metrics/queues` - Queue-specific metrics
- `/api/metrics/jobs` - Job processing metrics

##  Security

### Authentication Setup

```javascript
// Create admin user
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const adminUser = {
  username: 'admin',
  password: await bcrypt.hash('secure-password', 12),
  role: 'admin'
};
```

### Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
```

##  Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request


##  Support

- **Website**: [https://ndekesyiri.github.io/requeue/](https://ndekesyiri.github.io/requeue/)
- **Documentation**: [https://github.com/ndekesyiri/requeue-dashboard](https://github.com/ndekesyiri/requeue-dashboard)
- **Issues**: [https://github.com/ndekesyiri/requeue-dashboard/issues](https://github.com/ndekesyiri/requeue-dashboard/issues)
- **Discussions**: [https://github.com/ndekesyiri/requeue-dashboard/discussions](https://github.com/ndekesyiri/requeue-dashboard/discussions)

##  Acknowledgments

- Built for the [ReQueue](https://github.com/ndekesyiri/requeue) project

---

**Made with ❤️ by ndekesyiri**