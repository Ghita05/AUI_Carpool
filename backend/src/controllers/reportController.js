const { Report, User, Ride, Notification, Message } = require('../models');
const { success, error } = require('../utils/responses');

const CATEGORIES = ['Harassment', 'Inappropriate Behavior', 'Dangerous Driving', 'Fraud or Scam', 'Spam', 'Other'];

// ── POST /api/reports ─────────────────────────────────────────────────────────
// Any authenticated user can file a report.
const createReport = async (req, res, next) => {
  try {
    const { subjectId, context, rideId, messageSnapshot, category, description } = req.body;
    const reporterId = req.user._id;

    if (reporterId.toString() === subjectId) {
      return error(res, 400, 'You cannot report yourself.');
    }
    if (!['Ride', 'Message'].includes(context)) {
      return error(res, 400, 'Invalid report context.');
    }
    if (!CATEGORIES.includes(category)) {
      return error(res, 400, 'Invalid category.');
    }

    const subject = await User.findById(subjectId).select('_id');
    if (!subject) return error(res, 404, 'Reported user not found.');

    const report = await Report.create({
      reporterId,
      subjectId,
      context,
      rideId: rideId || null,
      messageSnapshot: messageSnapshot || {},
      category,
      description: description || '',
    });

    return success(res, 201, 'Report submitted.', { reportId: report._id });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/admin/reports ────────────────────────────────────────────────────
// Query: status (Open|Reviewed|Resolved), context (Ride|Message), page, limit
const listReports = async (req, res, next) => {
  try {
    const { status, context, page = 1, limit = 30 } = req.query;
    const filter = {};
    if (status)  filter.status  = status;
    if (context) filter.context = context;

    const skip = (Number(page) - 1) * Number(limit);

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('reporterId', 'firstName lastName email')
        .populate('subjectId',  'firstName lastName email accountStatus')
        .populate('rideId',     'departureLocation destination departureDateTime state'),
      Report.countDocuments(filter),
    ]);

    return success(res, 200, 'Reports fetched.', { reports, total });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/admin/reports/:reportId ─────────────────────────────────────────
const getReport = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.reportId)
      .populate('reporterId', 'firstName lastName email profilePicture averageRating totalCompletedRides')
      .populate('subjectId',  'firstName lastName email profilePicture averageRating totalCompletedRides accountStatus suspensionReason role')
      .populate('rideId',     'departureLocation destination departureDateTime state pricePerSeat');

    if (!report) return error(res, 404, 'Report not found.');
    return success(res, 200, 'Report fetched.', { report });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/admin/reports/:reportId ─────────────────────────────────────────
// Body: { status, adminNote }
const updateReport = async (req, res, next) => {
  try {
    const { status, adminNote } = req.body;
    const update = {};
    if (status)    update.status    = status;
    if (adminNote !== undefined) update.adminNote = adminNote;
    if (status === 'Resolved') update.resolvedAt = new Date();

    const report = await Report.findByIdAndUpdate(req.params.reportId, { $set: update }, { new: true });
    if (!report) return error(res, 404, 'Report not found.');
    return success(res, 200, 'Report updated.', { report });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/admin/reports/:reportId/contact-reporter ───────────────────────
// Sends an in-app notification to the reporter to continue the discussion.
const contactReporter = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return error(res, 400, 'Message is required.');

    const report = await Report.findById(req.params.reportId).populate('reporterId', '_id firstName');
    if (!report) return error(res, 404, 'Report not found.');

    const admin = req.user;

    const notification = await Notification.create({
      userId:   report.reporterId._id,
      title:    'Admin Follow-up on Your Report',
      content:  message.trim(),
      type:     'System',
      metadata: {
        adminId:   admin._id.toString(),
        adminName: `${admin.firstName} ${admin.lastName}`.trim(),
        fromAdmin: true,
      },
    });

    // Also persist as a real Message so the reporter sees it in their chat
    await Message.create({
      senderId:   admin._id,
      receiverId: report.reporterId._id,
      content:    message.trim(),
    });

    // Push real-time notification to the reporter's socket room
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${report.reporterId._id.toString()}`).emit('new-notification', {
        notification: notification.toObject(),
      });
    }

    // Mark as Reviewed if still Open
    if (report.status === 'Open') {
      report.status = 'Reviewed';
      await report.save();
    }

    return success(res, 200, 'Reporter notified.');
  } catch (err) {
    next(err);
  }
};

module.exports = { createReport, listReports, getReport, updateReport, contactReporter };
