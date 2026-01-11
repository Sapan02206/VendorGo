// Test WhatsApp "done" functionality
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testWhatsAppDone() {
    console.log('🧪 Testing WhatsApp "done" functionality...\n');
    
    try {
        const phone = '+91 9999999999';
        
        // Step 1: Add first product
        console.log('1️⃣ Adding first product...');
        const response1 = await axios.post(`${BASE_URL}/api/whatsapp/demo/send`, {
            phone: phone,
            message: 'iPhone 16 Pro Max ₹100000'
        });
        console.log('✅ First product added');
        console.log('   Response:', response1.data.aiResponse.message.substring(0, 100) + '...\n');
        
        // Step 2: Add second product
        console.log('2️⃣ Adding second product...');
        const response2 = await axios.post(`${BASE_URL}/api/whatsapp/demo/send`, {
            phone: phone,
            message: 'iPhone 15 Plus ₹80000'
        });
        console.log('✅ Second product added');
        console.log('   Response:', response2.data.aiResponse.message.substring(0, 100) + '...\n');
        
        // Step 3: Type "done"
        console.log('3️⃣ Typing "done"...');
        const response3 = await axios.post(`${BASE_URL}/api/whatsapp/demo/send`, {
            phone: phone,
            message: 'done'
        });
        console.log('✅ "Done" processed successfully');
        console.log('   Response:', response3.data.aiResponse.message.substring(0, 200) + '...\n');
        
        // Check if it moved to profile confirmation
        if (response3.data.aiResponse.message.includes('Here\'s your digital store preview') || 
            response3.data.aiResponse.message.includes('Is this correct')) {
            console.log('🎉 SUCCESS: "Done" correctly moved to profile confirmation!');
        } else {
            console.log('❌ ISSUE: "Done" did not move to profile confirmation');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testWhatsAppDone();