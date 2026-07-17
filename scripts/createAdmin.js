/**
 * Script to seed the first Admin user.
 *
 * Usage:
 *   node scripts/createAdmin.js --name="Admin One" --email="admin@example.com" --password="SecurePass123"
 *
 * Or via npm script:
 *   npm run seed-admin -- --name="Admin One" --email="admin@example.com" --password="SecurePass123"
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const Admin = require('../src/models/Admin');
const connectDB = require('../src/config/db');

// ─── Parse CLI Arguments ──────────────────────────────────────────────────────
const parseArgs = () => {
  const args = {};
  process.argv.slice(2).forEach((arg) => {
    const [key, value] = arg.replace('--', '').split('=');
    if (key && value) {
      args[key] = value;
    }
  });
  return args;
};

const run = async () => {
  const { name, email, password } = parseArgs();

  if (!name || !email || !password) {
    console.error('❌  Missing required arguments.');
    console.error('    Usage: node scripts/createAdmin.js --name="Admin Name" --email="admin@example.com" --password="YourPassword"');
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('❌  Password must be at least 6 characters.');
    process.exit(1);
  }

  try {
    await connectDB();

    // Check if admin already exists
    const existing = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      console.warn(`⚠️   Admin with email '${email}' already exists. Skipping creation.`);
      await mongoose.disconnect();
      process.exit(0);
    }

    // Create admin (password hashed by pre-save hook)
    const admin = await Admin.create({
      name,
      email: email.toLowerCase().trim(),
      password,
      role: 'admin',
    });

    console.log('✅  Admin user created successfully!');
    console.log(`    Name  : ${admin.name}`);
    console.log(`    Email : ${admin.email}`);
    console.log(`    Role  : ${admin.role}`);
    console.log(`    ID    : ${admin._id}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌  Error creating admin:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

run();
