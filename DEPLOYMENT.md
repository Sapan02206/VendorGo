# VendorGo Production Deployment Guide

This guide will help you deploy VendorGo to production with all the necessary services and configurations.

## 🏗️ Architecture Overview

VendorGo production deployment includes:

- **MongoDB**: Database for vendors, customers, and orders
- **Redis**: Caching and session storage
- **Node.js API**: Backend application server
- **Nginx**: Reverse proxy and static file server
- **WhatsApp Web.js**: WhatsApp bot integration
- **Socket.IO**: Real-time notifications

## 🚀 Quick Start

### 1. Server Requirements

**Minimum Requirements:**
- Ubuntu 20.04+ or CentOS 8+
- 2 CPU cores
- 4GB RAM
- 20GB SSD storage
- Public IP address

**Recommended for Production:**
- 4+ CPU cores
- 8GB+ RAM
- 50GB+ SSD storage
- Load balancer (for multiple instances)

### 2. Initial Setup

```bash
# Clone the repository
git clone https://github.com/your-username/vendorgo.git
cd vendorgo

# Run the setup script
chmod +x scripts/setup.sh
./scripts/setup.sh
```

The setup script will:
- Install Docker and Docker Compose
- Install Node.js and PM2
- Configure Nginx
- Set up SSL certificates (optional)
- Create systemd services
- Configure firewall

### 3. Environment Configuration

Copy and configure the environment file:

```bash
cp .env.example .env
nano .env
```

**Required Environment Variables:**

```bash
# Server Configuration
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-domain.com

# Database
MONGODB_URI=mongodb://username:password@localhost:27017/vendorgo

# JWT Secret (generate a strong secret)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# WhatsApp Business API
WHATSAPP_PHONE_NUMBER_ID=your-whatsapp-phone-number-id
WHATSAPP_ACCESS_TOKEN=your-whatsapp-access-token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-webhook-verify-token

# Payment Gateway - Razorpay
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret

# Google Maps API
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Cloudinary (Image storage)
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# OpenAI (AI features)
OPENAI_API_KEY=your-openai-api-key

# Redis
REDIS_URL=redis://localhost:6379
```

### 4. Deploy Application

```bash
# Deploy with Docker Compose
./scripts/deploy.sh
```

This will:
- Build Docker images
- Start all services
- Run health checks
- Display service status

## 🔧 Service Configuration

### MongoDB Setup

**Option 1: MongoDB Atlas (Recommended)**
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env`

**Option 2: Self-hosted MongoDB**
```bash
# MongoDB is included in docker-compose.yml
# Default credentials: admin/password123
# Update in docker-compose.yml for production
```

### WhatsApp Business API Setup

**Option 1: Meta WhatsApp Business API**
1. Create Facebook Developer account
2. Set up WhatsApp Business API
3. Get phone number ID and access token
4. Configure webhook URL: `https://your-domain.com/api/whatsapp/webhook`

**Option 2: Twilio WhatsApp API**
1. Create Twilio account
2. Set up WhatsApp sandbox
3. Update environment variables:
```bash
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### Payment Gateway Setup

**Razorpay Integration:**
1. Create account at [Razorpay](https://razorpay.com)
2. Get API keys from dashboard
3. Configure webhook: `https://your-domain.com/api/payments/webhook`
4. Update environment variables

### Google Maps API Setup

1. Create project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable Maps JavaScript API and Geocoding API
3. Create API key with domain restrictions
4. Update `GOOGLE_MAPS_API_KEY` in `.env`

### Cloudinary Setup

1. Create account at [Cloudinary](https://cloudinary.com)
2. Get cloud name, API key, and secret
3. Update environment variables

## 🔒 Security Configuration

### SSL Certificate Setup

**Let's Encrypt (Free):**
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Firewall Configuration

```bash
# Configure UFW
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### Environment Security

```bash
# Secure .env file
chmod 600 .env
chown root:root .env
```

## 📊 Monitoring and Logging

### Application Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f api
docker-compose logs -f mongodb
docker-compose logs -f nginx

# Log files location
tail -f logs/combined.log
tail -f logs/error.log
```

### Health Monitoring

```bash
# Check service health
curl http://localhost/api/health

# Check individual services
docker-compose ps
docker stats
```

### Log Rotation

Log rotation is automatically configured in `/etc/logrotate.d/vendorgo`:

```bash
# Manual log rotation
sudo logrotate -f /etc/logrotate.d/vendorgo
```

## 🔄 Backup and Recovery

### Database Backup

```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T mongodb mongodump --archive=/tmp/backup_$DATE.archive
docker cp vendorgo-mongodb:/tmp/backup_$DATE.archive ./backups/
EOF

chmod +x backup.sh

# Schedule daily backups
crontab -e
# Add: 0 2 * * * /path/to/vendorgo/backup.sh
```

### Application Backup

```bash
# Backup application files
tar -czf vendorgo_backup_$(date +%Y%m%d).tar.gz \
  --exclude=node_modules \
  --exclude=logs \
  --exclude=.git \
  .
```

## 🚀 Scaling and Performance

### Horizontal Scaling

```bash
# Scale API instances
docker-compose up -d --scale api=3

# Use load balancer (nginx upstream)
# Update nginx.conf with multiple upstream servers
```

### Performance Optimization

**Database Optimization:**
- Enable MongoDB indexes
- Use connection pooling
- Implement caching with Redis

**Application Optimization:**
- Enable gzip compression
- Use CDN for static assets
- Implement API rate limiting

## 🔧 Maintenance

### Update Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
./scripts/deploy.sh
```

### Service Management

```bash
# Start services
sudo systemctl start vendorgo

# Stop services
sudo systemctl stop vendorgo

# Restart services
sudo systemctl restart vendorgo

# Check status
sudo systemctl status vendorgo
```

### Database Maintenance

```bash
# MongoDB maintenance
docker-compose exec mongodb mongosh
# Run: db.runCommand({compact: "collection_name"})

# Redis maintenance
docker-compose exec redis redis-cli
# Run: FLUSHDB (if needed)
```

## 🐛 Troubleshooting

### Common Issues

**1. WhatsApp Connection Issues:**
```bash
# Check WhatsApp service logs
docker-compose logs -f api | grep -i whatsapp

# Restart WhatsApp service
docker-compose restart api
```

**2. Database Connection Issues:**
```bash
# Check MongoDB status
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# Check connection string
echo $MONGODB_URI
```

**3. Payment Gateway Issues:**
```bash
# Check Razorpay configuration
curl -X POST https://api.razorpay.com/v1/orders \
  -u your_key_id:your_key_secret \
  -H "Content-Type: application/json"
```

**4. SSL Certificate Issues:**
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew
```

### Performance Issues

**High Memory Usage:**
```bash
# Check memory usage
docker stats

# Restart services
docker-compose restart
```

**High CPU Usage:**
```bash
# Check process usage
top
htop

# Scale down if needed
docker-compose up -d --scale api=1
```

## 📞 Support

For production support:

1. **Documentation**: Check this guide and API documentation
2. **Logs**: Always check application logs first
3. **Health Checks**: Use `/api/health` endpoint
4. **Community**: Join our Discord/Slack for community support
5. **Professional Support**: Contact us for enterprise support

## 🎯 Production Checklist

Before going live:

- [ ] Environment variables configured
- [ ] SSL certificate installed
- [ ] Database backups scheduled
- [ ] Monitoring set up
- [ ] Firewall configured
- [ ] Domain DNS configured
- [ ] WhatsApp Business API verified
- [ ] Payment gateway tested
- [ ] Load testing completed
- [ ] Security audit completed

---

**🎉 Congratulations!** Your VendorGo application is now running in production!

For updates and support, visit: [https://github.com/your-username/vendorgo](https://github.com/your-username/vendorgo)