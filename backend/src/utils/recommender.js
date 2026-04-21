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
 *         time patterns, driver trust, stop preferences, community signals
 *
 * FEATURES (7 signals, weighted):
 *   1. Stop Overlap         — proportion of this ride's intermediate stops
 *                             that match the user's historically preferred
 *                             stops. Captures route path preference — two
 *                             rides with the same origin and destination
 *                             may differ significantly in which towns they
 *                             pass through. Stored as [String] on the Ride
 *                             document. Neutral (0.5) for direct rides or
 *                             users with no stop history.
 *   2. Time Affinity        — circular distance on the 24-hour clock
 *                             between this ride's hour and the user's
 *                             historical hour distribution. Users who
 *                             always travel at 14:00 prefer 14:00 rides.
 *   3. Driver Affinity      — positive signal if the user has completed
 *                             a ride with this driver before without
 *                             cancelling. Trust proxy: repeat choice.
 *   4. Co-passenger Affinity— positive signal if confirmed passengers
 *                             on this ride have shared past rides with
 *                             this user. Social cohesion proxy.
 *                             PRIVACY: passenger IDs are never sent to
 *                             the client — used server-side only.
 *   5. Preference Match     — hard compatibility (gender, smoking).
 *                             Incompatible rides score significantly lower.
 *   6. Price Fit            — how close this ride's price is to the
 *                             user's median historical price. Linear
 *                             decay above the median.
 *   7. Driver Quality       — baseline signal: averageRating / 5.
 *                             Weighted lightly so it does not dominate
 *                             personal relevance signals.
 *
 * NOTE ON EXCLUDED SPATIAL FEATURES:
 *   Destination Frequency and Origin Proximity were considered but excluded.
 *   The recommender operates on a pre-filtered pool where the passenger has
 *   already specified an exact departure location and an exact destination.
 *   All candidates therefore share identical origin and destination, making
 *   any purely spatial feature zero-discriminative — it would assign equal
 *   relative scores to all candidates and contribute no signal whatsoever.
 *   Stop Overlap captures the remaining route variation (the intermediate
 *   path) which IS meaningfully different between candidates even when
 *   origin and destination are fixed.
 *
 * TIERED ACTIVATION:
 *   Tier 1 (0 completed rides):   preference + driver quality only
 *   Tier 2 (1–4 completed rides): preference + stop overlap + price + quality
 *   Tier 3 (5+ completed rides):  all 7 features at full weights
 *
 * PURE FUNCTION: no database calls, no side effects, no async.
 * Called by rideController.getAvailableRides() after the DB query returns.
 */

// ── Feature weights (must sum to 1.0 for tier 3) ─────────────────────────────
const W = {
  TIME_AFFINITY:     0.22, // strongest personal behavioral signal
  PREFERENCE_MATCH:  0.18, // gender / smoking compatibility
  DRIVER_AFFINITY:   0.18, // past positive experience with this driver
  STOP_OVERLAP:      0.15, // route path preference via stop history
  PRICE_FIT:         0.12, // price relative to user's typical spend
  COPAX_AFFINITY:    0.10, // known co-passengers on this ride
  DRIVER_QUALITY:    0.05, // baseline driver rating tiebreaker
};

// Tier 2 weights — stop overlap included since even 1 ride can reveal stop preference
const W2 = {
  PREFERENCE_MATCH:  0.40,
  STOP_OVERLAP:      0.25,
  PRICE_FIT:         0.20,
  DRIVER_QUALITY:    0.15,
};

// Tier 1 weights — no history at all
const W1 = {
  PREFERENCE_MATCH:  0.60,
  DRIVER_QUALITY:    0.40,
};

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * scoreRides
 * @param {Array}  rides    — Mongoose Ride documents (already filtered by search)
 * @param {Array}  history  — User's completed ride documents (with bookings + stops)
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
        scorePreferenceMatch(ride, user) * W2.PREFERENCE_MATCH +
        scoreStopOverlap(ride, profile)  * W2.STOP_OVERLAP     +
        scorePriceFit(ride, profile)     * W2.PRICE_FIT        +
        scoreDriverQuality(ride)         * W2.DRIVER_QUALITY;

    } else {
      // Tier 3 — all 7 features
      score =
        scoreTimeAffinity(ride, profile)    * W.TIME_AFFINITY    +
        scorePreferenceMatch(ride, user)    * W.PREFERENCE_MATCH +
        scoreDriverAffinity(ride, profile)  * W.DRIVER_AFFINITY  +
        scoreStopOverlap(ride, profile)     * W.STOP_OVERLAP     +
        scorePriceFit(ride, profile)        * W.PRICE_FIT        +
        scoreCoPaxAffinity(ride, profile)   * W.COPAX_AFFINITY   +
        scoreDriverQuality(ride)            * W.DRIVER_QUALITY;
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

  // ── Preferred stops ───────────────────────────────────────────────────────
  // Collects all intermediate stops from the user's past rides.
  // Captures route path preference — which intermediate towns the user
  // typically travels through between their fixed origin and destination.
  const preferredStops = new Set();
  for (const h of history) {
    for (const stop of (h.stops || [])) {
      const normalized = stop.toLowerCase().trim();
      if (normalized) preferredStops.add(normalized);
    }
  }

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
    tier: n < 5 ? 2 : 3,
    preferredStops,
    hourDist,
    knownDriverIds,
    knownPaxIds,
    medianPrice,
  };
}

// ── Scoring functions ─────────────────────────────────────────────────────────

/**
 * scoreStopOverlap
 * Proportion of this ride's intermediate stops that match the user's
 * historically preferred stops.
 *
 * WHY STOPS AND NOT RAW POLYLINE:
 *   Two rides sharing the same origin and destination can differ in which
 *   intermediate towns they pass through (e.g. AUI → Fez via Sefrou vs
 *   via Aïn Chkef). Stops are stored as strings on the Ride document and
 *   represent the passenger-visible waypoints. Matching on stops captures
 *   route path preference in a computationally simple and fully explainable
 *   way. Raw polyline comparison would require geospatial normalisation and
 *   is fragile to minor GPS variation between otherwise identical routes.
 *
 * Returns 0.5 (neutral) when:
 *   - User has no stop history (always took direct rides or is new)
 *   - This ride has no stops (direct ride, no intermediate waypoints)
 *   Neutral avoids penalising direct rides or users without stop history.
 */
function scoreStopOverlap(ride, profile) {
  if (!profile.preferredStops || profile.preferredStops.size === 0) return 0.5;

  const rideStops = (ride.stops || [])
    .map(s => s.toLowerCase().trim())
    .filter(Boolean);

  if (rideStops.length === 0) return 0.5; // direct ride — neutral, not penalised

  const overlap = rideStops.filter(s => profile.preferredStops.has(s)).length;
  return overlap / rideStops.length;
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
  return profile.knownDriverIds.has(
    ride.driverId._id?.toString() || ride.driverId.toString()
  )
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

  return checks === 0 ? 0.6 : score / checks; // 0.6 neutral when no preference data
}

/**
 * scorePriceFit
 * How close is this ride's price to the user's historical median price?
 * - At or below median → score 1.0
 * - At 2× median      → score 0.0
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
 * Weighted lightly (0.05) so it acts as a tiebreaker, not a dominant factor.
 * New drivers with no rating score neutral (0.5).
 */
function scoreDriverQuality(ride) {
  const rating = ride.driverId?.averageRating;
  if (!rating || rating === 0) return 0.5;
  return Math.min(1, rating / 5);
}

module.exports = { scoreRides };