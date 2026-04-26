/**
 * Unit tests — pure utility functions
 *
 * These functions have zero side effects and require no mocking:
 *   • namesMatch()  — Levenshtein-based name comparison (ocr.js)
 *   • scoreRides()  — content-based recommendation scorer (recommender.js)
 */

const { namesMatch } = require('../../src/utils/ocr');
const { scoreRides }  = require('../../src/utils/recommender');

// ─── namesMatch ───────────────────────────────────────────────────────────────

describe('namesMatch — identity verification helper', () => {
  // ── Exact matches ──────────────────────────────────────────────────────────
  it('matches identical names', () => {
    expect(namesMatch('Ghita Nafa', 'Ghita Nafa')).toBe(true);
  });

  it('matches regardless of case', () => {
    expect(namesMatch('GHITA NAFA', 'ghita nafa')).toBe(true);
  });

  // ── Accent/diacritic normalisation ────────────────────────────────────────
  it('matches name with accented characters against plain ASCII', () => {
    expect(namesMatch('Hamidé Ait Benhammou', 'Hamide Ait Benhammou')).toBe(true);
  });

  it('matches French accented first name', () => {
    expect(namesMatch('Élodie Martin', 'Elodie Martin')).toBe(true);
  });

  // ── Token-order independence ───────────────────────────────────────────────
  it('matches reversed word order (OCR may output last-name first)', () => {
    expect(namesMatch('Nafa Ghita', 'Ghita Nafa')).toBe(true);
  });

  // ── Levenshtein fuzzy matching ────────────────────────────────────────────
  it('matches with a 1-character typo (edit distance ≤ 30% of word length)', () => {
    // "Ghita" vs "Ghitta" — distance 1, word length 5, threshold = ceil(5*0.3)=2
    expect(namesMatch('Ghitta Nafa', 'Ghita Nafa')).toBe(true);
  });

  it('matches partial name on OCR card (single-word partial scan)', () => {
    // OCR sometimes only captures the first token
    expect(namesMatch('Ghita', 'Ghita Nafa')).toBe(true);
  });

  // ── Non-matches ───────────────────────────────────────────────────────────
  it('does not match completely different names', () => {
    expect(namesMatch('John Smith', 'Ghita Nafa')).toBe(false);
  });

  it('returns false when extracted name is empty', () => {
    expect(namesMatch('', 'Ghita Nafa')).toBe(false);
  });

  it('returns false when user name is empty', () => {
    expect(namesMatch('Ghita Nafa', '')).toBe(false);
  });

  it('does not match names that differ by more than the fuzzy threshold', () => {
    // "Smith" vs "Jones" — completely different, distance >> threshold
    expect(namesMatch('Smith Jones', 'Williams Davis')).toBe(false);
  });
});

// ─── scoreRides ───────────────────────────────────────────────────────────────

describe('scoreRides — recommendation scoring', () => {
  // ── Helpers ────────────────────────────────────────────────────────────────

  function makeRide(overrides = {}) {
    return {
      _id: 'ride1',
      driverId: 'driver1',
      stops: [],
      departureDateTime: new Date('2026-06-03T08:00:00Z'),
      pricePerSeat: 50,
      genderPreference: 'All',
      smokingAllowed: false,
      driverAverageRating: 4.5,
      bookings: [],
      ...overrides,
    };
  }

  function makeUser(overrides = {}) {
    return {
      _id: 'user1',
      genderPreference: 'All',
      smokingAllowed: false,
      ...overrides,
    };
  }

  // ── Basic return shape ────────────────────────────────────────────────────
  it('returns the same number of rides it receives', () => {
    const rides = [makeRide(), makeRide({ _id: 'ride2' })];
    const result = scoreRides(rides, [], makeUser());
    expect(result).toHaveLength(2);
  });

  it('attaches a numeric recommendationScore to each ride', () => {
    const rides = [makeRide()];
    const result = scoreRides(rides, [], makeUser());
    expect(typeof result[0].recommendationScore).toBe('number');
  });

  it('clamps scores to [0, 1]', () => {
    const rides = [makeRide(), makeRide({ _id: 'ride2' }), makeRide({ _id: 'ride3' })];
    const result = scoreRides(rides, [], makeUser());
    result.forEach(r => {
      expect(r.recommendationScore).toBeGreaterThanOrEqual(0);
      expect(r.recommendationScore).toBeLessThanOrEqual(1);
    });
  });

  it('returns empty array when no rides provided', () => {
    expect(scoreRides([], [], makeUser())).toEqual([]);
  });

  it('returns rides unchanged when rides is null/undefined', () => {
    expect(scoreRides(null, [], makeUser())).toBeNull();
  });

  // ── Tier 1 — no history ───────────────────────────────────────────────────
  it('Tier 1: scores rides even with zero history (cold-start user)', () => {
    const rides = [makeRide()];
    const result = scoreRides(rides, [], makeUser());
    expect(result[0].recommendationScore).toBeGreaterThan(0);
  });

  // ── Preference match ──────────────────────────────────────────────────────
  it('Tier 1: penalises a ride with incompatible gender preference', () => {
    const user = makeUser({ gender: 'Female' });
    const compatible   = makeRide({ genderPreference: 'All' });
    const incompatible = makeRide({ _id: 'ride2', genderPreference: 'Male' });

    const result = scoreRides([compatible, incompatible], [], user);
    const compatScore   = result.find(r => r._id === 'ride1').recommendationScore;
    const incompatScore = result.find(r => r._id === 'ride2').recommendationScore;

    expect(compatScore).toBeGreaterThan(incompatScore);
  });

  // ── Stop overlap ─────────────────────────────────────────────────────────
  it('Tier 2+: ranks a ride with matching stops higher than one without', () => {
    // Build a history of 2 rides going through "El Hajeb"
    const history = [
      makeRide({ stops: ['El Hajeb'] }),
      makeRide({ _id: 'h2', stops: ['El Hajeb'] }),
    ];
    const user = makeUser();

    const withMatchingStop = makeRide({ _id: 'a', stops: ['el hajeb'] });
    const withNoStops      = makeRide({ _id: 'b', stops: [] });

    const result = scoreRides([withMatchingStop, withNoStops], history, user);
    const scoreA = result.find(r => r._id === 'a').recommendationScore;
    const scoreB = result.find(r => r._id === 'b').recommendationScore;

    // Both are neutral (0.5) for no-stop, matching stop should be >= neutral
    expect(scoreA).toBeGreaterThanOrEqual(scoreB);
  });

  // ── Driver affinity ───────────────────────────────────────────────────────
  it('Tier 3: gives a higher score to a known driver vs an unknown one', () => {
    // 5 history rides to trigger Tier 3
    const KNOWN_DRIVER = 'knownDriver';
    const history = Array.from({ length: 5 }, (_, i) => makeRide({
      _id: `h${i}`,
      driverId: KNOWN_DRIVER,
      stops: [],
      departureDateTime: new Date('2026-05-01T14:00:00Z'),
      pricePerSeat: 50,
    }));

    const user = makeUser();

    const rideWithKnownDriver   = makeRide({ _id: 'x', driverId: KNOWN_DRIVER });
    const rideWithUnknownDriver = makeRide({ _id: 'y', driverId: 'strangerDriver' });

    const result = scoreRides([rideWithKnownDriver, rideWithUnknownDriver], history, user);
    const knownScore   = result.find(r => r._id === 'x').recommendationScore;
    const unknownScore = result.find(r => r._id === 'y').recommendationScore;

    expect(knownScore).toBeGreaterThan(unknownScore);
  });

  // ── Price fit ─────────────────────────────────────────────────────────────
  it('Tier 2+: penalises a ride priced far above historical median', () => {
    const history = [
      makeRide({ pricePerSeat: 50 }),
      makeRide({ _id: 'h2', pricePerSeat: 50 }),
    ];
    const user = makeUser();

    const affordable  = makeRide({ _id: 'cheap', pricePerSeat: 50 });
    const overpriced  = makeRide({ _id: 'pricey', pricePerSeat: 200 });

    const result = scoreRides([affordable, overpriced], history, user);
    const cheapScore  = result.find(r => r._id === 'cheap').recommendationScore;
    const priceyScore = result.find(r => r._id === 'pricey').recommendationScore;

    expect(cheapScore).toBeGreaterThan(priceyScore);
  });
});
