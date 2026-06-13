const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();
console.log("MONGODB_URI:", process.env.MONGODB_URI ? '(set)' : '(NOT SET - check Render env vars!)');
console.log("JWT_SECRET:", process.env.JWT_SECRET ? '(set)' : '(NOT SET)');
console.log("GROQ_API_KEY:", process.env.GROQ_API_KEY ? '(set)' : '(NOT SET)');

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const analysisRoutes = require('./routes/analysisRoutes');

const startServer = async () => {
  await connectDB();

  const app = express();

  // Allow requests from any origin (covers Render frontend + local dev)
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  app.use('/api/auth', authRoutes);
  app.use('/api/analysis', analysisRoutes);

  app.get('/', (req, res) => {
    res.json({ message: 'AI Resume Grader API is running' });
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Global error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal server error';
    res.status(status).json({ message });
  });

  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Please free the port and restart the server.`);
    } else {
      console.error('Server error:', err);
    }
    process.exit(1);
  });
};

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
