const cron = require('node-cron');
const { User, Ride, Booking, Notification } = require('../models');

/**
 * Job 1: Clean up unverified accounts
 * Runs every 6 hours.
 *
 * Deletes accounts where verificationStatus is false AND the account
 * was created more than 24 hours ago (matching the verification token's TTL).
 * This prevents stale, unverified accounts from appearing in the system
 * and consuming storage.
 */
const scheduleUnverifiedCleanup = () => {
  cron.schedule('0 */6 * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      const result = await User.deleteMany({
        verificationStatus: false,
        createdAt: { $lt: cutoff },
      });

      if (result.deletedCount > 0) {
        console.log(`[CRON] Cleaned up ${result.deletedCount} unverified account(s).`);
      }
    } catch (err) {
      console.error('[CRON] Unverified cleanup error:', err.message);
    }
  });

  console.log('[CRON] Unverified account cleanup scheduled (every 6h).');
};

/**
 * Job 2: Ride departure reminders (Algorithm 8)
 * Runs every 30 minutes.
 *
 * Finds rides departing within the next 2 hours that haven't been
 * reminded yet, then notifies the driver and all confirmed passengers.
 */
const scheduleRideReminders = () => {
  cron.schedule('*/30 * * * *', async () => {
    try {
      const now = new Date();
      const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      // Find active/full rides departing in the next 2 hours
      const rides = await Ride.find({
        status: { $in: ['Active', 'Full'] },
        departureDateTime: { $gte: now, $lte: twoHoursLater },
      });

      for (const ride of rides) {
        // Check if reminder already sent (avoid duplicates)
        const existingReminder = await Notification.findOne({
          userId: ride.driverId,
          type: 'Reminder',
          content: { $regex: ride._id.toString() },
        });

        if (existingReminder) continue;

        // Notify driver
        await Notification.create({
          userId: ride.driverId,
          title: 'Ride Reminder',
          content: `Your ride to ${ride.destination} departs at ${ride.departureDateTime.toLocaleTimeString()}. Ride ID: ${ride._id}`,
          type: 'Reminder',
        });

        // Notify all confirmed passengers
        const bookings = await Booking.find({
          rideId: ride._id,
          status: 'Confirmed',
        });

        for (const booking of bookings) {
          await Notification.create({
            userId: booking.passengerId,
            title: 'Departure Reminder',
            content: `Your ride to ${ride.destination} departs at ${ride.departureDateTime.toLocaleTimeString()}. Ride ID: ${ride._id}`,
            type: 'Reminder',
          });
        }

        console.log(`[CRON] Sent reminders for ride ${ride._id} to ${ride.destination} (${bookings.length} passengers).`);
      }
    } catch (err) {
      console.error('[CRON] Ride reminder error:', err.message);
    }
  });

  console.log('[CRON] Ride departure reminders scheduled (every 30min).');
};

/**
 * Initialize all scheduled jobs
 */
const initScheduledJobs = () => {
  scheduleUnverifiedCleanup();
  scheduleRideReminders();
};

module.exports = initScheduledJobs;
