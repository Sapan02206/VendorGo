// Super Simple VendorGo Server for Beginners
// No databases, no APIs, no complexity!

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Simple in-memory storage (resets when server restarts)
let vendors = [];
let customers = [];
let orders = [];

// Middleware
app.use(express.json());
app.use(express.static('.'));

// CORS for local development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// Load sample data on startup
function loadSampleData() {
    vendors = [
        {
            id: 'v1',
            name: "Raj's Street Food",
            phone: '+91 9876543210',
            email: 'raj@example.com',
            category: 'food',
            location: 'MG Road, Bangalore',
            lat: 12.9716,
            lng: 77.5946,
            isOnline: true,
            rating: 4.5,
            totalOrders: 150,
            products: [
                {
                    id: 'p1',
                    name: 'Pani Puri',
                    price: 30,
                    description: 'Crispy puris with spicy water',
                    available: true,
                    image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=300'
                },
                {
                    id: 'p2',
                    name: 'Bhel Puri',
                    price: 40,
                    description: 'Mumbai style bhel puri',
                    available: true,
                    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300'
                }
            ],
            createdAt: new Date().toISOString()
        },
        {
            id: 'v2',
            name: 'Fashion Corner',
            phone: '+91 9876543211',
            email: 'fashion@example.com',
            category: 'clothing',
            location: 'Brigade Road, Bangalore',
            lat: 12.9698,
            lng: 77.6205,
            isOnline: true,
            rating: 4.2,
            totalOrders: 89,
            products: [
                {
                    id: 'p3',
                    name: 'Cotton T-Shirt',
                    price: 299,
                    description: 'Comfortable cotton t-shirt',
                    available: true,
                    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300'
                }
            ],
            createdAt: new Date().toISOString()
        }
    ];

    customers = [
        {
            id: 'c1',
            name: 'John Customer',
            phone: '+91 9123456789',
            email: 'john@example.com'
        }
    ];

    console.log('✅ Sample data loaded');
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'VendorGo Simple Server is running!',
        timestamp: new Date().toISOString(),
        vendors: vendors.length,
        customers: customers.length,
        orders: orders.length
    });
});

// Get all vendors
app.get('/api/vendors', (req, res) => {
    const { category, search } = req.query;
    
    let filteredVendors = vendors;
    
    if (category) {
        filteredVendors = filteredVendors.filter(v => v.category === category);
    }
    
    if (search) {
        filteredVendors = filteredVendors.filter(v => 
            v.name.toLowerCase().includes(search.toLowerCase()) ||
            v.location.toLowerCase().includes(search.toLowerCase())
        );
    }
    
    res.json(filteredVendors);
});

// Get single vendor
app.get('/api/vendors/:id', (req, res) => {
    const vendor = vendors.find(v => v.id === req.params.id);
    if (!vendor) {
        return res.status(404).json({ error: 'Vendor not found' });
    }
    res.json(vendor);
});

// Create vendor (simple registration)
app.post('/api/vendors', (req, res) => {
    const newVendor = {
        id: 'v' + Date.now(),
        ...req.body,
        isOnline: true,
        rating: 4.0,
        totalOrders: 0,
        products: [],
        createdAt: new Date().toISOString()
    };
    
    vendors.push(newVendor);
    res.status(201).json(newVendor);
});

// Add product to vendor
app.post('/api/vendors/:id/products', (req, res) => {
    const vendor = vendors.find(v => v.id === req.params.id);
    if (!vendor) {
        return res.status(404).json({ error: 'Vendor not found' });
    }
    
    const newProduct = {
        id: 'p' + Date.now(),
        ...req.body,
        available: true
    };
    
    vendor.products.push(newProduct);
    res.status(201).json(newProduct);
});

// Update product
app.put('/api/vendors/:vendorId/products/:productId', (req, res) => {
    const vendor = vendors.find(v => v.id === req.params.vendorId);
    if (!vendor) {
        return res.status(404).json({ error: 'Vendor not found' });
    }
    
    const product = vendor.products.find(p => p.id === req.params.productId);
    if (!product) {
        return res.status(404).json({ error: 'Product not found' });
    }
    
    Object.assign(product, req.body);
    res.json(product);
});

// Create order
app.post('/api/orders', (req, res) => {
    const newOrder = {
        id: 'o' + Date.now(),
        orderNumber: 'VG' + Date.now(),
        ...req.body,
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    
    orders.push(newOrder);
    
    // Update vendor's total orders
    const vendor = vendors.find(v => v.id === newOrder.vendorId);
    if (vendor) {
        vendor.totalOrders += 1;
    }
    
    res.status(201).json(newOrder);
});

// Get orders
app.get('/api/orders', (req, res) => {
    res.json(orders);
});

// Update order status
app.patch('/api/orders/:id/status', (req, res) => {
    const order = orders.find(o => o.id === req.params.id);
    if (!order) {
        return res.status(404).json({ error: 'Order not found' });
    }
    
    order.status = req.body.status;
    order.updatedAt = new Date().toISOString();
    
    res.json(order);
});

// Simple auth endpoints (no real authentication, just for demo)
app.post('/api/auth/register', (req, res) => {
    const { role, ...userData } = req.body;
    
    if (role === 'vendor') {
        const newVendor = {
            id: 'v' + Date.now(),
            ...userData,
            isOnline: true,
            rating: 4.0,
            totalOrders: 0,
            products: [],
            createdAt: new Date().toISOString()
        };
        vendors.push(newVendor);
        
        res.json({
            success: true,
            user: { ...newVendor, role: 'vendor' },
            token: 'demo-token-' + newVendor.id
        });
    } else {
        const newCustomer = {
            id: 'c' + Date.now(),
            ...userData,
            createdAt: new Date().toISOString()
        };
        customers.push(newCustomer);
        
        res.json({
            success: true,
            user: { ...newCustomer, role: 'customer' },
            token: 'demo-token-' + newCustomer.id
        });
    }
});

app.post('/api/auth/login', (req, res) => {
    // Simple demo login - always succeeds
    res.json({
        success: true,
        user: { id: 'demo-user', name: 'Demo User', role: req.body.role || 'customer' },
        token: 'demo-token-login'
    });
});

// Serve main pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/whatsapp-demo.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'whatsapp-demo.html'));
});

// Start server
app.listen(PORT, () => {
    console.log('🚀 VendorGo Simple Server Starting...');
    console.log('');
    console.log('✅ Server is running!');
    console.log('');
    console.log('📱 Open your browser and visit:');
    console.log(`   🌐 Main App: http://localhost:${PORT}`);
    console.log(`   🤖 WhatsApp Demo: http://localhost:${PORT}/whatsapp-demo.html`);
    console.log(`   🔧 API Health: http://localhost:${PORT}/api/health`);
    console.log('');
    console.log('🎯 Features available:');
    console.log('   ✅ Vendor registration and management');
    console.log('   ✅ Product catalog');
    console.log('   ✅ Order processing');
    console.log('   ✅ Customer discovery');
    console.log('   ✅ WhatsApp bot demo');
    console.log('');
    console.log('🛑 To stop the server: Press Ctrl+C');
    console.log('');
    
    // Load sample data
    loadSampleData();
});

module.exports = app;