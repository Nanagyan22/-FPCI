require('dotenv').config();
const mongoose = require('mongoose');

console.log('Testing MongoDB connection...');
console.log('URI:', process.env.MONGODB_URI ? 'Found ✅' : 'Missing ❌');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Connected Successfully!');
    console.log('Host:', mongoose.connection.host);
    console.log('Database:', mongoose.connection.name);
    mongoose.connection.close();
    console.log('Connection closed. Ready to seed!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Connection failed:', err.message);
    console.log('\n📋 TROUBLESHOOTING:');
    console.log('1. Make sure you copied the correct Atlas connection string');
    console.log('2. Replace <password> with your actual password in the URI');
    console.log('3. Make sure your IP is whitelisted in Atlas Network Access');
    console.log('4. Check that the cluster is running (green in Atlas dashboard)');
    process.exit(1);
  });
