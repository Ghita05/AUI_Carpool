// Admin-only controller for the web dashboard.
// All handlers require authenticate + authorize('Admin') middleware.

const { User, Ride, Review, Notification, Report } = require('../models');
const { success, error } = require('../utils/responses');

// GET /api/admin/stats
const getStats = async (req, res, next) => {
  try {
    const [totalUsers, totalRides, activeRides, openReports] = await Promise.all([
      User.countDocuments({ role: { $ne: 'Admin' } }),
      Ride.countDocuments({ type: 'Offer' }),
      Ride.countDocuments({ state: { $in: ['Active', 'OnGoing', 'Full', 'Accepted'] } }),
      Report.countDocuments({ status: 'Open' }),
    ]);

    // Weekly ride activity (Mon–Sun of current week)
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
    startOfWeek.setHours(0, 0, 0, 0);

    const weeklyRides = await Ride.aggregate([
      { $match: { createdAt: { $gte: startOfWeek } } },
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' }, // 1=Sun..7=Sat
          count: { $sum: 1 },
        },
      },
    ]);

    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyMap = {};
    weeklyRides.forEach(d => { weeklyMap[d._id] = d.count; });
    const weekly = DAYS.map((day, i) => ({ day, rides: weeklyMap[i + 1] || 0 }));

    // Platform health
    const [avgRatingAgg, completedCount, cancelledCount] = await Promise.all([
      User.aggregate([
        { $match: { role: { $ne: 'Admin' }, averageRating: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: '$averageRating' } } },
      ]),
      Ride.countDocuments({ state: 'Completed' }),
      Ride.countDocuments({ state: 'Cancelled' }),
    ]);

    const avgRating = avgRatingAgg[0] ? Math.round(avgRatingAgg[0].avg * 10) / 10 : 0;
    const completionRate =
      completedCount + cancelledCount > 0
        ? Math.round((completedCount / (completedCount + cancelledCount)) * 100)
        : 0;

    return success(res, 200, 'Stats fetched.', {
      totalUsers,
      totalRides,
      activeRides,
      openReports,
      weekly,
      health: {
        avgRating,
        completionRate,
        cancelledCount,
        completedCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/users
// Query params: search, role, status, sortBy (rating|joinDate), order (asc|desc)
const getAllUsers = async (req, res, next) => {
  try {
    const { search = '', role = 'all', status = 'all', sortBy = 'joinDate', order = 'desc' } = req.query;

    const filter = { role: { $ne: 'Admin' } };

    if (search.trim()) {
      const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ firstName: re }, { lastName: re }, { email: re }];
    }

    if (role !== 'all') {
      filter.role = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
    }

    if (status !== 'all') {
      const statusMap = { verified: { accountStatus: 'Active', verificationStatus: true }, pending: { verificationStatus: false }, suspended: { accountStatus: 'Suspended' }, deactivated: { accountStatus: 'Deactivated' } };
      if (statusMap[status]) Object.assign(filter, statusMap[status]);
    }

    const sortField = sortBy === 'rating' ? 'averageRating' : 'registrationDate';
    const sortOrder = order === 'asc' ? 1 : -1;

    const users = await User.find(filter)
      .select('-password -refreshToken -__v -cashWalletImage -driverLicenseImage')
      .sort({ [sortField]: sortOrder })
      .limit(200);

    return success(res, 200, `${users.length} users found.`, { users });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/users/:userId
const getUserDetail = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('-password -refreshToken -__v');
    if (!user) return error(res, 404, 'User not found.');
    return success(res, 200, 'User fetched.', { user });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/rides
// Query params: search, status, sortBy (date|price), order (asc|desc)
const getAllRides = async (req, res, next) => {
  try {
    const { search = '', status = 'all', sortBy = 'date', order = 'desc' } = req.query;

    const filter = { type: 'Offer' };

    if (status !== 'all') {
      const statusMap = {
        active:    { $in: ['Active', 'Full', 'Open', 'Accepted', 'OnGoing'] },
        completed: 'Completed',
        cancelled: { $in: ['Cancelled', 'Expired'] },
      };
      if (statusMap[status] !== undefined) filter.state = statusMap[status];
    }

    const sortField = sortBy === 'price' ? 'pricePerSeat' : 'departureDateTime';
    const sortOrder = order === 'asc' ? 1 : -1;

    let rides = await Ride.find(filter)
      .populate('driverId', 'firstName lastName email profilePicture')
      .sort({ [sortField]: sortOrder })
      .limit(200);

    if (search.trim()) {
      const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      rides = rides.filter(r =>
        re.test(r.destination) ||
        re.test(r.departureLocation) ||
        (r.driverId && re.test(`${r.driverId.firstName} ${r.driverId.lastName}`))
      );
    }

    return success(res, 200, `${rides.length} rides found.`, { rides });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/rides/:rideId
// Admin force-cancel a ride (regardless of who the driver is)
const adminCancelRide = async (req, res, next) => {
  try {
    const { reason = 'Cancelled by admin' } = req.body;
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) return error(res, 404, 'Ride not found.');
    if (ride.state === 'Cancelled' || ride.state === 'Expired') return error(res, 400, 'Ride is already cancelled.');

    ride.state = 'Cancelled';
    ride.adminNote = reason;
    ride.cancellationReason = reason;
    ride.cancellationDate = new Date();
    await ride.save({ validateModifiedOnly: true });

    return success(res, 200, 'Ride cancelled by admin.');
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/rides/:rideId/passengers
const getRidePassengers = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId)
      .populate('driverId', 'firstName lastName email')
      .populate('bookings.passengerId', 'firstName lastName email');
    if (!ride) return error(res, 404, 'Ride not found.');
    return success(res, 200, 'Ride passengers fetched.', { ride });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/reviews
const getAllReviews = async (req, res, next) => {
  try {
    const { search = '', sortBy = 'date', order = 'desc' } = req.query;

    const sortField = sortBy === 'rating' ? 'rating' : 'date';
    const sortOrder = order === 'asc' ? 1 : -1;

    let reviews = await Review.find()
      .populate('authorId', 'firstName lastName email')
      .populate('subjectId', 'firstName lastName email')
      .sort({ [sortField]: sortOrder })
      .limit(200);

    if (search.trim()) {
      const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      reviews = reviews.filter(r =>
        re.test(r.content) ||
        (r.authorId && re.test(`${r.authorId.firstName} ${r.authorId.lastName}`)) ||
        (r.subjectId && re.test(`${r.subjectId.firstName} ${r.subjectId.lastName}`))
      );
    }

    return success(res, 200, `${reviews.length} reviews found.`, { reviews });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/users/:userId/unsuspend
const unsuspendAccount = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return error(res, 404, 'User not found.');
    if (user.accountStatus !== 'Suspended') return error(res, 400, 'Account is not suspended.');

    user.accountStatus = 'Active';
    await user.save({ validateModifiedOnly: true });

    return success(res, 200, 'Account reactivated.');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStats,
  getAllUsers,
  getUserDetail,
  getAllRides,
  getRidePassengers,
  adminCancelRide,
  getAllReviews,
  unsuspendAccount,
};
