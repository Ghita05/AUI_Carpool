#!/usr/bin/env node
/**
 * One-time migration: extract embedded route objects and string stops
 * from Ride documents into separate Route / Location collections,
 * then replace the embedded data with ObjectId references.
 *
 * Usage:
 *   MONGODB_URI="mongodb+srv://..." node src/scripts/migrateRoutesAndLocations.js
 *
 * Safe to re-run — skips rides that already have ObjectId refs.
 */

require('dotenv').config();
const mongoose = require('mongoose');

// ── Raw schemas (match old embedded shape) ───────────────────────────────────
// We do NOT use the app models because those already expect ObjectId refs.
// Instead we work directly with the raw collection.

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB.');

  const db = mongoose.connection.db;
  const ridesCol   = db.collection('rides');
  const routesCol  = db.collection('routes');
  const locsCol    = db.collection('locations');

  // Ensure index on locations.name for upsert performance
  await locsCol.createIndex({ name: 1 });

  let routesMigrated = 0;
  let stopsMigrated  = 0;
  let skipped        = 0;

  const cursor = ridesCol.find({});
  while (await cursor.hasNext()) {
    const ride = await cursor.next();
    const updates = {};

    // ── Migrate embedded route object → Route document ─────────────────────
    if (ride.route && typeof ride.route === 'object' && ride.route.originLatitude !== undefined) {
      // Embedded route — extract to Route collection
      const routeDoc = {
        originLatitude:       ride.route.originLatitude,
        originLongitude:      ride.route.originLongitude,
        destinationLatitude:  ride.route.destinationLatitude,
        destinationLongitude: ride.route.destinationLongitude,
        distanceKM:           ride.route.distanceKM,
        durationMinutes:      ride.route.durationMinutes,
        polyline:             ride.route.polyline || null,
        summary:              ride.route.summary || null,
        createdAt:            new Date(),
        updatedAt:            new Date(),
      };
      const result = await routesCol.insertOne(routeDoc);
      updates.route = result.insertedId;
      routesMigrated++;
    } else if (ride.route && mongoose.Types.ObjectId.isValid(ride.route)) {
      // Already an ObjectId ref — skip
    } else {
      // null / undefined — leave as-is
    }

    // ── Migrate string stops → Location ObjectIds ──────────────────────────
    if (Array.isArray(ride.stops) && ride.stops.length > 0 && typeof ride.stops[0] === 'string') {
      const stopIds = [];
      for (const name of ride.stops) {
        if (!name || typeof name !== 'string') continue;
        const trimmed = name.trim();
        const loc = await locsCol.findOneAndUpdate(
          { name: trimmed },
          { $setOnInsert: { name: trimmed, latitude: null, longitude: null, createdAt: new Date(), updatedAt: new Date() } },
          { upsert: true, returnDocument: 'after' }
        );
        stopIds.push(loc._id);
      }
      updates.stops = stopIds;
      stopsMigrated++;
    }

    if (Object.keys(updates).length > 0) {
      await ridesCol.updateOne({ _id: ride._id }, { $set: updates });
    } else {
      skipped++;
    }
  }

  console.log(`\nMigration complete.`);
  console.log(`  Routes migrated:  ${routesMigrated}`);
  console.log(`  Stops migrated:   ${stopsMigrated}`);
  console.log(`  Rides skipped:    ${skipped}`);

  await mongoose.disconnect();
  console.log('Disconnected.');
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
