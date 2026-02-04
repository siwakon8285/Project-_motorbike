const { Pool } = require('pg');
const redis = require('redis');
require('dotenv').config();

// PostgreSQL Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/motorbike_service',
});

pool.on('connect', () => {
  // Connected to PostgreSQL
});

pool.on('error', (err) => {
  // PostgreSQL connection error
});

// Redis Connection
// const redisClient = redis.createClient({
//   url: process.env.REDIS_URL || 'redis://localhost:6379'
// });

// redisClient.on('connect', () => {
//   console.log('Connected to Redis');
// });

// redisClient.on('error', (err) => {
//   console.error('Redis connection error:', err);
// });

// // Connect Redis
// (async () => {
//   // await redisClient.connect();
// })();

module.exports = { pool };
