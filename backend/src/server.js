require('dotenv').config();

const express = require('express');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const connectDB = require('./config/db');
const configureSocket = require('./socket').configureSocket;
const errorHandler = require('./middleware/errorHandler');
const initScheduledJobs = require('./services/scheduledJobs');

// Route imports
const authRoutes = require('./routes/authRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const rideRoutes = require('./routes/rideRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const messageRoutes = require('./routes/messageRoutes');
const routeRoutes = require('./routes/routeRoutes');

const app = express();

// ── SSL setup (self-signed cert for dev) ──
const certPath = path.join(__dirname, '../certs/cert.pem');
const keyPath = path.join(__dirname, '../certs/key.pem');
const hasSSL = fs.existsSync(certPath) && fs.existsSync(keyPath);

let server;
let httpServer; // secondary HTTP server for mobile dev (Expo Go can't trust self-signed certs)
if (hasSSL) {
  const sslOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
  server = https.createServer(sslOptions, app);
  httpServer = http.createServer(app);
} else {
  console.warn('⚠  SSL certs not found in certs/ — falling back to HTTP');
  server = http.createServer(app);
}

// ── Socket.IO setup (attach to all active servers) ──
const ioServers = [server];
if (httpServer) ioServers.push(httpServer);

const io = new Server({
  cors: {
    origin: [
      process.env.CLIENT_WEB_URL || 'http://localhost:3000',
      'http://localhost:19006', // Expo web
    ],
    methods: ['GET', 'POST'],
  },
});
ioServers.forEach((s) => io.attach(s));
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
app.use('/api/routes', routeRoutes);         // BB7: Routes & Locations

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
    const HTTP_PORT = Number(PORT) + 1; // 5001 — HTTP fallback for Expo Go

    server.listen(PORT, () => {
      const protocol = hasSSL ? 'https' : 'http';
      console.log(`\n══════════════════════════════════════`);
      console.log(`  AUI Carpool API — ${protocol}://localhost:${PORT}`);
      if (hasSSL && httpServer) {
        console.log(`  HTTP fallback — http://localhost:${HTTP_PORT}`);
      }
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  SSL: ${hasSSL ? 'enabled ✓' : 'disabled (no certs)'}`);
      console.log(`  Socket.IO: enabled`);
      console.log(`══════════════════════════════════════\n`);

      // Start HTTP fallback if SSL enabled (for Expo Go mobile dev)
      if (hasSSL && httpServer) {
        httpServer.listen(HTTP_PORT, () => {
          console.log(`  HTTP fallback listening on port ${HTTP_PORT}`);
        });
      }

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
  if (httpServer) httpServer.close();
  server.close(() => process.exit(0));
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

startServer();

module.exports = { app, server, io };
