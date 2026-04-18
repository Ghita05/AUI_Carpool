import api from './api';

export const writeReview = async ({ subjectId, rideId, rating, content }) => {
  const { data } = await api.post('/reviews', { subjectId, rideId, rating, content });
  return data;
};

export const modifyReview = async (reviewId, updates) => {
  const { data } = await api.put(`/reviews/${reviewId}`, updates);
  return data;
};

export const deleteReview = async (reviewId) => {
  const { data } = await api.delete(`/reviews/${reviewId}`);
  return data;
};

// type: 'received' (default) or 'given'
export const getUserReviews = async (userId, sortBy = 'date', order = 'desc', type = 'received') => {
  const { data } = await api.get(`/reviews/user/${userId}`, { params: { sortBy, order, type } });
  return data;
};

export const getUserRatings = async (userId) => {
  const { data } = await api.get(`/reviews/user/${userId}/rating`);
  return data;
};

export const getReviewSummary = async (userId) => {
  const { data } = await api.get(`/reviews/user/${userId}/summary`);
  return data;
};

// Community leaderboard — top-rated drivers with AI summaries
export const getCommunityDrivers = async (limit = 20) => {
  const { data } = await api.get('/reviews/community', { params: { limit } });
  return data;
};

// Driver route analytics — for the driver's own profile
export const getDriverAnalytics = async (userId) => {
  const { data } = await api.get(`/reviews/driver/${userId}/analytics`);
  return data;
};
