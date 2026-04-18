/**
 * socket/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Socket.IO configuration — real-time layer of the 3.5-tier architecture.
 *
 * RESPONSIBILITIES:
 *   1. Authenticate every WebSocket connection with the same JWT used by HTTP.
 *   2. Maintain an in-memory position store for every connected user.
 *   3. Run a GPS-driven state machine on every location update:
 *        - Auto-mark passengers as Present when their GPS is near departure point
 *        - Active/Full → OnGoing (driver moved ≥ DEPARTURE_THRESHOLD_M from start)
 *        - OnGoing → Completed (driver within ARRIVAL_THRESHOLD_M of destination)
 *   4. Send departure-window alerts (dep time → dep+15min) to members not at
 *      the departure point. Alerts sent every ~5 min during the window.
 *   5. Auto-cancel the entire ride if driver is not at departure 15 min after
 *      scheduled departure (late driver auto-cancel).
 *   6. Auto-cancel bookings for passengers not marked Present when ride goes OnGoing.
 *   7. Broadcast live tracking data (position) to all ride-room members.
 *   8. Handle direct messages and group channel messages in real-time.
 *
 * GEOGRAPHIC THRESHOLDS (tuned for AUI → city routes):
 *   ATTENDANCE_THRESHOLD_M = 300  m  — passenger is "at" the departure point
 *   DEPARTURE_THRESHOLD_M  = 200  m  — driver has clearly left the pickup area
 *   ARRIVAL_THRESHOLD_M    = 300  m  — close enough to destination to auto-complete
 *   LATE_THRESHOLD_M       = 500  m  — member is not at the departure point
 *   LATE_WINDOW_MS         = 15 min  — window after departure to check for latecomers
 *   ALERT_INTERVAL_MS      = 5 min   — gap between repeated departure alerts
 */

const jwt = require('jsonwebtoken');
const { Ride, Notification, User } = require('../models');

const ATTENDANCE_THRESHOLD_M = 300;
const DEPARTURE_THRESHOLD_M  = 200;
const ARRIVAL_THRESHOLD_M    = 300;
const LATE_THRESHOLD_M       = 500;
const LATE_WINDOW_MS         = 15 * 60 * 1000;
const ALERT_INTERVAL_MS      = 5 * 60 * 1000;

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
 * autoMarkAttendance
 * Called on every PASSENGER location-update. If the passenger is within
 * ATTENDANCE_THRESHOLD_M of the departure point and has a confirmed booking
 * with no attendanceStatus yet, auto-mark them as Present.
 */
async function autoMarkAttendance(io, rideId, passengerId, passengerLat, passengerLng) {
  let ride;
  try { ride = await Ride.findById(rideId); } catch { return; }
  if (!ride || ride.type !== 'Offer') return;
  if (!['Active', 'Full', 'OnGoing'].includes(ride.state)) return;

  const route = ride.route;
  if (!route?.originLatitude) return;

  const depLat = route.originLatitude;
  const depLng = route.originLongitude;
  const dist   = haversineDistance(passengerLat, passengerLng, depLat, depLng);

  if (dist > ATTENDANCE_THRESHOLD_M) return;

  // Find this passenger's confirmed booking with no attendance yet
  const booking = (ride.bookings || []).find(
    b => b.passengerId.toString() === passengerId &&
         b.status === 'Confirmed' &&
         b.attendanceStatus === null
  );
  if (!booking) return;

  await Ride.findOneAndUpdate(
    { _id: rideId, 'bookings._id': booking._id },
    { $set: { 'bookings.$.attendanceStatus': 'Present' } }
  );

  // Notify passenger and driver
  io.to(`user:${passengerId}`).emit('attendance-auto-marked', {
    rideId: rideId.toString(),
    bookingId: booking._id.toString(),
    status: 'Present',
  });
  io.to(`user:${ride.driverId.toString()}`).emit('attendance-updated', {
    rideId: rideId.toString(),
    bookingId: booking._id.toString(),
    passengerId,
    status: 'Present',
    source: 'gps',
  });

  console.log(`[Socket] Auto-marked passenger ${passengerId} as Present for ride ${rideId} (${Math.round(dist)}m from departure).`);
}

/**
 * cancelAbsentPassengers
 * Once a ride transitions to OnGoing, cancel bookings for passengers
 * not marked as Present. Called once per ride (guarded by absentPassengersCancelled flag).
 */
async function cancelAbsentPassengers(io, rideId) {
  const ride = await Ride.findOneAndUpdate(
    { _id: rideId, state: 'OnGoing', absentPassengersCancelled: false },
    { $set: { absentPassengersCancelled: true } },
    { new: true }
  );
  if (!ride) return; // Already done or not OnGoing

  const absentBookings = (ride.bookings || []).filter(
    b => b.status === 'Confirmed' && b.attendanceStatus !== 'Present'
  );

  for (const bk of absentBookings) {
    await Ride.findOneAndUpdate(
      { _id: rideId, 'bookings._id': bk._id },
      {
        $set: {
          'bookings.$.status': 'Cancelled',
          'bookings.$.attendanceStatus': 'Absent',
          'bookings.$.cancellationReason': 'Auto-cancelled: not present at departure',
          'bookings.$.cancellationDate': new Date(),
        },
        $inc: { availableSeats: 1 },
      }
    );

    await User.findByIdAndUpdate(bk.passengerId, { $inc: { cancellationCount: 1 } });

    await Notification.create({
      userId: bk.passengerId,
      title: 'Booking Auto-Cancelled',
      content: `Your booking for the ride to ${ride.destination} was cancelled because you were not present at the departure point when the ride started.`,
      type: 'Cancellation',
    });

    io.to(`user:${bk.passengerId.toString()}`).emit('booking-auto-cancelled', {
      rideId: rideId.toString(),
      bookingId: bk._id.toString(),
      reason: 'Not present at departure when ride started',
    });

    console.log(`[Socket] Auto-cancelled absent passenger ${bk.passengerId} for ride ${rideId}.`);
  }

  // Update ride state if all passengers were cancelled
  const updatedRide = await Ride.findById(rideId);
  const remaining = (updatedRide.bookings || []).filter(b => b.status === 'Confirmed');
  if (remaining.length === 0 && updatedRide.state === 'OnGoing') {
    // Downgrade from Full back to Active equivalent doesn't apply for OnGoing — just proceed
    console.log(`[Socket] All passengers cancelled for ride ${rideId}, ride continues with driver only.`);
  }
}

/**
 * runGpsStateMachine
 * Called on every driver location-update. Performs sequential checks:
 *   A. Active/Full → OnGoing (driver left departure area)
 *   C. Departure-window alerts (repeated every ~5min)
 *   D. Late driver auto-cancel (15min past departure, driver not at pickup)
 *   B. OnGoing → Completed (driver near destination)
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

    // Auto-cancel passengers not marked as Present
    cancelAbsentPassengers(io, rideId).catch(err =>
      console.error(`[Socket] Error cancelling absent passengers for ride ${rideId}:`, err.message)
    );

    return; // Re-read state on next ping
  }

  // ── Check C: Departure-window alerts (repeated every ~5min) ────────────────
  if (['Active', 'Full'].includes(ride.state)) {
    const now           = Date.now();
    const depTime       = new Date(ride.departureDateTime).getTime();
    const msSinceDepart = now - depTime;

    if (msSinceDepart > 0 && msSinceDepart <= LATE_WINDOW_MS) {
      // Determine how many alert rounds should have been sent by now
      const expectedRound = Math.floor(msSinceDepart / ALERT_INTERVAL_MS) + 1;
      const alreadySent   = ride.departureAlertsSent || 0;

      if (expectedRound > alreadySent) {
        const confirmed = (ride.bookings || []).filter(b => b.status === 'Confirmed');
        const allIds    = [ride.driverId.toString(), ...confirmed.map(b => b.passengerId.toString())];

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
          }
        }

        await Ride.findByIdAndUpdate(rideId, { $set: { departureAlertsSent: expectedRound } });
        console.log(`[Socket] Departure alert round ${expectedRound} sent for ride ${rideId}.`);
      }
    }

    // ── Check D: Late driver auto-cancel (15min past departure) ───────────
    if (msSinceDepart > LATE_WINDOW_MS) {
      // Driver hasn't departed yet (still within departure threshold)
      // The fact that we reached here means the ride is still Active/Full
      // and Check A didn't fire (distFromDep < DEPARTURE_THRESHOLD_M)
      const reason = 'Auto-cancelled: driver did not depart within 15 minutes of scheduled time';
      const driver = await User.findById(ride.driverId).select('firstName lastName');
      const driverName = `${driver?.firstName || ''} ${driver?.lastName || ''}`.trim();
      const confirmed = (ride.bookings || []).filter(b => b.status === 'Confirmed');

      await Ride.findByIdAndUpdate(rideId, {
        $set: {
          state: 'Cancelled',
          cancellationReason: reason,
          cancellationDate: new Date(),
          'bookings.$[elem].status': 'Cancelled',
          'bookings.$[elem].cancellationDate': new Date(),
          'bookings.$[elem].cancellationReason': reason,
        },
      }, { arrayFilters: [{ 'elem.status': 'Confirmed' }] });

      await User.findByIdAndUpdate(ride.driverId, { $inc: { cancellationCount: 1 } });

      for (const bk of confirmed) {
        await Notification.create({
          userId: bk.passengerId,
          title: 'Ride Auto-Cancelled',
          content: `The ride to ${ride.destination} by ${driverName} was cancelled because the driver did not show up within 15 minutes of the scheduled departure.`,
          type: 'Cancellation',
        });
        io.to(`user:${bk.passengerId.toString()}`).emit('ride-auto-cancelled', {
          rideId: ride._id.toString(),
          reason: 'Driver did not show up within 15 minutes',
        });
      }

      // Notify driver too
      await Notification.create({
        userId: ride.driverId,
        title: 'Ride Auto-Cancelled',
        content: `Your ride to ${ride.destination} was automatically cancelled because you did not depart within 15 minutes of the scheduled time.`,
        type: 'Cancellation',
      });
      io.to(`user:${ride.driverId.toString()}`).emit('ride-auto-cancelled', {
        rideId: ride._id.toString(),
        reason: 'You did not depart within 15 minutes of the scheduled time',
      });

      console.log(`[Socket] Ride ${rideId} auto-cancelled: driver late (>15min past departure).`);
      return;
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
      } else {
        // Passenger position: auto-mark attendance if near departure point
        autoMarkAttendance(io, rideId, uid, latitude, longitude).catch(err =>
          console.error(`[Socket] Auto-attendance error for ride ${rideId}:`, err.message)
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
