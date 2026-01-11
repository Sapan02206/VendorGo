#!/bin/bash

# VendorGo Easy Setup Script for Free Services
set -e

echo "🚀 Welcome to VendorGo Setup!"
echo "This script will help you set up VendorGo with FREE services"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed.${NC}"
    echo "Please install Node.js from: https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed.${NC}"
    echo "Please install npm (usually comes with Node.js)"
    exit 1
fi

echo -e "${GREEN}✅ Node.js and npm are installed${NC}"

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}📝 Creating .env file...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ .env file created from .env.example${NC}"
    echo -e "${BLUE}📋 Please edit .env file with your API keys${NC}"
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

# Create necessary directories
echo -e "${YELLOW}📁 Creating directories...${NC}"
mkdir -p logs
mkdir -p public/uploads
mkdir -p public/js

echo -e "${GREEN}✅ Directories created${NC}"

# Copy frontend files to public directory
echo -e "${YELLOW}📦 Setting up frontend files...${NC}"
cp -f index.html public/ 2>/dev/null || true
cp -f styles.css public/ 2>/dev/null || true
cp -f app.js public/ 2>/dev/null || true
cp -f whatsapp-demo.html public/ 2>/dev/null || true
cp -f whatsapp-bot.js public/ 2>/dev/null || true

echo -e "${GREEN}✅ Frontend files ready${NC}"

echo ""
echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "1. Edit .env file with your API keys:"
echo "   - MongoDB Atlas: https://cloud.mongodb.com/ (FREE 512MB)"
echo "   - Cloudinary: https://cloudinary.com/ (FREE 25GB)"
echo "   - Razorpay: https://razorpay.com/ (FREE for testing)"
echo ""
echo "2. Start the development server:"
echo "   npm run dev"
echo ""
echo "3. Open your browser:"
echo "   http://localhost:5000"
echo ""
echo -e "${BLUE}📚 Need help? Check the README.md file${NC}"
echo ""

# Show current Node.js version
echo -e "${BLUE}ℹ️  Your Node.js version: $(node --version)${NC}"
echo -e "${BLUE}ℹ️  Your npm version: $(npm --version)${NC}"