const jwt = require('jsonwebtoken');

const configureSocket = (io) => {
  // ── Authentication middleware for WebSocket connections ──
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.userId}`);

    // Join personal notification room
    socket.join(`user:${socket.userId}`);

    // ── Ride tracking ──
    socket.on('join-ride', (rideId) => {
      socket.join(`ride:${rideId}`);
    });

    socket.on('leave-ride', (rideId) => {
      socket.leave(`ride:${rideId}`);
    });

    socket.on('location-update', (data) => {
      // Broadcast driver location to all passengers tracking this ride
      io.to(`ride:${data.rideId}`).emit('driver-location', {
        rideId: data.rideId,
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: new Date(),
      });
    });

    // ── Real-time messaging ──
    socket.on('send-message', (data) => {
      io.to(`user:${data.receiverId}`).emit('new-message', {
        senderId: socket.userId,
        content: data.content,
        rideId: data.rideId,
        date: new Date(),
      });
    });

    socket.on('typing', (data) => {
      io.to(`user:${data.receiverId}`).emit('user-typing', {
        userId: socket.userId,
      });
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.userId}`);
    });
  });
};

module.exports = configureSocket;
