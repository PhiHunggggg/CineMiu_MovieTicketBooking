const API_BASE = '/api';

function getToken() {
  try {
    const data = JSON.parse(localStorage.getItem('cineverse_auth') || '{}');
    return data.token || null;
  } catch { return null; }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = getToken();
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    ...options,
  };

  console.log(`[API] ${options.method || 'GET'} ${url}`);

  let response;
  try {
    response = await fetch(url, config);
  } catch (networkErr) {
    console.error('[API] Network error:', networkErr);
    throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra backend đang chạy.', { cause: networkErr });
  }

  // Read response body as text first to avoid json parse failures
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errMsg = data?.message || data?.title || `HTTP ${response.status}: ${response.statusText}`;
    console.error(`[API] Error ${response.status}:`, data || text);
    throw new Error(errMsg);
  }

  return data;
}

// ===== Auth =====
export const authApi = {
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getProfile: () => request('/auth/me'),
  updateProfile: (data) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
};

// ===== Cinemas =====
export const cinemaApi = {
  getAll: (city) => request(`/cinemas${city ? `?city=${encodeURIComponent(city)}` : ''}`),
  getById: (id) => request(`/cinemas/${id}`),
  getSeats: (hallId) => request(`/cinemas/halls/${hallId}/seats`),
};

export const movieApi = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.keyword) qs.set('keyword', params.keyword);
    if (params.status) qs.set('status', params.status);
    if (params.cinemaId) qs.set('cinemaId', params.cinemaId);
    if (params.page) qs.set('page', params.page);
    if (params.pageSize) qs.set('pageSize', params.pageSize);
    return request(`/movies?${qs.toString()}`);
  },
  getById: (id) => request(`/movies/${id}`),
};

// ===== Showtimes =====
export const showtimeApi = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.movieId) qs.set('movieId', params.movieId);
    if (params.cinemaId) qs.set('cinemaId', params.cinemaId);
    if (params.date) qs.set('date', params.date);
    return request(`/showtimes?${qs.toString()}`);
  },
  getById: (id) => request(`/showtimes/${id}`),
  lockSeats: (showtimeId, data) => request(`/showtimes/${showtimeId}/locks`, { method: 'POST', body: JSON.stringify(data) }),
  unlockSeats: (showtimeId, data) => request(`/showtimes/${showtimeId}/unlocks`, { method: 'POST', body: JSON.stringify(data) }),
};

// ===== Bookings =====
export const bookingApi = {
  create: (data) => request('/bookings', { method: 'POST', body: JSON.stringify(data) }),
  getById: (id) => request(`/bookings/${id}`),
  getByUser: (userId) => request(`/bookings/user/${userId}`),
  getByEmail: (email) => request(`/bookings/user-by-email?email=${encodeURIComponent(email)}`),
  addPayment: (id, data) => request(`/bookings/${id}/payments`, { method: 'POST', body: JSON.stringify(data) }),
  cancel: (id, reason) => request(`/bookings/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
};

// ===== Products =====
export const productApi = {
  getAll: (categoryId) => request(`/products${categoryId ? `?categoryId=${categoryId}` : ''}`),
};

// ===== Lookups =====
export const lookupApi = {
  getAll: () => request('/lookups'),
};

// ===== Promotions =====
export const promotionApi = {
  getAll: () => request('/promotions'),
  getVoucher: (code) => request(`/promotions/vouchers/${encodeURIComponent(code)}`),
  validate: (data) => request('/promotions/validate', { method: 'POST', body: JSON.stringify(data) }),
};

// ===== Users =====
export const userApi = {
  getById: (id) => request(`/cinema-users/${id}`),
  create: (data) => request('/cinema-users', { method: 'POST', body: JSON.stringify(data) }),
};
// Loyalty
export const loyaltyApi = {
  getByUser: (userId) => request(`/loyalty/users/${userId}`),
  getByEmail: (email) => request(`/loyalty/by-email?email=${encodeURIComponent(email)}`),
  getTransactions: (userId) => request(`/loyalty/users/${userId}/transactions`),
  getTransactionsByEmail: (email) => request(`/loyalty/by-email/transactions?email=${encodeURIComponent(email)}`),
};

