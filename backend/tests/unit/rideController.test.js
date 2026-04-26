/**
 * Unit tests — rideController
 *
 * Tests the cancelRide 2-hour guard and modifyRide price-lock guard.
 * Database, Maps API, and socket are mocked — no real I/O.
 */

jest.mock('../../src/models');
jest.mock('../../src/utils/maps');
jest.mock('../../src/socket', () => ({ emitReviewPrompts: jest.fn() }));

const { cancelRide, modifyRide } = require('../../src/controllers/rideController');
const { Ride, User, Message, Notification } = require('../../src/models');

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

function hoursFromNow(h) {
  return new Date(Date.now() + h * 60 * 60 * 1000);
}

// ─── cancelRide ───────────────────────────────────────────────────────────────

describe('cancelRide', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Message.create = jest.fn().mockResolvedValue({});
    Notification.create = jest.fn().mockResolvedValue({});
    User.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({ firstName: 'Test', lastName: 'Driver' }),
    });
    User.findByIdAndUpdate = jest.fn().mockResolvedValue({});
    Ride.findByIdAndUpdate = jest.fn().mockResolvedValue({});
  });

  it('returns 404 when ride does not exist', async () => {
    Ride.findOne = jest.fn().mockResolvedValue(null);

    const req = { params: { rideId: 'ride123' }, body: {}, user: { _id: 'driver1' } };
    const res = makeRes();
    await cancelRide(req, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/not found/i) })
    );
  });

  it('returns 403 when a non-driver tries to cancel', async () => {
    Ride.findOne = jest.fn().mockResolvedValue({
      _id: 'ride123',
      type: 'Offer',
      state: 'Active',
      driverId: { toString: () => 'driver1' },
      departureDateTime: hoursFromNow(5),
      bookings: [],
    });

    const req = { params: { rideId: 'ride123' }, body: {}, user: { _id: 'someone_else' } };
    const res = makeRes();
    await cancelRide(req, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/own/i) })
    );
  });

  it('returns 400 when ride departs within 2 hours (1 hour away)', async () => {
    Ride.findOne = jest.fn().mockResolvedValue({
      _id: 'ride123',
      type: 'Offer',
      state: 'Active',
      driverId: { toString: () => 'driver1' },
      departureDateTime: hoursFromNow(1),
      bookings: [],
    });

    const req = { params: { rideId: 'ride123' }, body: { reason: 'test' }, user: { _id: 'driver1' } };
    const res = makeRes();
    await cancelRide(req, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/2 hour/i) })
    );
  });

  it('returns 400 when ride departs exactly at the 2-hour boundary (edge)', async () => {
    // 2 hours - 1 second → still inside window
    Ride.findOne = jest.fn().mockResolvedValue({
      _id: 'ride123',
      type: 'Offer',
      state: 'Active',
      driverId: { toString: () => 'driver1' },
      departureDateTime: new Date(Date.now() + 2 * 60 * 60 * 1000 - 1000),
      bookings: [],
    });

    const req = { params: { rideId: 'ride123' }, body: {}, user: { _id: 'driver1' } };
    const res = makeRes();
    await cancelRide(req, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/2 hour/i) })
    );
  });

  it('returns 400 when ride is already completed', async () => {
    Ride.findOne = jest.fn().mockResolvedValue({
      _id: 'ride123',
      type: 'Offer',
      state: 'Completed',
      driverId: { toString: () => 'driver1' },
      departureDateTime: hoursFromNow(5),
      bookings: [],
    });

    const req = { params: { rideId: 'ride123' }, body: {}, user: { _id: 'driver1' } };
    const res = makeRes();
    await cancelRide(req, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/completed/i) })
    );
  });

  it('cancels successfully when departure is more than 2 hours away', async () => {
    Ride.findOne = jest.fn().mockResolvedValue({
      _id: 'ride123',
      type: 'Offer',
      state: 'Active',
      driverId: { toString: () => 'driver1' },
      departureDateTime: hoursFromNow(5),
      bookings: [],
      destination: 'Rabat',
    });

    const req = { params: { rideId: 'ride123' }, body: { reason: 'Emergency' }, user: { _id: 'driver1' } };
    const res = makeRes();
    await cancelRide(req, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/cancelled/i) })
    );
  });
});

// ─── modifyRide ───────────────────────────────────────────────────────────────

describe('modifyRide — price lock guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Ride.findByIdAndUpdate = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue({ _id: 'ride123', pricePerSeat: 50 }),
    });
  });

  it('returns 400 when pricePerSeat is included in the update', async () => {
    Ride.findOne = jest.fn().mockResolvedValue({
      _id: 'ride123',
      type: 'Offer',
      state: 'Active',
      driverId: { toString: () => 'driver1' },
      departureDateTime: hoursFromNow(10),
      timeChangeCount: 0,
      totalSeats: 4,
      availableSeats: 3,
      route: null,
    });

    const req = {
      params: { rideId: 'ride123' },
      body: { pricePerSeat: 100 },
      user: { _id: 'driver1' },
    };
    const res = makeRes();
    await modifyRide(req, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/price/i) })
    );
  });

  it('returns 403 when a non-driver tries to modify', async () => {
    Ride.findOne = jest.fn().mockResolvedValue({
      _id: 'ride123',
      type: 'Offer',
      state: 'Active',
      driverId: { toString: () => 'driver1' },
      departureDateTime: hoursFromNow(10),
    });

    const req = {
      params: { rideId: 'ride123' },
      body: { totalSeats: 5 },
      user: { _id: 'passenger1' },
    };
    const res = makeRes();
    await modifyRide(req, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/own/i) })
    );
  });

  it('returns 400 when departure time change is set to the past', async () => {
    Ride.findOne = jest.fn().mockResolvedValue({
      _id: 'ride123',
      type: 'Offer',
      state: 'Active',
      driverId: { toString: () => 'driver1' },
      departureDateTime: hoursFromNow(10),
      timeChangeCount: 0,
    });

    const req = {
      params: { rideId: 'ride123' },
      body: { departureDateTime: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
      user: { _id: 'driver1' },
    };
    const res = makeRes();
    await modifyRide(req, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/past/i) })
    );
  });
});
