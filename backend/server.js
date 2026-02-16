const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { pool } = require('./config/db');

// Load env from backend directory explicitly
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const server = http.createServer(app);

const ioEnvOrigins = process.env.FRONTEND_ORIGINS ? process.env.FRONTEND_ORIGINS.split(',').map(s => s.trim()).filter(Boolean) : [];
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return callback(null, true);
      if (/^https:\/\/.*\.vercel\.app$/.test(origin)) return callback(null, true);
      if (ioEnvOrigins.includes(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io available in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Add exit handlers
process.on('exit', (code) => {
  console.log(`About to exit with code: ${code}`);
});
process.on('SIGINT', () => {
  console.log('Received SIGINT. Press Control-D to exit.');
  process.exit();
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Middleware
const envOrigins = process.env.FRONTEND_ORIGINS ? process.env.FRONTEND_ORIGINS.split(',').map(s => s.trim()).filter(Boolean) : [];
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  ...envOrigins
];
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow any localhost origin
    if (origin.match(/^http:\/\/localhost:\d+$/) || origin.match(/^http:\/\/127\.0\.0\.1:\d+$/)) {
      return callback(null, true);
    }
    
    // Allow Vercel domains
    if (origin.match(/^https:\/\/.*\.vercel\.app$/)) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

async function initSchema() {
  try {
    const schemaPath = path.join(__dirname, 'config', 'schema.sql');
    if (!fs.existsSync(schemaPath)) return;
    const sql = fs.readFileSync(schemaPath, 'utf8');
    const statements = sql
      .split(/;\s*\n/g)
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));
    for (const stmt of statements) {
      await pool.query(stmt);
    }
    console.log('Database schema initialized');
  } catch (e) {
    console.error('Schema initialization error:', e.message);
  }
}

// Database Connection Test
pool.query("SELECT NOW() as now", (err, res) => {
  if (err) {
    console.error('Database Connection Error:', err);
  } else {
    console.log('Database Connected at:', res.rows[0].now);
  }
});

initSchema();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/services', require('./routes/services'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/parts', require('./routes/parts'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/chat', require('./routes/chat'));

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

server.on('error', (e) => {
  console.error('Server Error:', e);
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Internal Server Error'
  });
});
