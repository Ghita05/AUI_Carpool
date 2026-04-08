require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const connectDB = require('./config/db');
const configureSocket = require('./socket');
const errorHandler = require('./middleware/errorHandler');
const initScheduledJobs = require('./services/scheduledJobs');

// Route imports
const authRoutes = require('./routes/authRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const rideRoutes = require('./routes/rideRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const messageRoutes = require('./routes/messageRoutes');

const app = express();
const server = http.createServer(app);

// ── Socket.IO setup ──
const io = new Server(server, {
  cors: {
    origin: [
      process.env.CLIENT_WEB_URL || 'http://localhost:3000',
      'http://localhost:19006', // Expo web
    ],
    methods: ['GET', 'POST'],
  },
});
configureSocket(io);

// Make io accessible in controllers (for push notifications)
app.set('io', io);

// ── Ensure uploads directory exists ──
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE CHAIN (Server-Side Presentation Tier — 0.5 Tier)
// Order matters: security → parsing → logging → rate limiting → routes → errors
// ═══════════════════════════════════════════════════════════════

// 1. Security headers
app.use(helmet());

// 2. CORS — allow web + mobile clients
app.use(
  cors({
    origin: [
      process.env.CLIENT_WEB_URL || 'http://localhost:3000',
      'http://localhost:19006',
    ],
    credentials: true,
  })
);

// 3. Request logging
app.use(morgan('dev'));

// 4. Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 5. Static file serving (uploaded images)
app.use('/uploads', express.static(uploadsDir));

// 6. Rate limiting (100 requests per 15 min per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});
app.use('/api/', limiter);

// ═══════════════════════════════════════════════════════════════
// ROUTE MOUNTING — Maps to Table 12 (Service to Building Block)
// ═══════════════════════════════════════════════════════════════

app.use('/api/users', authRoutes);           // BB1: Manage User Accounts
app.use('/api/vehicles', vehicleRoutes);     // BB3: Manage Vehicles
app.use('/api/rides', rideRoutes);           // BB2: Manage Rides (offers, requests, bookings)
app.use('/api/reviews', reviewRoutes);       // BB4: Manage Ratings & Reviews
app.use('/api/notifications', notificationRoutes); // BB5: Manage Notifications
app.use('/api/messages', messageRoutes);     // BB6: Manage Messages

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'AUI Carpool API is running.', timestamp: new Date() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// ═══════════════════════════════════════════════════════════════
// ERROR HANDLER (must be last middleware)
// ═══════════════════════════════════════════════════════════════
app.use(errorHandler);

// ═══════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════
const startServer = async () => {
  try {
    await connectDB();

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`\n══════════════════════════════════════`);
      console.log(`  AUI Carpool API — Port ${PORT}`);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  Socket.IO: enabled`);
      console.log(`══════════════════════════════════════\n`);

      // Start scheduled jobs after DB is connected
      initScheduledJobs();
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down...');
  server.close(() => process.exit(0));
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

startServer();

module.exports = { app, server, io };
