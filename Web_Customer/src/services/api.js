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

async function request(path, options = {}) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    const contentType = response.headers.get('content-type') || '';
    const data = response.status === 204
        ? null
        : contentType.includes('application/json')
            ? await response.json()
            : await response.text();

    if (!response.ok) {
        const error = new Error(data?.message || data?.title || data || 'Yêu cầu API thất bại');
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}

export const authApi = {
    login: (email, password) => request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    }),
    register: (data) => request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
};

export const cinemaApi = {
    getAll: (params = {}) => request(`/cinemas${buildQuery(params)}`),
    getById: (id) => request(`/cinemas/${id}`),
    getSeats: (hallId) => request(`/cinemas/halls/${hallId}/seats`),
};

export const movieApi = {
    getAll: (params = {}) => request(`/movies${buildQuery(params)}`),
    getById: (id) => request(`/movies/${id}`),
};

export const showtimeApi = {
    getAll: async (params = {}) => {
        const data = await request(`/showtimes${buildQuery(params)}`);
        return Array.isArray(data) ? data : data?.items || [];
    },
    getById: (id) => request(`/showtimes/${id}`),
    getSeats: (id, params = {}) => request(`/showtimes/${id}/seats${buildQuery(params)}`),
    lockSeats: (id, data) => request(`/showtimes/${id}/locks`, {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    unlockSeats: (id, data) => request(`/showtimes/${id}/unlocks`, {
        method: 'POST',
        body: JSON.stringify(data),
    }),
};

export const lookupApi = {
    getAll: () => request('/cinema-lookups'),
};

export const promotionApi = {
    getAll: (params = {}) => request(`/promotions${buildQuery(params)}`),
    getByCode: (code) => request(`/promotions/code/${encodeURIComponent(code)}`),
};

export const concessionApi = {
    getAll: (params = {}) => request(`/concessions${buildQuery(params)}`),
};

export const bookingApi = {
    create: (data) => request('/bookings', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    addPayment: (bookingId, data) => request(`/bookings/${bookingId}/payments`, {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    getByUser: (userId) => request(`/bookings/user/${userId}`),
    getByEmail: (email) => request(`/bookings/user-by-email${buildQuery({ email })}`),
};

export const loyaltyApi = {
    getByUser: (userId) => request(`/loyalty/users/${userId}`),
    getByEmail: (email) => request(`/loyalty/by-email${buildQuery({ email })}`),
    getTransactions: (userId) => request(`/loyalty/users/${userId}/transactions`),
    getTransactionsByEmail: (email) => request(`/loyalty/transactions-by-email${buildQuery({ email })}`),
};
