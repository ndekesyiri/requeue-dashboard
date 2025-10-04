#!/bin/bash

echo "Starting ReQueue Dashboard..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js 14+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "npm is not installed. Please install npm first."
    exit 1
fi

# Check if Redis is running
if ! redis-cli ping &> /dev/null; then
    echo "   Warning: Redis server is not running or not accessible."
    echo "   Please start Redis server before running the dashboard."
    echo "   You can start Redis with: redis-server"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Navigate to dashboard directory
cd "$(dirname "$0")"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "package.json not found. Please run this script from the dashboard directory."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo " Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "Failed to install dependencies."
        exit 1
    fi
fi

# Set default environment variables
export PORT=${PORT:-3000}
export REDIS_HOST=${REDIS_HOST:-localhost}
export REDIS_PORT=${REDIS_PORT:-6379}
export REDIS_DB=${REDIS_DB:-0}

echo " Configuration:"
echo "   Port: $PORT"
echo "   Redis: $REDIS_HOST:$REDIS_PORT (DB: $REDIS_DB)"
echo ""

# Start the dashboard
echo "  Starting dashboard server..."
echo "   Dashboard: http://localhost:$PORT"
echo "   API: http://localhost:$PORT/api"
echo "   Health: http://localhost:$PORT/api/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
npm start
