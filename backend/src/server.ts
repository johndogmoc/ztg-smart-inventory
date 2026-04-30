import dotenv from 'dotenv';
dotenv.config();

import app from './app';
// Ensure PRISMA and REDIS instantiate on startup
import { prisma } from './config/prisma';
import redis from './config/redis';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Attempt DB handshake explicitly
    await prisma.$connect();
    console.log('PostgreSQL database connected via Prisma');

    // Start Express
    app.listen(PORT, () => {
      console.log(`ZTG API Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server ->', error);
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(1);
  }
};

startServer();
