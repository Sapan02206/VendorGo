// Test the WhatsApp bot onboarding flow directly
const { WhatsAppBot } = require('./whatsapp-bot.js');

function testBotFlow() {
    console.log('🧪 Testing WhatsApp Bot Onboarding Flow...\n');
    
    const bot = new WhatsAppBot();
    const phone = '+91 9876543210';
    
    // Step 1: Start
    console.log('1️⃣ User: start');
    let response = bot.receiveMessage(phone, 'start');
    console.log('🤖 Bot:', response.substring(0, 100) + '...\n');
    
    // Step 2: Name
    console.log('2️⃣ User: my name is sapan m desai');
    response = bot.receiveMessage(phone, 'my name is sapan m desai');
    console.log('🤖 Bot:', response.substring(0, 100) + '...\n');
    
    // Step 3: Business type
    console.log('3️⃣ User: Electronics & Gadgets');
    response = bot.receiveMessage(phone, 'Electronics & Gadgets');
    console.log('🤖 Bot:', response.substring(0, 100) + '...\n');
    
    // Step 4: Location
    console.log('4️⃣ User: ahmedabad kalupur');
    response = bot.receiveMessage(phone, 'ahmedabad kalupur');
    console.log('🤖 Bot:', response.substring(0, 100) + '...\n');
    
    // Step 5: First product
    console.log('5️⃣ User: samsung s 25 ultra ₹150000');
    response = bot.receiveMessage(phone, 'samsung s 25 ultra ₹150000');
    console.log('🤖 Bot:', response.substring(0, 100) + '...\n');
    
    // Step 6: Second product
    console.log('6️⃣ User: iphone 15 plus ₹8000');
    response = bot.receiveMessage(phone, 'iphone 15 plus ₹8000');
    console.log('🤖 Bot:', response.substring(0, 100) + '...\n');
    
    // Step 7: Done
    console.log('7️⃣ User: done');
    response = bot.receiveMessage(phone, 'done');
    console.log('🤖 Bot:', response.substring(0, 200) + '...\n');
    
    // Step 8: Confirmation
    console.log('8️⃣ User: yes');
    response = bot.receiveMessage(phone, 'yes');
    console.log('🤖 Bot:', response.substring(0, 200) + '...\n');
    
    console.log('✅ Bot flow test completed!');
}

testBotFlow();