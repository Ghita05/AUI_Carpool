const cron = require('node-cron');
const { User, Ride, Notification, Review } = require('../models');
const { sendNotification } = require('../utils/notify');

// Runs every 6h: deletes unverified accounts older than 24 hours.
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

// Runs every 30min: sends departure reminders to driver and confirmed passengers 2 hours before the ride.
const scheduleRideReminders = (io = null) => {
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
        // Only remind rides that have confirmed passengers
        const confirmedBookings = ride.bookings
          ? ride.bookings.filter(b => b.status === 'Confirmed')
          : [];
        if (confirmedBookings.length === 0) continue;

        // Check if reminder already sent (avoid duplicates)
        const existingReminder = await Notification.findOne({
          userId: ride.driverId,
          type: 'Reminder',
          content: { $regex: ride._id.toString() },
        });

        if (existingReminder) continue;

        // Notify driver
        await sendNotification(io, {
          userId: ride.driverId,
          title: 'Ride Reminder',
          content: `Your ride to ${ride.destination} departs at ${ride.departureDateTime.toLocaleTimeString()}. Ride ID: ${ride._id}`,
          type: 'Reminder',
        });

        // Notify all confirmed passengers
        for (const booking of confirmedBookings) {
          await sendNotification(io, {
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

// Runs every 30min: auto-completes rides stuck in OnGoing for more than 6 hours (GPS failure fallback).
const scheduleOngoingSafetyNet = (io = null) => {
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

        const memberIds = [completed.driverId, ...presentIds];
        for (const mid of memberIds) {
          await sendNotification(io, {
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

// Runs every 5min: auto-cancels rides where the driver did not depart within 15 minutes. Backup for when the driver is offline.
const scheduleLateDriverAutoCancel = (io = null) => {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - 15 * 60 * 1000); // 15 min ago
      const lateRides = await Ride.find({
        type: 'Offer',
        state: { $in: ['Active', 'Full'] },
        departureDateTime: { $lt: cutoff },
      });

      for (const ride of lateRides) {
        const reason = 'Auto-cancelled: driver did not depart within 15 minutes of scheduled time';
        const driver = await User.findById(ride.driverId).select('firstName lastName');
        const driverName = `${driver?.firstName || ''} ${driver?.lastName || ''}`.trim();
        const confirmed = (ride.bookings || []).filter(b => b.status === 'Confirmed');

        // Empty rides are handled by Job 5 (Dismissed). Only cancel if passengers are waiting.
        if (confirmed.length === 0) continue;

        await Ride.findByIdAndUpdate(ride._id, {
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

        // Notify all confirmed passengers
        for (const bk of confirmed) {
          await sendNotification(io, {
            userId: bk.passengerId,
            title: 'Ride Auto-Cancelled',
            content: `The ride to ${ride.destination} by ${driverName} was cancelled because the driver did not show up within 15 minutes of the scheduled departure.`,
            type: 'Cancellation',
          });
        }

        // Notify driver
        await sendNotification(io, {
          userId: ride.driverId,
          title: 'Ride Auto-Cancelled',
          content: `Your ride to ${ride.destination} was automatically cancelled because you did not depart within 15 minutes of the scheduled time.`,
          type: 'Cancellation',
        });

        console.log(`[CRON] Late-driver auto-cancelled ride ${ride._id} to ${ride.destination}.`);
      }
    } catch (err) {
      console.error('[CRON] Late driver auto-cancel error:', err.message);
    }
  });
  console.log('[CRON] Late driver auto-cancel scheduled (every 5min).');
};

// Runs every 5min: silently dismisses offers with 0 confirmed passengers after their departure time.
const scheduleEmptyRideDismissal = () => {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();
      const emptyRides = await Ride.find({
        type: 'Offer',
        state: { $in: ['Active'] },
        departureDateTime: { $lt: now },
      });

      for (const ride of emptyRides) {
        const confirmedCount = (ride.bookings || []).filter(b => b.status === 'Confirmed').length;
        if (confirmedCount > 0) continue; // has passengers — let late-driver job handle it

        await Ride.findByIdAndUpdate(ride._id, {
          $set: {
            state: 'Dismissed',
            cancellationReason: 'Auto-dismissed: no passengers at departure time',
            cancellationDate: new Date(),
          },
        });

        console.log(`[CRON] Silently dismissed empty ride ${ride._id} to ${ride.destination}.`);
      }
    } catch (err) {
      console.error('[CRON] Empty ride dismissal error:', err.message);
    }
  });
  console.log('[CRON] Empty ride dismissal scheduled (every 5min).');
};

// Runs nightly at 2am: regenerates AI review summaries for users with >= MIN_REVIEWS_FOR_SUMMARY reviews.
const MIN_REVIEWS_FOR_SUMMARY = 5;
const scheduleAISummaryRefresh = () => {
  cron.schedule('0 2 * * *', async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return;

    try {
      const users = await User.find({}).select('_id firstName lastName role averageRating');
      let refreshed = 0;

      for (const user of users) {
        const reviews = await Review.find({ subjectId: user._id });
        if (reviews.length < MIN_REVIEWS_FOR_SUMMARY) continue;

        const reviewTexts = reviews
          .filter(r => r.content && r.content.trim().length > 0)
          .map((r, i) => `${i + 1}. "${r.content.trim()}"`)
          .join('\n');
        if (!reviewTexts) continue;

        const userName = `${user.firstName} ${user.lastName}`.trim();
        const avgRating = user.averageRating || 0;
        const prompt = `Based on these ${reviews.length} reviews of ${userName} (a ${user.role} on a university carpooling platform, avg ${avgRating}/5):\n\n${reviewTexts}\n\nWrite 2-3 flowing sentences that capture the overall impression — what kind of ${user.role} they are, what stands out, and what to expect. Write as a neutral observer who read all the reviews. Third person. No rating numbers. No "reviewers say" or "according to reviews". Complete grammatically correct sentences only. Max 70 words.`;

        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 300, temperature: 0.4 },
              }),
            }
          );
          if (!res.ok) continue;
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (text) {
            await User.findByIdAndUpdate(user._id, { reviewSummary: text });
            refreshed++;
          }
        } catch (e) {
          console.warn(`[CRON] AI summary failed for ${userName}:`, e.message);
        }
      }

      if (refreshed > 0) console.log(`[CRON] AI summary refresh complete — ${refreshed} profile(s) updated.`);
    } catch (err) {
      console.error('[CRON] AI summary refresh error:', err.message);
    }
  });
  console.log('[CRON] AI summary refresh scheduled (nightly at 2am).');
};

// Registers all cron jobs.
const initScheduledJobs = (io = null) => {
  scheduleUnverifiedCleanup();
  scheduleRideReminders(io);
  scheduleOngoingSafetyNet(io);
  scheduleLateDriverAutoCancel(io);
  scheduleEmptyRideDismissal();
  scheduleAISummaryRefresh();
};

module.exports = initScheduledJobs;
