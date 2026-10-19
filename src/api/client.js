const BASE = import.meta.env.VITE_API_URL || '/api';
let token = sessionStorage.getItem('medresq_token');

export async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && !['/auth/login', '/auth/otp/verify'].includes(path)) {
      token = null;
      sessionStorage.removeItem('medresq_token');
      window.dispatchEvent(new Event('medresq-session-expired'));
    }
    throw new Error(data.message || `Request failed (${response.status})`);
  }
  return data;
}
const json = (method, body) => ({ method, body: JSON.stringify(body) });
const keepSession = data => {
  token = data.token;
  sessionStorage.setItem('medresq_token', token);
  return data.user;
};
export const api = {
  health: () => request('/health'),
  hasSession: () => Boolean(token),
  me: () => request('/auth/me'),
  login: (email, password) => request('/auth/login', json('POST', { email, password })).then(keepSession),
  sendOtp: phone => request('/auth/otp/send', json('POST', { phone })),
  verifyOtp: (phone, code) => request('/auth/otp/verify', json('POST', { phone, code })).then(keepSession),
  logout: async () => {
    try { if (token) await request('/auth/logout', { method: 'POST' }); }
    finally { token = null; sessionStorage.removeItem('medresq_token'); }
  },
  hospitals: () => request('/hospitals'),
  updateHospital: h => request(`/hospitals/${encodeURIComponent(h.id)}`, json('PUT', h)),
  referrals: () => request('/referrals'),
  book: booking => request('/referrals', json('POST', booking)),
  transition: (id, status) => request(`/referrals/${encodeURIComponent(id)}/status`, json('PATCH', { status })),
  notifications: () => request('/notifications'),
  readNotice: id => request(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' }),
  ambulances: () => request('/ambulances'),
  system: () => request('/system'),
  disaster: disasterMode => request('/system', json('PUT', { disasterMode })),
  sos: coords => request('/sos', json('POST', { lat: coords.lat, lng: coords.lng })),
  sosRequests: () => request('/sos'),
  respondSos: (id, status) => request(`/sos/${encodeURIComponent(id)}/status`, json('PATCH', { status })),
  cancelSos: id => request(`/sos/${encodeURIComponent(id)}/cancel`, { method: 'PATCH' }),
  analytics: () => request('/analytics'),
};
