/**
 * Unit tests — acceptRideRequest (rideRequestController)
 *
 * Tests the self-accept guard and seat capacity hard block.
 * Mongoose models and Maps are mocked.
 */

jest.mock('../../src/models');
jest.mock('../../src/utils/maps');
jest.mock('../../src/utils/notify', () => ({ notifyUser: jest.fn() }));
jest.mock('../../src/socket', () => ({ emitReviewPrompts: jest.fn() }));

const { acceptRideRequest } = require('../../src/controllers/rideRequestController');
const { Ride, Vehicle, Notification, Message } = require('../../src/models');

function makeRes() {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return res;
}

const PASSENGER_ID = 'passenger1';
const DRIVER_ID = 'driver1';

function makeRequest(overrides = {}) {
  return {
    _id: 'req123',
    type: 'Request',
    state: 'Open',
    passengerId: { toString: () => PASSENGER_ID },
    groupPassengerIds: [],
    passengerCount: 1,
    departureLocation: 'AUI',
    destination: 'Rabat',
    departureDateTime: new Date(Date.now() + 5 * 60 * 60 * 1000),
    pricePerSeat: 50,
    maxPrice: 55,
    stops: [],
    bookings: [],
    populate: jest.fn().mockReturnThis(),
    ...overrides,
  };
}

describe('acceptRideRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Ride.create = jest.fn().mockResolvedValue({ _id: 'newRide1' });
    Notification.create = jest.fn().mockResolvedValue({});
    Message.create = jest.fn().mockResolvedValue({});
    Ride.findByIdAndUpdate = jest.fn().mockResolvedValue({});
  });

  it('returns 404 when the ride request does not exist', async () => {
    Ride.findOne = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });

    const req = { params: { requestId: 'req123' }, body: {}, user: { _id: DRIVER_ID } };
    const res = makeRes();
    await acceptRideRequest(req, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/not found/i) })
    );
  });

  it('returns 400 when passenger tries to accept their own request (self-accept guard)', async () => {
    Ride.findOne = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(makeRequest()),
    });
    Vehicle.findOne = jest.fn().mockResolvedValue({ _id: 'veh1', totalSeats: 4, luggageCapacity: 2 });

    // Driver ID == Passenger ID — self-accept scenario
    const req = { params: { requestId: 'req123' }, body: {}, user: { _id: PASSENGER_ID } };
    const res = makeRes();
    await acceptRideRequest(req, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/own/i) })
    );
  });

  it('returns 400 when request is no longer Open', async () => {
    Ride.findOne = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(makeRequest({ state: 'Accepted' })),
    });

    const req = { params: { requestId: 'req123' }, body: {}, user: { _id: DRIVER_ID } };
    const res = makeRes();
    await acceptRideRequest(req, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/no longer available/i) })
    );
  });

  it('returns 400 when driver has no registered vehicle', async () => {
    Ride.findOne = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(makeRequest()),
    });
    Vehicle.findOne = jest.fn().mockResolvedValue(null);

    const req = { params: { requestId: 'req123' }, body: {}, user: { _id: DRIVER_ID } };
    const res = makeRes();
    await acceptRideRequest(req, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/vehicle/i) })
    );
  });

  it('returns 400 when group request needs more seats than vehicle has', async () => {
    Ride.findOne = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(
        makeRequest({ passengerCount: 5, groupPassengerIds: ['p2', 'p3', 'p4', 'p5'] })
      ),
    });
    Vehicle.findOne = jest.fn().mockResolvedValue({ _id: 'veh1', totalSeats: 3, luggageCapacity: 2 });

    const req = { params: { requestId: 'req123' }, body: {}, user: { _id: DRIVER_ID } };
    const res = makeRes();
    await acceptRideRequest(req, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/seat/i) })
    );
  });

  it('creates a ride offer when all conditions are valid', async () => {
    Ride.findOne = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(makeRequest()),
    });
    Vehicle.findOne = jest.fn().mockResolvedValue({ _id: 'veh1', totalSeats: 4, luggageCapacity: 2 });
    Ride.create = jest.fn().mockResolvedValue({ _id: 'newRide1', toObject: () => ({ _id: 'newRide1' }) });

    const req = { params: { requestId: 'req123' }, body: {}, user: { _id: DRIVER_ID } };
    const res = makeRes();
    await acceptRideRequest(req, res, jest.fn());

    expect(Ride.create).toHaveBeenCalled();
  });
});
