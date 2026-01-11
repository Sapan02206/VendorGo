// Test the complete demo flow
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testCompleteFlow() {
    console.log('🧪 Testing VendorGo Hackathon MVP Demo Flow...\n');
    
    try {
        // Step 1: Test WhatsApp vendor onboarding
        console.log('1️⃣ Testing WhatsApp vendor onboarding...');
        const vendorResponse = await axios.post(`${BASE_URL}/api/whatsapp/demo/send`, {
            phone: '+91 9876543210',
            message: 'Hi, I am Raj and I sell samosa 15 rupees, tea 10 rupees'
        });
        
        console.log('✅ Vendor onboarded via WhatsApp');
        console.log('   AI Response:', vendorResponse.data.aiResponse.message.substring(0, 100) + '...');
        
        // Step 2: Test vendor discovery
        console.log('\n2️⃣ Testing vendor discovery...');
        const vendorsResponse = await axios.get(`${BASE_URL}/api/vendors?latitude=12.9716&longitude=77.5946`);
        
        console.log('✅ Vendor discovery working');
        console.log(`   Found ${vendorsResponse.data.vendors.length} vendors`);
        
        if (vendorsResponse.data.vendors.length > 0) {
            const vendor = vendorsResponse.data.vendors[0];
            console.log(`   Sample vendor: ${vendor.name} (${vendor.products.length} products)`);
            
            // Step 3: Test guest order
            console.log('\n3️⃣ Testing guest order...');
            const orderResponse = await axios.post(`${BASE_URL}/api/orders/guest`, {
                vendorId: vendor._id,
                items: [{
                    productId: vendor.products[0]._id,
                    quantity: 1
                }],
                customerInfo: {
                    phone: '+91 9999999999',
                    name: 'Test Customer'
                },
                paymentMethod: 'upi',
                total: vendor.products[0].price
            });
            
            console.log('✅ Guest order created');
            console.log(`   Order ID: ${orderResponse.data.order.orderNumber}`);
            console.log(`   Total: ₹${orderResponse.data.order.total}`);
            
            // Step 4: Test UPI payment link
            if (orderResponse.data.order.paymentLink) {
                console.log('✅ UPI payment link generated');
                console.log(`   Payment link: ${orderResponse.data.order.paymentLink.substring(0, 50)}...`);
            }
        }
        
        // Step 5: Test customer PWA
        console.log('\n4️⃣ Testing customer PWA...');
        const pwaResponse = await axios.get(`${BASE_URL}/`);
        console.log('✅ Customer PWA accessible');
        console.log(`   PWA size: ${(pwaResponse.data.length / 1024).toFixed(1)}KB`);
        
        // Step 6: Test WhatsApp demo interface
        console.log('\n5️⃣ Testing WhatsApp demo interface...');
        const whatsappDemoResponse = await axios.get(`${BASE_URL}/whatsapp-demo.html`);
        console.log('✅ WhatsApp demo interface accessible');
        console.log(`   Demo size: ${(whatsappDemoResponse.data.length / 1024).toFixed(1)}KB`);
        
        console.log('\n🎉 ALL TESTS PASSED! Hackathon MVP is ready!');
        console.log('\n📱 Demo URLs:');
        console.log(`   Customer PWA: ${BASE_URL}/`);
        console.log(`   WhatsApp Demo: ${BASE_URL}/whatsapp-demo.html`);
        console.log(`   Health Check: ${BASE_URL}/api/health`);
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testCompleteFlow();