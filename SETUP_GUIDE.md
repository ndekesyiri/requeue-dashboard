# ReQueue Dashboard Setup Guide

## Overview

The ReQueue Dashboard is a separate, standalone package that provides a real-time web interface for monitoring and managing ReQueue instances. This guide will help you set up the dashboard as an independent project.

## Repository Structure

```
requeue-dashboard/
├── package.json              # Dashboard package configuration
├── README.md                 # Dashboard documentation
├── SETUP_GUIDE.md           # This setup guide
├── src/
│   └── server.js            # Enhanced server with all features
├── public/
│   ├── index.html           # Enhanced dashboard UI
│   ├── script.js            # WebSocket + advanced features
│   ├── manifest.json        # PWA manifest
│   └── sw.js               # Service worker
├── bin/
│   └── requeue-dashboard    # CLI installation tool
└── examples/
    └── integration.js      # Integration examples
```

## Quick Start

### 1. Create New Repository

```bash
# Create new repository on GitHub
gh repo create ndekesyiri/requeue-dashboard --public --description "Real-time dashboard for ReQueue - Advanced queue management and monitoring"

# Clone and setup
git clone https://github.com/ndekesyiri/requeue-dashboard.git
cd requeue-dashboard
```

### 2. Copy Dashboard Files

```bash
# Copy all dashboard files from the main project
cp -r /Users/ndekesyiri/Repos/QueueManager/dashboard/* .
```

### 3. Initialize Git Repository

```bash
# Initialize git
git init
git add .
git commit -m "Initial commit: ReQueue Dashboard v1.0.0"

# Add remote
git remote add origin https://github.com/ndekesyiri/requeue-dashboard.git
git branch -M main
git push -u origin main
```

### 4. Publish to NPM

```bash
# Login to npm
npm login

# Publish package
npm publish --access public
```

## Installation Methods

### Method 1: NPM Package (Recommended)

```bash
# Install globally
npm install -g @requeue/dashboard

# Create new dashboard project
requeue-dashboard create my-dashboard

# Start dashboard
cd my-dashboard
npm start
```

### Method 2: Direct Installation

```bash
# Install package
npm install @requeue/dashboard

# Use programmatically
const { createDashboard } = require('@requeue/dashboard');

const dashboard = createDashboard({
  port: 3000,
  redis: {
    host: 'localhost',
    port: 6379,
    db: 0
  }
});

dashboard.start();
```

### Method 3: Docker

```bash
# Build image
docker build -t requeue-dashboard .

# Run container
docker run -p 3000:3000 \
  -e REDIS_HOST=redis \
  -e REDIS_PORT=6379 \
  requeue-dashboard
```

## Configuration

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

### Configuration File

Create `config.json`:

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

## Features Implemented

### ✅ Completed Features

1. **WebSocket Integration**
   - Real-time updates for all queue events
   - Live statistics and monitoring
   - Connection status indicators

2. **Progressive Web App (PWA)**
   - Offline capability with service worker
   - App manifest for mobile installation
   - Push notifications support

3. **Enhanced UI/UX**
   - Dark/Light theme support
   - Responsive design for all devices
   - Advanced filtering and search
   - Real-time notifications

4. **Security Features**
   - Rate limiting with express-rate-limit
   - Security headers with helmet
   - Input validation with express-validator
   - CORS protection

5. **CLI Tool**
   - Easy installation and setup
   - Project creation with templates
   - Configuration management

### 🔄 Pending Features

1. **Authentication System**
   - JWT-based authentication
   - Role-based access control
   - User management

2. **Advanced Analytics**
   - Performance metrics
   - Historical data analysis
   - Custom dashboards

3. **Bulk Operations**
   - Multi-select operations
   - Batch job management
   - Export functionality

4. **Mobile Enhancements**
   - Touch gestures
   - Offline mode
   - Mobile-specific UI

## API Endpoints

### System Information
- `GET /api/health` - Health check
- `GET /api/system/stats` - System statistics
- `GET /api/activity/recent` - Recent activity

### Queue Management
- `GET /api/queues` - List all queues
- `POST /api/queues` - Create new queue
- `GET /api/queues/:id` - Get specific queue
- `DELETE /api/queues/:id` - Delete queue
- `POST /api/queues/:id/pause` - Pause queue
- `POST /api/queues/:id/resume` - Resume queue

### Job Management
- `GET /api/jobs` - List all jobs
- `GET /api/queues/:id/jobs` - Get queue jobs
- `POST /api/queues/:id/jobs` - Add job to queue
- `POST /api/queues/:id/jobs/:jobId/cancel` - Cancel job

### WebSocket Events
- `queueCreated` - Queue creation events
- `queueDeleted` - Queue deletion events
- `jobAdded` - Job addition events
- `jobProcessed` - Job completion events
- `jobFailed` - Job failure events

## Development

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

### Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Deployment

### Docker Deployment

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

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: requeue-dashboard
spec:
  replicas: 3
  selector:
    matchLabels:
      app: requeue-dashboard
  template:
    metadata:
      labels:
        app: requeue-dashboard
    spec:
      containers:
      - name: dashboard
        image: requeue/dashboard:latest
        ports:
        - containerPort: 3000
        env:
        - name: REDIS_HOST
          value: "redis-service"
        - name: REDIS_PORT
          value: "6379"
```

## Integration with Main Project

### Update Main README

Add dashboard reference to the main ReQueue README:

```markdown
## Dashboard

For a real-time web interface, install the ReQueue Dashboard:

```bash
npm install -g @requeue/dashboard
requeue-dashboard create my-dashboard
```

[View Dashboard Documentation](https://github.com/ndekesyiri/requeue-dashboard)
```

### Package Dependencies

The dashboard requires the main ReQueue package:

```json
{
  "peerDependencies": {
    "requeue": "^1.0.0"
  }
}
```

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check if Socket.IO is properly configured
   - Verify CORS settings
   - Check firewall rules

2. **Redis Connection Error**
   - Verify Redis is running
   - Check connection parameters
   - Test Redis connectivity

3. **PWA Not Working**
   - Ensure HTTPS in production
   - Check manifest.json
   - Verify service worker registration

### Debug Mode

```bash
# Enable debug logging
DEBUG=requeue:* npm start

# Check WebSocket connection
curl http://localhost:3000/socket.io/

# Test API endpoints
curl http://localhost:3000/api/health
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- **Documentation**: [GitHub Repository](https://github.com/ndekesyiri/requeue-dashboard)
- **Issues**: [GitHub Issues](https://github.com/ndekesyiri/requeue-dashboard/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ndekesyiri/requeue-dashboard/discussions)

---

**Made with ❤️ by ndekesyiri**
