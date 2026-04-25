import api from './api';

/**
 * createReport({ subjectId, context, rideId?, messageSnapshot?, category, description })
 * POST /api/reports
 */
export const createReport = async (data) => {
  const { data: res } = await api.post('/reports', data);
  return res;
};
