#!/usr/bin/env node

// VendorGo Hackathon Setup Script
// This script prepares everything for a winning hackathon demo

const fs = require('fs');
const path = require('path');

console.log('🏆 VendorGo Hackathon Setup Starting...');
console.log('');

// Colors for output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
};

function log(message, color = 'reset') {
    console.log(colors[color] + message + colors.reset);
}

// Check if .env exists
function setupEnvironment() {
    log('⚙️  Setting up environment configuration...', 'yellow');
    
    const envExample = path.join(__dirname, '..', '.env.example');
    const envFile = path.join(__dirname, '..', '.env');
    
    if (!fs.existsSync(envFile)) {
        if (fs.existsSync(envExample)) {
            fs.copyFileSync(envExample, envFile);
            log('✅ .env file created from .env.example', 'green');
        } else {
            // Create basic .env file
            const basicEnv = `# VendorGo Hackathon Configuration
NODE_ENV=development
PORT=5000

# MongoDB Atlas (Get from: https://cloud.mongodb.com/)
MONGODB_URI=mongodb://localhost:27017/vendorgo

# Cloudinary (Get from: https://cloudinary.com/)
CLOUDINARY_CLOUD_NAME=demo
CLOUDINARY_API_KEY=demo
CLOUDINARY_API_SECRET=demo

# Razorpay (Get from: https://razorpay.com/)
RAZORPAY_KEY_ID=rzp_test_demo
RAZORPAY_KEY_SECRET=demo

# JWT Secret
JWT_SECRET=hackathon-winner-vendorgo-2024

# Demo Mode
DEMO_MODE=true
HACKATHON_MODE=true
`;
            fs.writeFileSync(envFile, basicEnv);
            log('✅ Basic .env file created', 'green');
        }
    } else {
        log('✅ .env file already exists', 'green');
    }
}

// Create necessary directories
function createDirectories() {
    log('📁 Creating necessary directories...', 'yellow');
    
    const dirs = ['logs', 'public/uploads', 'public/js'];
    
    dirs.forEach(dir => {
        const fullPath = path.join(__dirname, '..', dir);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
            log(`✅ Created directory: ${dir}`, 'green');
        }
    });
}

// Copy frontend files
function setupFrontend() {
    log('🎨 Setting up frontend files...', 'yellow');
    
    const files = [
        'index.html',
        'styles.css', 
        'app.js',
        'whatsapp-demo.html',
        'whatsapp-bot.js'
    ];
    
    files.forEach(file => {
        const source = path.join(__dirname, '..', file);
        const dest = path.join(__dirname, '..', 'public', file);
        
        if (fs.existsSync(source)) {
            fs.copyFileSync(source, dest);
            log(`✅ Copied ${file} to public/`, 'green');
        }
    });
    
    // Copy API client
    const apiSource = path.join(__dirname, '..', 'public', 'js', 'api.js');
    if (fs.existsSync(apiSource)) {
        log('✅ API client ready', 'green');
    }
}

// Create hackathon demo data
function createDemoData() {
    log('🎪 Creating hackathon demo data...', 'yellow');
    
    const demoData = {
        vendors: [
            {
                name: "Raj's Street Food Empire",
                phone: "+91 9876543210",
                category: "food",
                location: "MG Road, Bangalore",
                description: "Award-winning street food with 25+ years of experience",
                products: [
                    { name: "Signature Pani Puri", price: 35, description: "Secret recipe pani puri with 7 chutneys" },
                    { name: "Mumbai Bhel Puri", price: 45, description: "Authentic Mumbai-style bhel with fresh ingredients" },
                    { name: "Crispy Masala Dosa", price: 65, description: "South Indian dosa with special potato masala" }
                ],
                rating: 4.8,
                totalOrders: 2847,
                monthlyRevenue: 45000
            },
            {
                name: "Fashion Street Boutique",
                phone: "+91 9876543211", 
                category: "clothing",
                location: "Brigade Road, Bangalore",
                description: "Trendy fashion at unbeatable prices",
                products: [
                    { name: "Designer Cotton T-Shirt", price: 299, description: "Premium quality cotton with unique designs" },
                    { name: "Stylish Denim Jeans", price: 899, description: "Comfortable fit with modern styling" }
                ],
                rating: 4.6,
                totalOrders: 1234,
                monthlyRevenue: 28000
            }
        ],
        stats: {
            totalVendors: 15847,
            totalOrders: 234567,
            totalRevenue: 12500000,
            averageIncrease: 42
        }
    };
    
    const demoFile = path.join(__dirname, '..', 'hackathon-demo-data.json');
    fs.writeFileSync(demoFile, JSON.stringify(demoData, null, 2));
    log('✅ Demo data created', 'green');
}

// Create presentation assets
function createPresentationAssets() {
    log('📊 Creating presentation assets...', 'yellow');
    
    const presentationNotes = `# VendorGo Hackathon Presentation Notes

## Opening Hook (30 seconds)
"India has 50 million street vendors generating ₹2.5 lakh crore annually, but 95% are invisible online. We built VendorGo - the AI-powered platform that transforms any street vendor into a digital business in under 2 minutes using just WhatsApp."

## Demo Flow (3 minutes)

### 1. WhatsApp Bot Demo (45 seconds)
- Open: http://localhost:5000/whatsapp-demo.html
- Type "start" to begin onboarding
- Show AI extracting products from voice/text
- Demonstrate instant digital store creation

### 2. Customer Discovery (45 seconds)  
- Open: http://localhost:5000
- Show map with live vendors
- Click vendor → browse products
- Place order with real payment flow

### 3. Vendor Dashboard (45 seconds)
- Switch to vendor mode
- Show real-time order notifications
- Accept order, update status
- Display analytics and earnings

### 4. Impact Metrics (45 seconds)
- Show platform scalability
- Demonstrate business model
- Present social impact data

## Key Numbers to Remember
- Market Size: ₹2.5 lakh crore
- Target Users: 50 million vendors
- Revenue Model: 2% transaction fee
- Social Impact: 40% income increase

## Technical Highlights
- Production-ready architecture
- Real-time WebSocket communication
- AI-powered product extraction
- Integrated payment processing
- Scalable database design

## Closing Statement
"VendorGo isn't just an app - it's India's digital transformation engine for the informal economy. We're ready to scale to 50 million vendors and create the world's largest hyperlocal commerce platform."
`;
    
    const notesFile = path.join(__dirname, '..', 'PRESENTATION_NOTES.md');
    fs.writeFileSync(notesFile, presentationNotes);
    log('✅ Presentation notes created', 'green');
}

// Main setup function
async function main() {
    try {
        log('🏆 VENDORGO HACKATHON SETUP', 'magenta');
        log('================================', 'magenta');
        log('');
        
        setupEnvironment();
        createDirectories();
        setupFrontend();
        createDemoData();
        createPresentationAssets();
        
        log('');
        log('🎉 HACKATHON SETUP COMPLETE!', 'green');
        log('');
        log('📋 Next Steps:', 'cyan');
        log('1. Get your FREE API keys:', 'yellow');
        log('   • MongoDB Atlas: https://cloud.mongodb.com/', 'blue');
        log('   • Cloudinary: https://cloudinary.com/', 'blue');
        log('   • Razorpay: https://razorpay.com/', 'blue');
        log('');
        log('2. Update .env file with your API keys', 'yellow');
        log('');
        log('3. Start your winning demo:', 'yellow');
        log('   npm run hackathon-demo', 'green');
        log('');
        log('4. Open your browser:', 'yellow');
        log('   🌐 Main App: http://localhost:5000', 'blue');
        log('   🤖 WhatsApp Demo: http://localhost:5000/whatsapp-demo.html', 'blue');
        log('');
        log('🏆 YOU\'RE READY TO WIN THE HACKATHON!', 'magenta');
        log('');
        log('📖 Check HACKATHON_WINNER_SETUP.md for demo script', 'cyan');
        log('📝 Check PRESENTATION_NOTES.md for talking points', 'cyan');
        
    } catch (error) {
        log('❌ Setup failed: ' + error.message, 'red');
        process.exit(1);
    }
}

// Run setup
main();