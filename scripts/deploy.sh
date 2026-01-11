#!/bin/bash

# VendorGo Simple Deployment Script for Free Services
set -e

echo "🚀 Starting VendorGo deployment with FREE services..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo -e "${YELLOW}Please run: npm run setup${NC}"
    exit 1
fi

echo -e "${GREEN}✅ .env file found${NC}"

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

# Create necessary directories
echo -e "${YELLOW}📁 Creating directories...${NC}"
mkdir -p logs
mkdir -p public/uploads

# Copy frontend files
echo -e "${YELLOW}📦 Setting up frontend...${NC}"
cp -f index.html public/ 2>/dev/null || true
cp -f styles.css public/ 2>/dev/null || true
cp -f app.js public/ 2>/dev/null || true
cp -f whatsapp-demo.html public/ 2>/dev/null || true
cp -f whatsapp-bot.js public/ 2>/dev/null || true

# Test database connection
echo -e "${YELLOW}🔍 Testing database connection...${NC}"
node -e "
const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vendorgo')
  .then(() => {
    console.log('✅ Database connection successful');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });
"

# Seed database with sample data
echo -e "${YELLOW}🌱 Seeding database...${NC}"
npm run seed

# Start the application
echo -e "${YELLOW}🚀 Starting application...${NC}"

# Check if PM2 is available
if command -v pm2 &> /dev/null; then
    echo -e "${BLUE}Using PM2 for process management${NC}"
    pm2 start server.js --name "vendorgo" --watch
    pm2 save
    pm2 startup
else
    echo -e "${BLUE}Starting with Node.js${NC}"
    echo -e "${YELLOW}For production, consider installing PM2: npm install -g pm2${NC}"
    node server.js &
fi

# Wait a moment for server to start
sleep 3

# Test the application
echo -e "${YELLOW}🧪 Testing application...${NC}"
if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Application is running successfully!${NC}"
else
    echo -e "${RED}❌ Application health check failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}📱 Your VendorGo platform is now live:${NC}"
echo -e "   🌐 Main App: http://localhost:5000"
echo -e "   🤖 WhatsApp Demo: http://localhost:5000/whatsapp-demo.html"
echo -e "   🔧 API Health: http://localhost:5000/api/health"
echo ""
echo -e "${YELLOW}📋 What's included:${NC}"
echo -e "   ✅ 3 sample vendors with products"
echo -e "   ✅ 2 sample customers"
echo -e "   ✅ 2 sample orders"
echo -e "   ✅ WhatsApp bot demo"
echo -e "   ✅ Payment integration (test mode)"
echo -e "   ✅ Image upload support"
echo ""
echo -e "${BLUE}🚀 Ready for production deployment:${NC}"
echo -e "   📖 Check FREE_DEPLOYMENT_GUIDE.md for Railway/Render deployment"
echo -e "   🔑 All using FREE services (MongoDB Atlas, Cloudinary, Razorpay)"
echo ""
echo -e "${GREEN}Happy coding! 🎊${NC}"