const cron = require('node-cron');
const { User, Ride, Notification } = require('../models');

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
        state: { $in: ['Active', 'Full'] },
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

        // Notify all confirmed passengers (embedded bookings)
        const confirmedBookings = ride.bookings
          ? ride.bookings.filter(b => b.status === 'Confirmed')
          : [];

        for (const booking of confirmedBookings) {
          await Notification.create({
            userId: booking.passengerId,
            title: 'Departure Reminder',
            content: `Your ride to ${ride.destination} departs at ${ride.departureDateTime.toLocaleTimeString()}. Ride ID: ${ride._id}`,
            type: 'Reminder',
          });
        }

        console.log(`[CRON] Sent reminders for ride ${ride._id} to ${ride.destination} (${confirmedBookings.length} passengers).`);
      }
    } catch (err) {
      console.error('[CRON] Ride reminder error:', err.message);
    }
  });

  console.log('[CRON] Ride departure reminders scheduled (every 30min).');
};

/**
 * Job 3: OnGoing ride safety-net completion
 * Runs every 30 minutes.
 *
 * If a ride has been OnGoing for > 6 hours (GPS either failed or the driver
 * never sent a final position), auto-complete it. This prevents rides from
 * being stuck in OnGoing state permanently.
 * 6 hours is generous enough to cover the longest AUI → Casablanca route.
 */
const scheduleOngoingSafetyNet = () => {
  cron.schedule('*/30 * * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - 6 * 60 * 60 * 1000);
      const stuckRides = await Ride.find({
        state:            'OnGoing',
        reviewsPrompted:  false,
        ongoingStartedAt: { $lt: cutoff },
      });

      for (const ride of stuckRides) {
        const completed = await Ride.findOneAndUpdate(
          { _id: ride._id, state: 'OnGoing', reviewsPrompted: false },
          {
            $set: {
              state:           'Completed',
              reviewsPrompted: true,
              'bookings.$[elem].status': 'Completed',
            },
          },
          { arrayFilters: [{ 'elem.status': 'Confirmed' }], new: true }
        );
        if (!completed) continue;

        const presentIds = (completed.bookings || [])
          .filter(b => b.status === 'Completed' && b.attendanceStatus !== 'Absent')
          .map(b => b.passengerId);
        await User.updateMany(
          { _id: { $in: [completed.driverId, ...presentIds] } },
          { $inc: { totalCompletedRides: 1 } }
        );

        // Notify all members (no io available from cron — use Notification only)
        const memberIds = [completed.driverId, ...presentIds];
        for (const mid of memberIds) {
          await Notification.create({
            userId:  mid,
            title:   'Ride Completed — Rate Your Experience',
            content: `Your ride to ${completed.destination} has been completed. Open the app to leave a review.`,
            type:    'Alert',
          });
        }

        console.log(`[CRON] Safety-net completed stuck OnGoing ride ${ride._id}.`);
      }
    } catch (err) {
      console.error('[CRON] OnGoing safety-net error:', err.message);
    }
  });
  console.log('[CRON] OnGoing safety-net scheduled (every 30min).');
};

/**
 * Initialize all scheduled jobs
 */
const initScheduledJobs = () => {
  scheduleUnverifiedCleanup();
  scheduleRideReminders();
  scheduleOngoingSafetyNet();
};

module.exports = initScheduledJobs;
