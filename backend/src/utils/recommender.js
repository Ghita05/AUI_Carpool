/**
 * utils/recommender.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Content-based weighted similarity scorer for ride recommendations.
 *
 * MODEL TYPE: Weighted Feature Similarity Scoring
 *
 * JUSTIFICATION FOR THIS APPROACH:
 *   The AUI carpooling platform operates in a small, bounded community
 *   (~500-2000 users). Collaborative filtering requires a dense interaction
 *   matrix to produce meaningful recommendations — with sparse data it
 *   defaults to popularity bias and fails cold-start users entirely.
 *   Neural approaches require thousands of interactions per user to learn
 *   meaningful embeddings. Neither is appropriate here.
 *
 *   Content-based weighted scoring:
 *     (a) Works from the very first ride — no minimum history needed
 *     (b) Degrades gracefully: fewer history items → fewer active features,
 *         not garbage recommendations
 *     (c) Is fully explainable — every score component is traceable,
 *         important for academic review
 *     (d) Directly encodes the domain knowledge defined in the requirements:
 *         route preferences, time patterns, driver trust, community signals
 *
 * FEATURES (7 signals, weighted):
 *   1. Route similarity       — geographic cosine similarity between this
 *                               ride's origin→dest vector and the user's
 *                               historical route vectors. Captures "similar
 *                               journeys", not just same destination.
 *   2. Destination frequency  — how often the user has travelled to this
 *                               destination. Complements route similarity
 *                               for repeated exact trips.
 *   3. Departure time affinity— circular distance on the 24-hour clock
 *                               between this ride's hour and the user's
 *                               historical hour distribution. Users who
 *                               always travel at 14:00 prefer 14:00 rides.
 *   4. Driver affinity        — positive signal if the user has completed
 *                               a ride with this driver before without
 *                               cancelling. Trust proxy: repeat choice.
 *   5. Co-passenger affinity  — positive signal if confirmed passengers
 *                               on this ride have shared past rides with
 *                               this user. Social cohesion proxy.
 *                               PRIVACY: passenger IDs are never sent to
 *                               the client — used server-side only.
 *   6. Preference match       — hard compatibility (gender, smoking).
 *                               Incompatible rides score 0 on this feature.
 *   7. Price fit              — how close this ride's price is to the
 *                               user's median historical price. Linear
 *                               decay above the median.
 *   8. Driver quality         — baseline signal: averageRating / 5.
 *                               Weighted lightly so it does not dominate
 *                               personal relevance signals.
 *
 * TIERED ACTIVATION:
 *   Tier 1 (0 completed rides):   preference + driver quality only
 *   Tier 2 (1–4 completed rides): + destination + price fit
 *   Tier 3 (5+ completed rides):  all 8 features at full weights
 *
 * PURE FUNCTION: no database calls, no side effects, no async.
 * Called by rideController.getAvailableRides() after the DB query returns.
 */

// ── Feature weights (must sum to 1.0 for tier 3) ─────────────────────────────
const W = {
  ROUTE_SIMILARITY:    0.28, // strongest signal — spatial journey match
  DESTINATION_FREQ:    0.12, // repeated exact destination
  TIME_AFFINITY:       0.15, // hour-of-day preference
  DRIVER_AFFINITY:     0.10, // past positive experience with this driver
  COPAX_AFFINITY:      0.08, // known co-passengers on this ride
  PREFERENCE_MATCH:    0.12, // smoking / gender compatibility
  PRICE_FIT:           0.08, // price relative to user's typical spend
  DRIVER_QUALITY:      0.07, // baseline driver rating
};
// Tier 2 weights (no route/time/driver/copax signals yet)
const W2 = {
  DESTINATION_FREQ:  0.45,
  PREFERENCE_MATCH:  0.30,
  PRICE_FIT:         0.15,
  DRIVER_QUALITY:    0.10,
};
// Tier 1 weights (no history at all)
const W1 = {
  PREFERENCE_MATCH:  0.60,
  DRIVER_QUALITY:    0.40,
};

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * scoreRides
 * @param {Array}  rides    — Mongoose Ride documents (already filtered by search)
 * @param {Array}  history  — User's completed ride documents (with route + bookings)
 * @param {Object} user     — The requesting User document
 * @returns {Array}         — Same rides with .recommendationScore added (0–1)
 */
function scoreRides(rides, history, user) {
  if (!rides || rides.length === 0) return rides;

  // ── Build user profile from history ────────────────────────────────────────
  const profile = buildUserProfile(history, user);
  const tier     = profile.tier;

  return rides.map(ride => {
    let score = 0;

    if (tier === 1) {
      score =
        scorePreferenceMatch(ride, user) * W1.PREFERENCE_MATCH +
        scoreDriverQuality(ride)         * W1.DRIVER_QUALITY;

    } else if (tier === 2) {
      score =
        scoreDestinationFreq(ride, profile) * W2.DESTINATION_FREQ +
        scorePreferenceMatch(ride, user)    * W2.PREFERENCE_MATCH +
        scorePriceFit(ride, profile)        * W2.PRICE_FIT +
        scoreDriverQuality(ride)            * W2.DRIVER_QUALITY;

    } else {
      score =
        scoreRouteSimilarity(ride, profile)  * W.ROUTE_SIMILARITY   +
        scoreDestinationFreq(ride, profile)  * W.DESTINATION_FREQ   +
        scoreTimeAffinity(ride, profile)     * W.TIME_AFFINITY      +
        scoreDriverAffinity(ride, profile)   * W.DRIVER_AFFINITY    +
        scoreCoPaxAffinity(ride, profile)    * W.COPAX_AFFINITY     +
        scorePreferenceMatch(ride, user)     * W.PREFERENCE_MATCH   +
        scorePriceFit(ride, profile)         * W.PRICE_FIT          +
        scoreDriverQuality(ride)             * W.DRIVER_QUALITY;
    }

    // Clamp to [0, 1] and attach — controller sorts descending on this field
    ride.recommendationScore = parseFloat(Math.min(1, Math.max(0, score)).toFixed(4));
    return ride;
  });
}

// ── User profile builder ──────────────────────────────────────────────────────

/**
 * buildUserProfile
 * Derives a compact preference profile from the user's ride history.
 * All co-passenger data stays here — never returned to the client.
 */
function buildUserProfile(history, user) {
  const n = history.length;

  if (n === 0) {
    return { tier: 1 };
  }

  // ── Destination frequency map ─────────────────────────────────────────────
  const destFreq = {};
  for (const h of history) {
    const d = (h.destination || '').toLowerCase().trim();
    if (d) destFreq[d] = (destFreq[d] || 0) + 1;
  }

  // ── Route vectors: array of { oLat, oLng, dLat, dLng } ───────────────────
  // Only include rides that have stored route coordinates
  const routeVectors = history
    .filter(h => h.route?.originLatitude && h.route?.destinationLatitude)
    .map(h => ({
      oLat: h.route.originLatitude,
      oLng: h.route.originLongitude,
      dLat: h.route.destinationLatitude,
      dLng: h.route.destinationLongitude,
    }));

  // ── Hour-of-day distribution (circular) ──────────────────────────────────
  // Stores how many past rides departed at each hour (0-23)
  const hourCounts = new Array(24).fill(0);
  for (const h of history) {
    const hour = new Date(h.departureDateTime).getHours();
    if (!isNaN(hour)) hourCounts[hour]++;
  }
  // Convert to probability distribution (sum to 1)
  const hourTotal = hourCounts.reduce((s, c) => s + c, 0);
  const hourDist  = hourTotal > 0
    ? hourCounts.map(c => c / hourTotal)
    : hourCounts.map(() => 1 / 24);

  // ── Known driver IDs (positive past experience) ───────────────────────────
  const knownDriverIds = new Set(
    history
      .filter(h => h.driverId)
      .map(h => h.driverId.toString())
  );

  // ── Known co-passenger IDs (all confirmed passengers from past rides) ─────
  // PRIVACY: this set stays in server memory for this request only.
  // It is never serialised, logged, or sent to the client.
  const knownPaxIds = new Set();
  const myId = user._id?.toString();
  for (const h of history) {
    for (const b of (h.bookings || [])) {
      if (b.status === 'Confirmed' || b.status === 'Completed') {
        const pid = b.passengerId?.toString();
        if (pid && pid !== myId) knownPaxIds.add(pid);
      }
    }
  }

  // ── Median price ──────────────────────────────────────────────────────────
  const prices = history
    .map(h => h.pricePerSeat)
    .filter(p => p != null && !isNaN(p))
    .sort((a, b) => a - b);
  const medianPrice = prices.length
    ? prices[Math.floor(prices.length / 2)]
    : null;

  return {
    tier:          n < 5 ? 2 : 3,
    destFreq,
    totalTrips:    n,
    routeVectors,
    hourDist,
    knownDriverIds,
    knownPaxIds,
    medianPrice,
  };
}

// ── Scoring functions ─────────────────────────────────────────────────────────

/**
 * scoreRouteSimilarity
 * Computes the maximum cosine similarity between the candidate ride's
 * origin→destination direction vector and any of the user's historical
 * route vectors.
 *
 * WHY COSINE SIMILARITY ON ROUTE VECTORS:
 *   Two rides share the same "journey character" if their displacement
 *   vectors point in the same direction, regardless of exact coordinates.
 *   AUI → Fez and a slightly different AUI → Fez route are more similar
 *   to each other than AUI → Fez and AUI → Rabat, even though the
 *   destination string might differ. This captures spatial journey
 *   similarity better than string matching alone.
 */
function scoreRouteSimilarity(ride, profile) {
  if (!profile.routeVectors || profile.routeVectors.length === 0) return 0.5;
  if (!ride.route?.originLatitude) return 0.5; // no route stored — neutral

  const rVec = {
    oLat: ride.route.originLatitude,
    oLng: ride.route.originLongitude,
    dLat: ride.route.destinationLatitude,
    dLng: ride.route.destinationLongitude,
  };

  // Displacement vector: destination - origin
  const rDx = rVec.dLat - rVec.oLat;
  const rDy = rVec.dLng - rVec.oLng;
  const rMag = Math.sqrt(rDx * rDx + rDy * rDy);
  if (rMag === 0) return 0.5;

  let maxSim = 0;
  for (const hVec of profile.routeVectors) {
    const hDx = hVec.dLat - hVec.oLat;
    const hDy = hVec.dLng - hVec.oLng;
    const hMag = Math.sqrt(hDx * hDx + hDy * hDy);
    if (hMag === 0) continue;

    // Cosine similarity: dot product / (|a| * |b|)
    const dot = rDx * hDx + rDy * hDy;
    const cos = dot / (rMag * hMag); // range [-1, 1]

    // Also factor in origin proximity — same direction from a nearby origin
    // is a stronger signal than same direction from far away
    const originDistKm = haversineKm(rVec.oLat, rVec.oLng, hVec.oLat, hVec.oLng);
    // Decay: full weight within 2km, halved at 10km, zero beyond 50km
    const originSim = Math.max(0, 1 - originDistKm / 50);

    // Combine: cosine similarity mapped to [0,1], weighted by origin proximity
    const sim = ((cos + 1) / 2) * 0.7 + originSim * 0.3;
    if (sim > maxSim) maxSim = sim;
  }

  return maxSim;
}

/**
 * scoreDestinationFreq
 * Proportion of past trips that went to this destination.
 * Normalised by total trip count.
 */
function scoreDestinationFreq(ride, profile) {
  if (!profile.destFreq || profile.totalTrips === 0) return 0;
  const key  = (ride.destination || '').toLowerCase().trim();
  const freq = profile.destFreq[key] || 0;
  return freq / profile.totalTrips;
}

/**
 * scoreTimeAffinity
 * Circular distance on the 24-hour clock between this ride's departure hour
 * and the user's historical hour distribution.
 *
 * WHY CIRCULAR: 23:00 and 01:00 are 2 hours apart, not 22 hours apart.
 * A user who always travels late at night should see late rides ranked higher
 * regardless of which side of midnight they fall.
 *
 * Returns the probability mass within ±2 hours of the ride's departure hour,
 * using the user's empirical hour distribution.
 */
function scoreTimeAffinity(ride, profile) {
  if (!profile.hourDist) return 0.5;
  const rideHour = new Date(ride.departureDateTime).getHours();
  if (isNaN(rideHour)) return 0.5;

  // Sum probability mass in a ±2 hour window (circular)
  let mass = 0;
  for (let offset = -2; offset <= 2; offset++) {
    const h = ((rideHour + offset) % 24 + 24) % 24;
    mass += profile.hourDist[h];
  }
  // Normalise: max possible mass in a 5-hour window is 5/24 ≈ 0.208 (uniform)
  // Scale so a perfect match (all history at this hour) scores 1.0
  // and a uniform distribution scores ~0.21 (slightly above neutral)
  return Math.min(1, mass * (24 / 5));
}

/**
 * scoreDriverAffinity
 * Binary signal: has the user completed a ride with this driver before?
 * Returns 1.0 if yes, 0.0 if no.
 *
 * Rationale: choosing the same driver again reveals revealed preference —
 * the user found the experience acceptable enough not to cancel. This is
 * a weak but reliable trust signal in a small community.
 */
function scoreDriverAffinity(ride, profile) {
  if (!profile.knownDriverIds || !ride.driverId) return 0;
  return profile.knownDriverIds.has(ride.driverId._id?.toString() || ride.driverId.toString())
    ? 1.0
    : 0.0;
}

/**
 * scoreCoPaxAffinity
 * Proportion of this ride's confirmed passengers that the user has
 * previously shared a ride with.
 *
 * PRIVACY GUARANTEE: profile.knownPaxIds is built server-side from the
 * user's own booking history. ride.bookings passenger IDs are read
 * server-side only. Neither set is ever serialised into the API response.
 * The only thing the client ever sees is the aggregated recommendationScore.
 *
 * Returns 0 if no bookings yet (new ride) or no past co-passengers known.
 */
function scoreCoPaxAffinity(ride, profile) {
  if (!profile.knownPaxIds || profile.knownPaxIds.size === 0) return 0;

  const confirmedPax = (ride.bookings || [])
    .filter(b => b.status === 'Confirmed')
    .map(b => b.passengerId?.toString())
    .filter(Boolean);

  if (confirmedPax.length === 0) return 0;

  const overlap = confirmedPax.filter(pid => profile.knownPaxIds.has(pid)).length;
  return overlap / confirmedPax.length;
}

/**
 * scorePreferenceMatch
 * Hard compatibility check on gender and smoking preferences.
 * An incompatible ride (women-only + male user) scores 0 on this feature,
 * which significantly depresses its total score.
 */
function scorePreferenceMatch(ride, user) {
  let score = 0;
  let checks = 0;

  // Gender compatibility
  if (ride.genderPreference) {
    checks++;
    if (ride.genderPreference === 'All') {
      score += 1;
    } else if (ride.genderPreference === 'Women-Only' && user.gender === 'Female') {
      score += 1;
    }
    // Male user on Women-Only ride → 0 on this check
  }

  // Smoking compatibility
  const vehiclePolicy = ride.vehicleId?.smokingPolicy;
  const userPref      = user.smokingPreference;
  if (vehiclePolicy && userPref && userPref !== 'No preference') {
    checks++;
    const rideAllowsSmoking = vehiclePolicy === 'Allowed';
    const userWantsSmoking  = userPref === 'Smoker';
    // Match: both smokers, or both non-smokers
    if (rideAllowsSmoking === userWantsSmoking) score += 1;
    // Mismatch: slight penalty but not a hard block (user can still book)
    else score += 0.2;
  }

  return checks === 0 ? 0.6 : score / checks; // 0.6 neutral when no data
}

/**
 * scorePriceFit
 * How close is this ride's price to the user's historical median price?
 * - At or below median → score 1.0
 * - At 2× median → score 0.0
 * - Linear decay in between
 */
function scorePriceFit(ride, profile) {
  if (!profile.medianPrice) return 0.5;
  const price = ride.pricePerSeat;
  if (!price) return 0.5;
  if (price <= profile.medianPrice) return 1.0;
  if (price >= profile.medianPrice * 2) return 0.0;
  return 1.0 - ((price - profile.medianPrice) / profile.medianPrice);
}

/**
 * scoreDriverQuality
 * Baseline quality signal: averageRating / 5, normalised to [0,1].
 * Weighted lightly (0.07) so it acts as a tiebreaker, not a dominant factor.
 * New drivers with no rating score neutral (0.5).
 */
function scoreDriverQuality(ride) {
  const rating = ride.driverId?.averageRating;
  if (!rating || rating === 0) return 0.5;
  return Math.min(1, rating / 5);
}

// ── Geographic helper ─────────────────────────────────────────────────────────

/**
 * haversineKm — distance in kilometres between two lat/lng pairs.
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R    = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = { scoreRides };
