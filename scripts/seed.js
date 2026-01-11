const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Vendor = require('../models/Vendor');
const Customer = require('../models/Customer');
const Order = require('../models/Order');

// Sample data
const sampleVendors = [
  {
    name: "Raj's Street Food",
    phone: "+91 9876543210",
    email: "raj@streetfood.com",
    category: "food",
    location: "MG Road, Bangalore",
    address: "Shop 15, MG Road, Bangalore, Karnataka 560001",
    lat: 12.9716,
    lng: 77.5946,
    description: "Authentic North Indian street food with 20+ years of experience",
    businessHours: {
      open: "10:00",
      close: "22:00"
    },
    isOnline: true,
    isVerified: true,
    products: [
      {
        name: "Pani Puri",
        price: 30,
        description: "Crispy puris with spicy tangy water",
        category: "snacks",
        available: true,
        image: "https://res.cloudinary.com/demo/image/upload/v1234567890/panipuri.jpg"
      },
      {
        name: "Bhel Puri",
        price: 40,
        description: "Mumbai style bhel puri with chutneys",
        category: "snacks",
        available: true,
        image: "https://res.cloudinary.com/demo/image/upload/v1234567890/bhelpuri.jpg"
      },
      {
        name: "Masala Dosa",
        price: 60,
        description: "South Indian crispy dosa with potato filling",
        category: "main-course",
        available: true,
        image: "https://res.cloudinary.com/demo/image/upload/v1234567890/dosa.jpg"
      }
    ],
    rating: 4.5,
    reviewCount: 45,
    totalOrders: 150,
    views: 1200
  },
  {
    name: "Fashion Corner",
    phone: "+91 9876543211",
    email: "fashion@corner.com",
    category: "clothing",
    location: "Brigade Road, Bangalore",
    address: "Shop 8, Brigade Road, Bangalore, Karnataka 560025",
    lat: 12.9698,
    lng: 77.6205,
    description: "Trendy clothing and accessories for all ages",
    businessHours: {
      open: "11:00",
      close: "21:00"
    },
    isOnline: true,
    isVerified: true,
    products: [
      {
        name: "Cotton T-Shirt",
        price: 299,
        description: "100% cotton comfortable t-shirt",
        category: "clothing",
        available: true,
        image: "https://res.cloudinary.com/demo/image/upload/v1234567890/tshirt.jpg"
      },
      {
        name: "Denim Jeans",
        price: 899,
        description: "Stylish slim-fit denim jeans",
        category: "clothing",
        available: true,
        image: "https://res.cloudinary.com/demo/image/upload/v1234567890/jeans.jpg"
      }
    ],
    rating: 4.2,
    reviewCount: 23,
    totalOrders: 89,
    views: 650
  },
  {
    name: "Tech Gadgets Hub",
    phone: "+91 9876543212",
    email: "tech@gadgets.com",
    category: "electronics",
    location: "Commercial Street, Bangalore",
    address: "Shop 25, Commercial Street, Bangalore, Karnataka 560001",
    lat: 12.9833,
    lng: 77.6089,
    description: "Latest mobile accessories and gadgets",
    businessHours: {
      open: "10:30",
      close: "20:30"
    },
    isOnline: true,
    isVerified: true,
    products: [
      {
        name: "Phone Case",
        price: 199,
        description: "Protective case for all phone models",
        category: "accessories",
        available: true,
        image: "https://res.cloudinary.com/demo/image/upload/v1234567890/phonecase.jpg"
      },
      {
        name: "Wireless Earphones",
        price: 499,
        description: "High quality wireless earphones with mic",
        category: "electronics",
        available: true,
        image: "https://res.cloudinary.com/demo/image/upload/v1234567890/earphones.jpg"
      }
    ],
    rating: 4.7,
    reviewCount: 18,
    totalOrders: 67,
    views: 890
  }
];

const sampleCustomers = [
  {
    name: "Priya Sharma",
    phone: "+91 9123456789",
    email: "priya@example.com",
    address: "Koramangala, Bangalore"
  },
  {
    name: "Amit Kumar",
    phone: "+91 9123456788",
    email: "amit@example.com",
    address: "Indiranagar, Bangalore"
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vendorgo';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await Vendor.deleteMany({});
    await Customer.deleteMany({});
    await Order.deleteMany({});
    
    // Seed vendors
    console.log('👥 Seeding vendors...');
    const vendors = await Vendor.insertMany(sampleVendors);
    console.log(`✅ Created ${vendors.length} vendors`);
    
    // Seed customers
    console.log('👤 Seeding customers...');
    const customers = await Customer.insertMany(sampleCustomers);
    console.log(`✅ Created ${customers.length} customers`);
    
    // Create sample orders
    console.log('📦 Creating sample orders...');
    const sampleOrders = [
      {
        orderNumber: 'VG' + Date.now(),
        vendor: vendors[0]._id,
        customer: customers[0]._id,
        items: [
          {
            product: vendors[0].products[0]._id,
            name: vendors[0].products[0].name,
            price: vendors[0].products[0].price,
            quantity: 2
          }
        ],
        customerInfo: {
          name: customers[0].name,
          phone: customers[0].phone,
          address: customers[0].address
        },
        total: vendors[0].products[0].price * 2,
        status: 'completed',
        paymentMethod: 'razorpay',
        paymentStatus: 'paid'
      },
      {
        orderNumber: 'VG' + (Date.now() + 1),
        vendor: vendors[1]._id,
        customer: customers[1]._id,
        items: [
          {
            product: vendors[1].products[0]._id,
            name: vendors[1].products[0].name,
            price: vendors[1].products[0].price,
            quantity: 1
          }
        ],
        customerInfo: {
          name: customers[1].name,
          phone: customers[1].phone,
          address: customers[1].address
        },
        total: vendors[1].products[0].price,
        status: 'pending',
        paymentMethod: 'cod',
        paymentStatus: 'pending'
      }
    ];
    
    const orders = await Order.insertMany(sampleOrders);
    console.log(`✅ Created ${orders.length} orders`);
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   Vendors: ${vendors.length}`);
    console.log(`   Customers: ${customers.length}`);
    console.log(`   Orders: ${orders.length}`);
    console.log('');
    console.log('🌐 You can now start your server and see the data!');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📝 Database connection closed');
    process.exit(0);
  }
}

// Run the seeding
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;