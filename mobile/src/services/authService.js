import api from './api';

// POST /api/users/send-verification  (Step 1 of signup)`r`nexport const sendVerificationLink = async (email) => {
  const { data } = await api.post('/users/send-verification', { email });
  return data;
};

// GET /api/users/check-verification?email=...  (Step 2 polling)`r`nexport const checkVerification = async (email) => {
  const { data } = await api.get('/users/check-verification', { params: { email } });
  return data;
};

// POST /api/users/register  (Step 3 — complete profile)`r`nexport const register = async ({ firstName, lastName, email, password, phoneNumber, auiId, role, gender }) => {
  const { data } = await api.post('/users/register', {
    firstName, lastName, email, password, phoneNumber, auiId, role, gender,
  });
  return data;
};

// POST /api/users/resend-verification`r`nexport const resendVerification = async (email) => {
  const { data } = await api.post('/users/resend-verification', { email });
  return data;
};

// POST /api/users/login`r`nexport const login = async (email, password) => {
  const { data } = await api.post('/users/login', { email, password });
  return data;
};

// POST /api/users/logout`r`nexport const logout = async () => {
  const { data } = await api.post('/users/logout');
  return data;
};

// POST /api/users/refresh-token`r`nexport const refreshToken = async (token) => {
  const { data } = await api.post('/users/refresh-token', { refreshToken: token });
  return data;
};

// POST /api/users/recover-password`r`nexport const recoverPassword = async (email) => {
  const { data } = await api.post('/users/recover-password', { email });
  return data;
};

// POST /api/users/reset-password`r`nexport const resetPassword = async (token, newPassword) => {
  const { data } = await api.post('/users/reset-password', { token, newPassword });
  return data;
};

// GET /api/users/me`r`nexport const getMe = async () => {
  const { data } = await api.get('/users/me');
  return data;
};

// GET /api/users/profile/:userId`r`nexport const getUserProfile = async (userId) => {
  const { data } = await api.get(`/users/profile/${userId}`);
  return data;
};

// PUT /api/users/profile`r`nexport const updateProfile = async (updates) => {
  const { data } = await api.put('/users/profile', updates);
  return data;
};

// PUT /api/users/preferences`r`nexport const updatePreferences = async (preferences) => {
  const { data } = await api.put('/users/preferences', preferences);
  return data;
};

// GET /api/users/search`r`nexport const searchUsers = async (query, searchType = 'name') => {
  const { data } = await api.get('/users/search', { params: { query, searchType } });
  return data;
};

// DELETE /api/users/deactivate`r`nexport const deactivateAccount = async () => {
  const { data } = await api.delete('/users/deactivate');
  return data;
};

// PUT /api/users/change-password`r`nexport const changePassword = async (currentPassword, newPassword) => {
  const { data } = await api.put('/users/change-password', { currentPassword, newPassword });
  return data;
};

// POST /api/users/upload/cashwallet  (with OCR processing)`r`nexport const uploadCashWallet = async (imageUri) => {
  const formData = new FormData();
  formData.append('cashWalletImage', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'cashwallet.jpg',
  });
  const { data } = await api.post('/users/upload/cashwallet', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

// POST /api/users/upload/license  (with OCR processing)`r`nexport const uploadDriverLicense = async (imageUri) => {
  const formData = new FormData();
  formData.append('driverLicenseImage', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'license.jpg',
  });
  const { data } = await api.post('/users/upload/license', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

// POST /api/users/upload/profile-picture`r`nexport const uploadProfilePicture = async (imageUri) => {
  const formData = new FormData();
  formData.append('profilePicture', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'profile.jpg',
  });
  const { data } = await api.post('/users/upload/profile-picture', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

// POST /api/users/ocr-preview — pre-auth OCR preview (no JWT needed, does not store data)
export const previewCashWalletOCR = async (imageUri) => {
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'cashwallet_preview.jpg',
  });
  formData.append('docType', 'cashwallet');
  const { data } = await api.post('/users/ocr-preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const previewDriverLicenseOCR = async (imageUri) => {
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'license_preview.jpg',
  });
  formData.append('docType', 'license');
  const { data } = await api.post('/users/ocr-preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const previewRegCardOCR = async (imageUri) => {
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'regcard_preview.jpg',
  });
  formData.append('docType', 'regcard');
  const { data } = await api.post('/users/ocr-preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};
