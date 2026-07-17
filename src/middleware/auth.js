const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to verify user JWT token (Access Token only)
 */
const protectUser = async (req, res, next) => {
  let token = null;

  // 1. Read token from cookies (httpOnly)
  if (req.cookies && req.cookies.user_token) {
    token = req.cookies.user_token;
  }
  // 2. Fallback to Authorization Header (Bearer token)
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided',
    });
  }

  try {
    // Verify token using User JWT Secret
    const decoded = jwt.verify(token, process.env.JWT_USER_SECRET);

    // Guard against refresh tokens being used as access tokens
    if (decoded.tokenType !== 'access') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type, access token required',
      });
    }

    // Verify the user still exists
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists',
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('User Auth Middleware Error:', error.message);
    
    let message = 'Not authorized, token failed';
    if (error.name === 'TokenExpiredError') {
      message = 'Access token expired';
    }

    return res.status(401).json({
      success: false,
      message,
    });
  }
};

module.exports = { protectUser };
