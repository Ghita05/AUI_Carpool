// Bulk fetch users by array of IDs (for group ride requests)
export const getUsersByIds = async (ids) => {
  const { data } = await api.post('/rides/users/by-ids', { ids });
  return data;
};
// ═══════════════════════════════════════════
// GROUP RIDE REQUESTS (NEW)
// ═══════════════════════════════════════════

// Leave group ride request
export const leaveGroupRideRequest = async (requestId) => {
  const { data } = await api.put(`/rides/requests/${requestId}/leave`);
  return data;
};

// Remove a member from group ride request (owner only)
export const removeGroupMember = async (requestId, userId) => {
  const { data } = await api.put(`/rides/requests/${requestId}/remove-member`, { userId });
  return data;
};

// Transfer group owner (owner only)
export const transferGroupOwner = async (requestId, newOwnerId) => {
  const { data } = await api.put(`/rides/requests/${requestId}/transfer-owner`, { newOwnerId });
  return data;
};
// ═══════════════════════════════════════════
// USER SEARCH (for group ride requests)
// ═══════════════════════════════════════════
export const searchUsers = async (query) => {
  const { data } = await api.get('/rides/users/search', { params: { q: query } });
  return data;
};
import api from './api';

// ═══════════════════════════════════════════
// ROUTE ALTERNATIVES
// ═══════════════════════════════════════════

export const getRouteAlternatives = async (origin, destination, stops = []) => {
  const { data } = await api.post('/routes/alternatives', { origin, destination, stops });
  return data;
};

export const validateStopOnRoute = async (origin, destination, stopLocation) => {
  const { data } = await api.post('/routes/validate-stop', { origin, destination, stopLocation });
  return data;
};

// ═══════════════════════════════════════════
// RIDE OFFERS
// ═══════════════════════════════════════════

export const getAvailableRides = async (filters = {}) => {
  const { data } = await api.get('/rides', { params: filters });
  return data;
};

export const getRideDetails = async (rideId) => {
  const { data } = await api.get(`/rides/${rideId}`);
  return data;
};

export const getMyRides = async (status = 'upcoming') => {
  const { data } = await api.get('/rides/driver/my-rides', { params: { status } });
  return data;
};

export const postRideOffer = async (rideData) => {
  const { data } = await api.post('/rides', rideData);
  return data;
};

export const modifyRide = async (rideId, updates) => {
  const { data } = await api.put(`/rides/${rideId}`, updates);
  return data;
};

export const cancelRide = async (rideId, reason = '') => {
  const { data } = await api.delete(`/rides/${rideId}`, { data: { reason } });
  return data;
};

export const completeRide = async (rideId) => {
  const { data } = await api.put(`/rides/${rideId}/complete`);
  return data;
};

// ── Attendance (Building Block 2.4 — during-ride phase) ──────────────────────
// GET fetches the passenger list with their current attendanceStatus
// for the driver's check-in panel.
export const getAttendance = async (rideId) => {
  const { data } = await api.get(`/rides/${rideId}/attendance`);
  return data;
};

// PUT submits the driver's attendance marks.
// attendance: Array<{ bookingId: string, status: 'Present' | 'Absent' }>
export const markAttendance = async (rideId, attendance) => {
  const { data } = await api.put(`/rides/${rideId}/attendance`, { attendance });
  return data;
};

// ═══════════════════════════════════════════
// RIDE REQUESTS
// ═══════════════════════════════════════════

export const getRideRequests = async (filters = {}) => {
  const { data } = await api.get('/rides/requests/all', { params: filters });
  return data;
};

export const getMyRideRequests = async () => {
  const { data } = await api.get('/rides/requests/my');
  return data;
};

export const postRideRequest = async (requestData) => {
  const { data } = await api.post('/rides/requests', requestData);
  return data;
};

export const modifyRideRequest = async (requestId, updates) => {
  const { data } = await api.put(`/rides/requests/${requestId}`, updates);
  return data;
};

export const deleteRideRequest = async (requestId) => {
  console.log('[deleteRideRequest] Sending DELETE to:', `/rides/requests/${requestId}`);
  try {
    const { data } = await api.delete(`/rides/requests/${requestId}`);
    console.log('[deleteRideRequest] Success:', data);
    return data;
  } catch (err) {
    console.log('[deleteRideRequest] Error:', err?.response?.data || err?.message || err);
    throw err;
  }
};

// Cancel entire group ride request (owner only, assumes all members agreed)
export const cancelGroupRideRequest = async (requestId) => {
  console.log('[cancelGroupRideRequest] Sending PUT to:', `/rides/requests/${requestId}/cancel-group`);
  try {
    const { data } = await api.put(`/rides/requests/${requestId}/cancel-group`);
    console.log('[cancelGroupRideRequest] Success:', data);
    return data;
  } catch (err) {
    console.log('[cancelGroupRideRequest] Error:', err?.response?.data || err?.message || err);
    throw err;
  }
};

export const acceptRideRequest = async (requestId, rideId) => {
  const { data } = await api.put(`/rides/requests/${requestId}/accept`, { rideId });
  return data;
};

export const dismissRideRequest = async (requestId) => {
  const { data } = await api.put(`/rides/requests/${requestId}/dismiss`);
  return data;
};

// ═══════════════════════════════════════════
// PASSENGERS
// ═══════════════════════════════════════════

export const getPassengerList = async (rideId) => {
  const { data } = await api.get(`/rides/${rideId}/passengers`);
  return data;
};
