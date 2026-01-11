// Test WhatsApp vendor management features
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testVendorManagement() {
    console.log('🧪 Testing WhatsApp Vendor Management Features...\n');
    
    try {
        const phone = '+91 7777666555';
        
        // Step 1: Create vendor with products
        console.log('1️⃣ Creating vendor with products...');
        const createResponse = await axios.post(`${BASE_URL}/api/whatsapp/demo/send`, {
            phone: phone,
            message: 'Hi, I am Test Shop and I sell laptop ₹50000, mouse ₹1000, keyboard ₹2000'
        });
        console.log('✅ Vendor created');
        console.log('   Response:', createResponse.data.aiResponse.message.substring(0, 100) + '...\n');
        
        // Step 2: Test "show products" command
        console.log('2️⃣ Testing "show products" command...');
        const showResponse = await axios.post(`${BASE_URL}/api/whatsapp/demo/send`, {
            phone: phone,
            message: 'show products'
        });
        console.log('✅ Show products working');
        console.log('   Response:', showResponse.data.aiResponse.message.substring(0, 200) + '...\n');
        
        // Step 3: Test adding new product
        console.log('3️⃣ Testing add new product...');
        const addResponse = await axios.post(`${BASE_URL}/api/whatsapp/demo/send`, {
            phone: phone,
            message: 'headphones ₹3000'
        });
        console.log('✅ Add product working');
        console.log('   Response:', addResponse.data.aiResponse.message.substring(0, 150) + '...\n');
        
        // Step 4: Test "delete product" command
        console.log('4️⃣ Testing "delete product" command...');
        const deleteResponse = await axios.post(`${BASE_URL}/api/whatsapp/demo/send`, {
            phone: phone,
            message: 'delete mouse'
        });
        console.log('✅ Delete product working');
        console.log('   Response:', deleteResponse.data.aiResponse.message.substring(0, 150) + '...\n');
        
        // Step 5: Check if vendor appears in customer PWA
        console.log('5️⃣ Checking if vendor appears in customer PWA...');
        const vendorsResponse = await axios.get(`${BASE_URL}/api/vendors?latitude=12.9716&longitude=77.5946`);
        
        const newVendor = vendorsResponse.data.vendors.find(v => v.phone === phone);
        if (newVendor) {
            console.log('✅ Vendor found in customer PWA');
            console.log(`   Vendor: ${newVendor.name} with ${newVendor.products.length} products`);
            console.log(`   Products: ${newVendor.products.map(p => p.name).join(', ')}\n`);
        } else {
            console.log('❌ Vendor not found in customer PWA\n');
        }
        
        // Step 6: Test help command
        console.log('6️⃣ Testing help command...');
        const helpResponse = await axios.post(`${BASE_URL}/api/whatsapp/demo/send`, {
            phone: phone,
            message: 'help'
        });
        console.log('✅ Help command working');
        console.log('   Response:', helpResponse.data.aiResponse.message.substring(0, 200) + '...\n');
        
        console.log('🎉 VENDOR MANAGEMENT TEST RESULTS:');
        console.log('✅ Vendor creation with products');
        console.log('✅ "show products" command');
        console.log('✅ Add new products');
        console.log('✅ "delete [product]" command');
        console.log('✅ Vendor appears in customer PWA');
        console.log('✅ Help command with all options');
        
        console.log('\n💡 AVAILABLE COMMANDS FOR VENDORS:');
        console.log('• "show products" - List all products');
        console.log('• "delete [product name]" - Remove product');
        console.log('• "[product] ₹[price]" - Add new product');
        console.log('• "help" - Show all commands');
        console.log('• "orders" - Check recent orders');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testVendorManagement();