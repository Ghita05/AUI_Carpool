// Content-based weighted similarity scorer for ride recommendations.
// Tier 1 (0 rides): preference + quality. Tier 2 (1-4 rides): + stops + price. Tier 3 (5+): all 7 features.
// Pure function no DB calls.

const W = {
  TIME_AFFINITY:     0.22, // personal behavioral signal (strong)
  PREFERENCE_MATCH:  0.18, // gender / smoking compatibility
  DRIVER_AFFINITY:   0.18, // past positive experience with this driver
  STOP_OVERLAP:      0.15, // route path preference via stop history
  PRICE_FIT:         0.12, // price relative to user's typical spend
  COPAX_AFFINITY:    0.10, // known co-passengers on this ride
  DRIVER_QUALITY:    0.05, // baseline driver rating tiebreaker
};

// Tier 2 weights top overlap included since even 1 ride can reveal stop preference
const W2 = {
  PREFERENCE_MATCH:  0.40,
  STOP_OVERLAP:      0.25,
  PRICE_FIT:         0.20,
  DRIVER_QUALITY:    0.15,
};

// Tier 1 weights  no history at all
const W1 = {
  PREFERENCE_MATCH:  0.60,
  DRIVER_QUALITY:    0.40,
};



function scoreRides(rides, history, user) {
  if (!rides || rides.length === 0) return rides;

  // Build user profile from history
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


// Derives a preference profile from the user's completed ride history.
function buildUserProfile(history, user) {
  const n = history.length;

  if (n === 0) {
    return { tier: 1 };
  }

  // Collect intermediate stops from past rides to detect route path preferences
  const preferredStops = new Set();
  for (const h of history) {
    for (const stop of (h.stops || [])) {
      const normalized = stop.toLowerCase().trim();
      if (normalized) preferredStops.add(normalized);
    }
  }

  // Hour-of-day distribution (0-23) from past rides
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

  // IDs of drivers from past completed rides
  const knownDriverIds = new Set(
    history
      .filter(h => h.driverId)
      .map(h => h.driverId.toString())
  );

  // IDs of co-passengers from past rides — used server-side only, never sent to client
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

  // Median price from past rides
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


// What fraction of this ride's stops match the user's preferred stops. Returns 0.5 when no history.
function scoreStopOverlap(ride, profile) {
  if (!profile.preferredStops || profile.preferredStops.size === 0) return 0.5;

  const rideStops = (ride.stops || [])
    .map(s => s.toLowerCase().trim())
    .filter(Boolean);

  if (rideStops.length === 0) return 0.5; // direct ride — neutral, not penalised

  const overlap = rideStops.filter(s => profile.preferredStops.has(s)).length;
  return overlap / rideStops.length;
}

// Probability mass within ±2 hours of departure using circular hour distribution from past rides.
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

// Returns 1.0 if the user has previously ridden with this driver, 0.0 otherwise.
function scoreDriverAffinity(ride, profile) {
  if (!profile.knownDriverIds || !ride.driverId) return 0;
  return profile.knownDriverIds.has(
    ride.driverId._id?.toString() || ride.driverId.toString()
  )
    ? 1.0
    : 0.0;
}

// Fraction of confirmed passengers on this ride that the user has shared a ride with before.
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

// Hard compatibility check: women-only and smoking preferences. Returns 0 for incompatible rides.
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

// How close is this ride's price to the user's median? At or below median → 1.0, at 2× → 0.0.
function scorePriceFit(ride, profile) {
  if (!profile.medianPrice) return 0.5;
  const price = ride.pricePerSeat;
  if (!price) return 0.5;
  if (price <= profile.medianPrice) return 1.0;
  if (price >= profile.medianPrice * 2) return 0.0;
  return 1.0 - ((price - profile.medianPrice) / profile.medianPrice);
}

// averageRating / 5, normalised to [0,1]. New drivers score 0.5 (neutral).
function scoreDriverQuality(ride) {
  const rating = ride.driverId?.averageRating;
  if (!rating || rating === 0) return 0.5;
  return Math.min(1, rating / 5);
}

module.exports = { scoreRides };