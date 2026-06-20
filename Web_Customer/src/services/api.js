const API_BASE = '/api';

function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });

  const value = query.toString();
  return value ? `?${value}` : '';
}

function getToken() {
  try {
    const data = JSON.parse(localStorage.getItem('cineverse_auth') || '{}');
    return data.token || data.Token || localStorage.getItem('token') || null;
  } catch {
    return localStorage.getItem('token') || null;
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = getToken();
  const { headers, ...restOptions } = options;
  const config = {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (networkErr) {
    throw new Error('Khong the ket noi den server. Vui long kiem tra backend dang chay.', { cause: networkErr });
  }

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  if (!response.ok) {
    const error = new Error(data?.message || data?.title || data || `HTTP ${response.status}: ${response.statusText}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const authApi = {
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getProfile: () => request('/auth/me'),
  updateProfile: (data) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
};

export const cinemaApi = {
  getAll: (params = {}) => {
    if (typeof params === 'string') {
      return request(`/cinemas${buildQuery({ city: params })}`);
    }
    return request(`/cinemas${buildQuery(params)}`);
  },
  getById: (id) => request(`/cinemas/${id}`),
  getSeats: (hallId) => request(`/cinemas/halls/${hallId}/seats`),
};

export const movieApi = {
  getAll: (params = {}) => request(`/movies${buildQuery(params)}`),
  getById: (id) => request(`/movies/${id}`),
};

export const showtimeApi = {
  getAll: (params = {}) => request(`/showtimes${buildQuery(params)}`),
  getById: (id) => request(`/showtimes/${id}`),
  getSeats: (id, params = {}) => request(`/showtimes/${id}/seats${buildQuery(params)}`),
  lockSeats: (showtimeId, data) => request(`/showtimes/${showtimeId}/locks`, { method: 'POST', body: JSON.stringify(data) }),
  unlockSeats: (showtimeId, data) => request(`/showtimes/${showtimeId}/unlocks`, { method: 'POST', body: JSON.stringify(data) }),
};

export const bookingApi = {
  create: (data) => request('/bookings', { method: 'POST', body: JSON.stringify(data) }),
  getById: (id) => request(`/bookings/${id}`),
  getByUser: (userId) => request(`/bookings/user/${userId}`),
  getByEmail: (email) => request(`/bookings/user-by-email${buildQuery({ email })}`),
  addPayment: (id, data) => request(`/bookings/${id}/payments`, { method: 'POST', body: JSON.stringify(data) }),
  cancel: (id, reason) => request(`/bookings/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
};

export const productApi = {
  getAll: (categoryId) => request(`/products${buildQuery({ categoryId })}`),
};

export const lookupApi = {
  getAll: () => request('/lookups'),
};

export const promotionApi = {
  getAll: (params = {}) => request(`/promotions${buildQuery(params)}`),
  getByCode: (code) => request(`/promotions/code/${encodeURIComponent(code)}`),
  getVoucher: (code) => request(`/promotions/vouchers/${encodeURIComponent(code)}`),
  validate: (data) => request('/promotions/validate', { method: 'POST', body: JSON.stringify(data) }),
};

export const userApi = {
  getById: (id) => request(`/cinema-users/${id}`),
  create: (data) => request('/cinema-users', { method: 'POST', body: JSON.stringify(data) }),
};

export const loyaltyApi = {
  getByUser: (userId) => request(`/loyalty/users/${userId}`),
  getByEmail: (email) => request(`/loyalty/by-email${buildQuery({ email })}`),
  getTransactions: (userId) => request(`/loyalty/users/${userId}/transactions`),
  getTransactionsByEmail: (email) => request(`/loyalty/by-email/transactions${buildQuery({ email })}`),
};
