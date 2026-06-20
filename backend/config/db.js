const dns = require('dns');
const mongoose = require('mongoose');

dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not set.');
    }

    console.log('Connecting to MongoDB...');
    console.log('Using DNS servers:', dns.getServers());

    const conn = await mongoose.connect(mongoUri);

    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.log('==================== FULL ERROR ====================');
    console.error(error);
    console.log('===================================================');
    process.exit(1);
  }
};

module.exports = connectDB;
