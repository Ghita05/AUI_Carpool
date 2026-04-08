import api from './api';

/**
 * POST /api/users/send-verification  (Step 1 of signup)
 */
export const sendVerificationLink = async (email) => {
  const { data } = await api.post('/users/send-verification', { email });
  return data;
};

/**
 * GET /api/users/check-verification?email=...  (Step 2 polling)
 */
export const checkVerification = async (email) => {
  const { data } = await api.get('/users/check-verification', { params: { email } });
  return data;
};

/**
 * POST /api/users/register  (Step 3 — complete profile)
 */
export const register = async ({ firstName, lastName, email, password, phoneNumber, auiId, role }) => {
  const { data } = await api.post('/users/register', {
    firstName, lastName, email, password, phoneNumber, auiId, role,
  });
  return data;
};

/**
 * POST /api/users/resend-verification
 */
export const resendVerification = async (email) => {
  const { data } = await api.post('/users/resend-verification', { email });
  return data;
};

/**
 * POST /api/users/login
 */
export const login = async (email, password) => {
  const { data } = await api.post('/users/login', { email, password });
  return data;
};

/**
 * POST /api/users/logout
 */
export const logout = async () => {
  const { data } = await api.post('/users/logout');
  return data;
};

/**
 * POST /api/users/refresh-token
 */
export const refreshToken = async (token) => {
  const { data } = await api.post('/users/refresh-token', { refreshToken: token });
  return data;
};

/**
 * POST /api/users/recover-password
 */
export const recoverPassword = async (email) => {
  const { data } = await api.post('/users/recover-password', { email });
  return data;
};

/**
 * POST /api/users/reset-password
 */
export const resetPassword = async (token, newPassword) => {
  const { data } = await api.post('/users/reset-password', { token, newPassword });
  return data;
};

/**
 * GET /api/users/me
 */
export const getMe = async () => {
  const { data } = await api.get('/users/me');
  return data;
};

/**
 * GET /api/users/profile/:userId
 */
export const getUserProfile = async (userId) => {
  const { data } = await api.get(`/users/profile/${userId}`);
  return data;
};

/**
 * PUT /api/users/profile
 */
export const updateProfile = async (updates) => {
  const { data } = await api.put('/users/profile', updates);
  return data;
};

/**
 * PUT /api/users/preferences
 */
export const updatePreferences = async (preferences) => {
  const { data } = await api.put('/users/preferences', preferences);
  return data;
};

/**
 * GET /api/users/search
 */
export const searchUsers = async (query, searchType = 'name') => {
  const { data } = await api.get('/users/search', { params: { query, searchType } });
  return data;
};

/**
 * DELETE /api/users/deactivate
 */
export const deactivateAccount = async () => {
  const { data } = await api.delete('/users/deactivate');
  return data;
};

/**
 * PUT /api/users/change-password
 */
export const changePassword = async (currentPassword, newPassword) => {
  const { data } = await api.put('/users/change-password', { currentPassword, newPassword });
  return data;
};
