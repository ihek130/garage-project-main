#!/bin/bash
# Deployment script for VPS

echo "🚀 Starting deployment..."

# Navigate to project directory
cd /root/garage-project-main

# Pull latest changes
echo "📥 Pulling latest changes from GitHub..."
git pull origin main

# Install/update backend dependencies
echo "📦 Installing backend dependencies..."
cd BackEnd
npm install

# Install/update frontend dependencies and build
echo "📦 Installing frontend dependencies..."
cd ../client-project
npm install
npm install serve

# Build frontend for production (will automatically use .env.production)
echo "🏗️ Building frontend for production..."
npm run build

# Restart services
echo "🔄 Restarting services..."
pm2 restart backend
pm2 restart frontend

echo "✅ Deployment complete!"
echo "Backend: http://72.60.43.50:5000"
echo "Frontend: http://72.60.43.50:3000"
