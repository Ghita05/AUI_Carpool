import api from './api';

// POST /api/reports — creates a user report with category, description, and optional rideId/message snapshot.
export const createReport = async (data) => {
  const { data: res } = await api.post('/reports', data);
  return res;
};
