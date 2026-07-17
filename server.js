require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5000;

// ─── Start Server ─────────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    // Connect to MongoDB Atlas
    await connectDB();

    app.listen(PORT, () => {
      console.log('─────────────────────────────────────────────');
      console.log(`  Kayro Backend running on port ${PORT}`);
      console.log(`  Environment : ${process.env.NODE_ENV || 'development'}`);
      console.log(`  API Base    : http://localhost:${PORT}/api`);
      console.log(`  Health      : http://localhost:${PORT}/api/health`);
      console.log('─────────────────────────────────────────────');
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err.message);
  process.exit(1);
});

startServer();
