require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./src/models/Admin');
const User = require('./src/models/User');

const seedAccounts = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const email = 'kayro12@gmail.com';
    const password = '121212';

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      console.log('⚠️  Admin account already exists with this email. No changes made.');
    } else {
      const admin = await Admin.create({
        name: 'Kayro Admin',
        email,
        password,
        role: 'superadmin',
      });
      console.log('🎉 Admin account seeded successfully!');
      console.log(`   Name  : ${admin.name}`);
      console.log(`   Email : ${admin.email}`);
      console.log(`   Role  : ${admin.role}`);
      console.log(`   ID    : ${admin._id}`);
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('⚠️  User account already exists with this email. No changes made.');
    } else {
      const user = await User.create({
        name: 'Kayro User',
        email,
        password,
      });
      console.log('🎉 User account seeded successfully!');
      console.log(`   Name  : ${user.name}`);
      console.log(`   Email : ${user.email}`);
      console.log(`   ID    : ${user._id}`);
    }

    console.log('\nCredentials: kayro12@gmail.com / 121212');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeder failed:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedAccounts();
