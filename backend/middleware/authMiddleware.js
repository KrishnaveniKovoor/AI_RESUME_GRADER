const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || typeof authHeader !== 'string') {
      return res.status(401).json({ message: 'Unauthorized. No token provided.' });
    }

    const [scheme, token] = authHeader.trim().split(/\s+/);
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'Unauthorized. Invalid authorization header.' });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'Authentication is not configured.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Session expired. Please login again.' });
      }
      return res.status(401).json({ message: 'Unauthorized. Invalid token.' });
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized. User account not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ message: 'Authentication service error. Please try again.' });
  }
};

module.exports = authMiddleware;
