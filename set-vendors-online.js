// Quick script to set all vendors online for demo purposes
const mongoose = require('mongoose');
require('dotenv').config();

const Vendor = require('./models/Vendor');

async function setVendorsOnline() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        
        const result = await Vendor.updateMany(
            {}, 
            { 
                $set: { 
                    isCurrentlyOpen: true,
                    acceptsOnlineOrders: true 
                } 
            }
        );
        
        console.log(`Updated ${result.modifiedCount} vendors to online status`);
        
        const vendors = await Vendor.find({}, 'name isCurrentlyOpen');
        console.log('Current vendor statuses:');
        vendors.forEach(vendor => {
            console.log(`- ${vendor.name}: ${vendor.isCurrentlyOpen ? 'Online' : 'Offline'}`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

setVendorsOnline();