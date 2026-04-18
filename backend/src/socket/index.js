/**
 * socket/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Socket.IO configuration — real-time layer of the 3.5-tier architecture.
 *
 * RESPONSIBILITIES:
 *   1. Authenticate every WebSocket connection with the same JWT used by HTTP.
 *   2. Maintain an in-memory position store for every connected user.
 *   3. Run a GPS-driven state machine on every driver position update:
 *        Active/Full  → OnGoing   (driver moved ≥ DEPARTURE_THRESHOLD_M from start)
 *        OnGoing      → Completed (driver within ARRIVAL_THRESHOLD_M of destination)
 *   4. Send late-departure push notifications when members are still far from
 *      the pickup point after the scheduled departure time.
 *   5. Broadcast live tracking data (position) to all ride-room members.
 *   6. Handle direct messages and group channel messages in real-time.
 *
 * WHY IN-MEMORY POSITION STORE:
 *   Persisting every GPS ping to MongoDB would create massive write pressure.
 *   The Map holds only the latest position per user — O(1) reads, no DB round-trips.
 *   Positions are evicted after 2 hours of inactivity.
 *
 * GEOGRAPHIC THRESHOLDS (tuned for AUI → city routes):
 *   DEPARTURE_THRESHOLD_M = 200  m  — driver has clearly left the pickup area
 *   ARRIVAL_THRESHOLD_M   = 300  m  — close enough to destination to auto-complete
 *   LATE_THRESHOLD_M      = 500  m  — member is not at the departure point
 *   LATE_WINDOW_MS        = 15 min  — window after departure to check for latecomers
 */

const jwt = require('jsonwebtoken');
const { Ride, Notification, User } = require('../models');

const DEPARTURE_THRESHOLD_M = 200;
const ARRIVAL_THRESHOLD_M   = 300;
const LATE_THRESHOLD_M      = 500;
const LATE_WINDOW_MS        = 15 * 60 * 1000;

// In-memory: userId (string) → { lat, lng, updatedAt (ms) }
const lastPositions = new Map();

/**
 * haversineDistance — returns distance in metres between two lat/lng pairs.
 * Haversine formula accurate to < 0.5% for all distances relevant here.
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * emitReviewPrompts
 * Fires `ride-completed` to every member's personal Socket room and persists
 * an in-app notification so offline members are also prompted on next login.
 * Exported so the HTTP completeRide controller can call it for manual completions.
 */
async function emitReviewPrompts(io, ride) {
  const confirmedBookings = (ride.bookings || []).filter(b => b.status === 'Completed' || b.status === 'Confirmed');
  const memberIds = [
    ride.driverId.toString(),
    ...confirmedBookings.map(b => b.passengerId.toString()),
  ];

  const participants = await User.find({ _id: { $in: memberIds } })
    .select('firstName lastName role _id');

  const payload = {
    rideId: ride._id.toString(),
    destination: ride.destination,
    participants: participants.map(u => ({
      userId: u._id.toString(),
      name: `${u.firstName} ${u.lastName}`.trim(),
      role: u.role,
    })),
  };

  for (const memberId of memberIds) {
    io.to(`user:${memberId}`).emit('ride-completed', payload);
    await Notification.create({
      userId: memberId,
      title: 'Ride Complete — Rate Your Experience',
      content: `Your ride to ${ride.destination} is done. Tap to rate your fellow travellers.`,
      type: 'Alert',
    });
  }
}

/**
 * runGpsStateMachine
 * Called on every driver location-update. Performs three sequential checks.
 */
async function runGpsStateMachine(io, rideId, driverLat, driverLng) {
  let ride;
  try {
    ride = await Ride.findById(rideId);
  } catch {
    return;
  }
  if (!ride || ride.type !== 'Offer') return;

  const route = ride.route;
  if (!route?.originLatitude) return;

  const depLat  = route.originLatitude;
  const depLng  = route.originLongitude;
  const destLat = route.destinationLatitude;
  const destLng = route.destinationLongitude;

  const distFromDep  = haversineDistance(driverLat, driverLng, depLat, depLng);
  const distFromDest = haversineDistance(driverLat, driverLng, destLat, destLng);

  // ── Check A: Active/Full → OnGoing ────────────────────────────────────────
  if (['Active', 'Full'].includes(ride.state) && distFromDep >= DEPARTURE_THRESHOLD_M) {
    await Ride.findByIdAndUpdate(rideId, {
      $set: { state: 'OnGoing', ongoingStartedAt: new Date() },
    });

    const confirmed = (ride.bookings || []).filter(b => b.status === 'Confirmed');
    for (const bk of confirmed) {
      io.to(`user:${bk.passengerId.toString()}`).emit('ride-started', {
        rideId: ride._id.toString(),
        destination: ride.destination,
      });
      await Notification.create({
        userId: bk.passengerId,
        title: 'Your Ride Has Started',
        content: `Your ride to ${ride.destination} is on its way.`,
        type: 'Alert',
      });
    }
    console.log(`[Socket] Ride ${rideId} → OnGoing (driver ${Math.round(distFromDep)}m from start).`);
    return; // Re-read state on next ping
  }

  // ── Check C: Late-departure notifications ─────────────────────────────────
  if (['Active', 'Full'].includes(ride.state) && !ride.lateNotificationSent) {
    const now           = Date.now();
    const depTime       = new Date(ride.departureDateTime).getTime();
    const msSinceDepart = now - depTime;

    if (msSinceDepart > 0 && msSinceDepart <= LATE_WINDOW_MS) {
      const confirmed = (ride.bookings || []).filter(b => b.status === 'Confirmed');
      const allIds    = [ride.driverId.toString(), ...confirmed.map(b => b.passengerId.toString())];
      let sentAny     = false;

      for (const mid of allIds) {
        const pos = lastPositions.get(mid);
        if (!pos) continue;
        const dist = haversineDistance(pos.lat, pos.lng, depLat, depLng);
        if (dist > LATE_THRESHOLD_M) {
          await Notification.create({
            userId: mid,
            title: 'Departure Time Has Passed',
            content: `Your ride to ${ride.destination} was scheduled to depart. Make your way to the pickup point.`,
            type: 'Reminder',
          });
          io.to(`user:${mid}`).emit('late-notification', {
            rideId: ride._id.toString(),
            message: `Your ride to ${ride.destination} departure time has passed. Head to the pickup point.`,
          });
          sentAny = true;
        }
      }

      if (sentAny) {
        await Ride.findByIdAndUpdate(rideId, { $set: { lateNotificationSent: true } });
        console.log(`[Socket] Late-departure notifications sent for ride ${rideId}.`);
      }
    }
  }

  // ── Check B: OnGoing → Completed (auto via GPS) ───────────────────────────
  if (ride.state === 'OnGoing' && !ride.reviewsPrompted && distFromDest <= ARRIVAL_THRESHOLD_M) {
    // findOneAndUpdate with reviewsPrompted: false guard prevents double-fire
    const completed = await Ride.findOneAndUpdate(
      { _id: rideId, state: 'OnGoing', reviewsPrompted: false },
      {
        $set: {
          state: 'Completed',
          reviewsPrompted: true,
          'bookings.$[elem].status': 'Completed',
        },
      },
      { arrayFilters: [{ 'elem.status': 'Confirmed' }], new: true }
    );
    if (!completed) return; // Another path already completed it

    // Increment totalCompletedRides for all non-absent members
    const presentIds = (completed.bookings || [])
      .filter(b => b.status === 'Completed' && b.attendanceStatus !== 'Absent')
      .map(b => b.passengerId);
    await User.updateMany(
      { _id: { $in: [completed.driverId, ...presentIds] } },
      { $inc: { totalCompletedRides: 1 } }
    );

    await emitReviewPrompts(io, completed);
    io.to(`ride:${rideId}`).emit('ride-auto-completed', {
      rideId: rideId.toString(),
      destination: completed.destination,
    });
    console.log(`[Socket] Ride ${rideId} auto-completed (driver ${Math.round(distFromDest)}m from destination).`);
  }
}

// ── Main export ───────────────────────────────────────────────────────────────
const configureSocket = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.userId   = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const uid = socket.userId;
    console.log(`[Socket] Connected: ${uid}`);
    socket.join(`user:${uid}`);

    // ── Ride room ──
    socket.on('join-ride',  (rideId) => socket.join(`ride:${rideId}`));
    socket.on('leave-ride', (rideId) => socket.leave(`ride:${rideId}`));

    // ── Location update (driver and passengers both send) ──────────────────
    socket.on('location-update', async (data) => {
      const { rideId, latitude, longitude } = data;
      if (typeof latitude !== 'number' || typeof longitude !== 'number') return;

      // Store latest position for all users (needed for late-departure checks)
      lastPositions.set(uid, { lat: latitude, lng: longitude, updatedAt: Date.now() });

      if (!rideId) return;

      // Broadcast to all ride-room members so the map updates for everyone
      io.to(`ride:${rideId}`).emit('member-location', {
        rideId,
        userId:   uid,
        isDriver: socket.userRole === 'Driver',
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
      });

      // Only driver position drives the state machine
      if (socket.userRole === 'Driver') {
        runGpsStateMachine(io, rideId, latitude, longitude).catch(err =>
          console.error(`[Socket] State machine error for ride ${rideId}:`, err.message)
        );
      }
    });

    // ── Direct messages ────────────────────────────────────────────────────
    socket.on('send-message', (data) => {
      io.to(`user:${data.receiverId}`).emit('new-message', {
        senderId: uid,
        content:  data.content,
        rideId:   data.rideId || null,
        date:     new Date().toISOString(),
      });
    });

    socket.on('typing', (data) => {
      io.to(`user:${data.receiverId}`).emit('user-typing', { userId: uid });
    });

    // ── Group channel ──────────────────────────────────────────────────────
    socket.on('join-channel',  (rideId) => socket.join(`channel:${rideId}`));
    socket.on('leave-channel', (rideId) => socket.leave(`channel:${rideId}`));
    socket.on('send-channel-message', (data) => {
      socket.to(`channel:${data.rideId}`).emit('new-channel-message', {
        rideId:   data.rideId,
        senderId: uid,
        content:  data.content,
        date:     new Date().toISOString(),
      });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${uid}`);
    });
  });

  // Evict stale positions every 10 minutes (positions older than 2 hours)
  const POSITION_TTL = 2 * 60 * 60 * 1000;
  setInterval(() => {
    const now = Date.now();
    let n = 0;
    for (const [id, p] of lastPositions.entries()) {
      if (now - p.updatedAt > POSITION_TTL) { lastPositions.delete(id); n++; }
    }
    if (n) console.log(`[Socket] Evicted ${n} stale position(s).`);
  }, 10 * 60 * 1000);
};

module.exports = { configureSocket, emitReviewPrompts };
