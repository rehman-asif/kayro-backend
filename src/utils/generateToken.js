const jwt = require('jsonwebtoken');

/**
 * Generate Access and Refresh tokens for a User
 * @param {Object} user - User document
 * @returns {Object} { accessToken, refreshToken }
 */
const generateUserTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, role: 'user', tokenType: 'access' },
    process.env.JWT_USER_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  // Use a derivative secret or the user secret for refresh token
  const refreshSecret = process.env.JWT_USER_REFRESH_SECRET || `${process.env.JWT_USER_SECRET}_refresh`;
  const refreshToken = jwt.sign(
    { id: user._id, role: 'user', tokenType: 'refresh' },
    refreshSecret,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

/**
 * Generate Access and Refresh tokens for an Admin
 * @param {Object} admin - Admin document
 * @returns {Object} { accessToken, refreshToken }
 */
const generateAdminTokens = (admin) => {
  const accessToken = jwt.sign(
    { id: admin._id, role: admin.role, tokenType: 'access' },
    process.env.JWT_ADMIN_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  const refreshSecret = process.env.JWT_ADMIN_REFRESH_SECRET || `${process.env.JWT_ADMIN_SECRET}_refresh`;
  const refreshToken = jwt.sign(
    { id: admin._id, role: admin.role, tokenType: 'refresh' },
    refreshSecret,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

module.exports = {
  generateUserTokens,
  generateAdminTokens,
};
