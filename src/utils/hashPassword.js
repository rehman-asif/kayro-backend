const bcrypt = require('bcryptjs');

/**
 * Hash a plaintext password
 * @param {string} password - Plaintext password
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

/**
 * Compare a plaintext password with a hash
 * @param {string} password - Plaintext password
 * @param {string} hashedPassword - Hashed password
 * @returns {Promise<boolean>} True if matching, else false
 */
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

module.exports = {
  hashPassword,
  comparePassword,
};
