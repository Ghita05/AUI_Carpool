// ═══════════════════════════════════════════
// USER SEARCH (for group ride requests)
// ═══════════════════════════════════════════
export const searchUsers = async (query) => {
  const { data } = await api.get('/rides/users/search', { params: { q: query } });
  return data;
};
import api from './api';

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
  const { data } = await api.delete(`/rides/requests/${requestId}`);
  return data;
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
