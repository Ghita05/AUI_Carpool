/**
 * services/adminApi.js
 * Centralized admin API service.
 * All calls require a valid Admin JWT passed from AdminAuthContext.
 */

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001';

async function request(path, token, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }

  return data.data;
}

// ── Stats ─────────────────────────────────────────────────────────────────────
export const fetchStats = (token) => request('/api/admin/stats', token);

// ── Users ─────────────────────────────────────────────────────────────────────
export const fetchUsers = (token, params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/admin/users${qs ? `?${qs}` : ''}`, token);
};

export const fetchUserDetail = (token, userId) =>
  request(`/api/admin/users/${userId}`, token);

export const suspendUser = (token, userId, reason) =>
  request(`/api/admin/users/${userId}/suspend`, token, {
    method: 'PUT',
    body: JSON.stringify({ reason }),
  });

export const unsuspendUser = (token, userId) =>
  request(`/api/admin/users/${userId}/unsuspend`, token, { method: 'PUT' });

export const warnUser = (token, userId, warningMessage) =>
  request(`/api/admin/users/${userId}/warn`, token, {
    method: 'POST',
    body: JSON.stringify({ warningMessage }),
  });

// ── Rides ─────────────────────────────────────────────────────────────────────
export const fetchRides = (token, params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/admin/rides${qs ? `?${qs}` : ''}`, token);
};

export const cancelRideAdmin = (token, rideId, reason) =>
  request(`/api/admin/rides/${rideId}`, token, {
    method: 'DELETE',
    body: JSON.stringify({ reason }),
  });

// ── Reviews ───────────────────────────────────────────────────────────────────
export const fetchReviews = (token, params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/admin/reviews${qs ? `?${qs}` : ''}`, token);
};

export const removeReview = (token, reviewId) =>
  request(`/api/admin/reviews/${reviewId}`, token, { method: 'DELETE' });

// ── Reports ───────────────────────────────────────────────────────────────────
export const fetchReports = (token, params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/admin/reports${qs ? `?${qs}` : ''}`, token);
};

export const fetchReportDetail = (token, reportId) =>
  request(`/api/admin/reports/${reportId}`, token);

export const updateReport = (token, reportId, status, adminNote) =>
  request(`/api/admin/reports/${reportId}`, token, {
    method: 'PUT',
    body: JSON.stringify({ status, adminNote }),
  });

export const contactReporter = (token, reportId, message) =>
  request(`/api/admin/reports/${reportId}/contact-reporter`, token, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });

// ── Direct messaging (admin ↔ reporter thread) ────────────────────────────────
export const fetchConversation = (token, otherUserId) =>
  request(`/api/messages/${otherUserId}`, token);

export const sendAdminMessage = (token, receiverId, content) =>
  request('/api/messages/', token, {
    method: 'POST',
    body: JSON.stringify({ receiverId, content }),
  });

