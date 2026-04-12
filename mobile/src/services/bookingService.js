import api from './api';

export const bookRide = async (rideId, { seatsCount, pickupLocation, luggageDeclaration }) => {
  const { data } = await api.post(`/rides/${rideId}/bookings`, {
    seatsCount, pickupLocation, luggageDeclaration,
  });
  return data;
};

export const bookGroupRide = async (rideId, { passengerIds, pickupLocation, luggageDeclaration }) => {
  const { data } = await api.post(`/rides/${rideId}/bookings/group`, {
    passengerIds, pickupLocation, luggageDeclaration,
  });
  return data;
};

export const declareLuggage = async (bookingId, luggageDeclaration) => {
  const { data } = await api.put(`/rides/bookings/${bookingId}/luggage`, { luggageDeclaration });
  return data;
};

export const requestAdditionalStop = async (bookingId, stopLocation) => {
  const { data } = await api.put(`/rides/bookings/${bookingId}/stop`, { stopLocation });
  return data;
};

export const cancelBooking = async (bookingId, reason = '') => {
  const { data } = await api.delete(`/rides/bookings/${bookingId}`, { data: { reason } });
  return data;
};

export const getCurrentBookings = async () => {
  const { data } = await api.get('/rides/bookings/current');
  return data;
};

export const getBookingHistory = async () => {
  const { data } = await api.get('/rides/bookings/history');
  return data;
};

export const respondToStopRequest = async (bookingId, approved) => {
  const { data } = await api.put(`/rides/bookings/${bookingId}/stop/respond`, { approved });
  return data;
};

export const getStopRequests = async (rideId) => {
  const { data } = await api.get(`/rides/${rideId}/stops`);
  return data;
};
