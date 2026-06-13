const dns = require('dns');
const mongoose = require('mongoose');

dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB...');
    console.log('Using DNS servers:', dns.getServers());
    console.log('URI:', process.env.MONGODB_URI);

    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.log('==================== FULL ERROR ====================');
    console.error(error);
    console.log('===================================================');
    process.exit(1);
  }
};

module.exports = connectDB;