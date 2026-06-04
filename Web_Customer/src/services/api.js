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

function withJson(method, body) {
    return {
        method,
        body: JSON.stringify(body),
    };
}

function toQuery(params = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            qs.set(key, value);
        }
    });
    const text = qs.toString();
    return text ? `?${text}` : '';
}

function normalizeAuthResponse(data) {
    const token = data?.token ?? data?.Token ?? null;
    const user = data?.user ?? {
        userId: data?.userId ?? data?.UserId ?? null,
        roleId: data?.roleId ?? data?.RoleId ?? null,
        cinemaId: data?.cinemaId ?? data?.CinemaId ?? null,
        fullName: data?.fullName ?? data?.FullName ?? null,
        email: data?.email ?? data?.Email ?? null,
        phone: data?.phone ?? data?.Phone ?? null,
        avatarUrl: data?.avatarUrl ?? data?.AvatarUrl ?? null,
        role: data?.role ?? data?.Role ?? null,
    };

    return { ...data, token, user };
}

export const authApi = {
    login: (data) => request('/Auth/login', withJson('POST', data)).then(normalizeAuthResponse),
    register: (data) => request('/Auth/register', withJson('POST', data)),
    getProfile: () => request('/Auth/profile'),
    updateProfile: (data) => request('/Auth/profile', withJson('PUT', data)),
};

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

export const showtimeApi = {
    getAll: (params = {}) => request(`/showtimes${toQuery(params)}`),
    getById: (id) => request(`/showtimes/${id}`),
    lockSeats: (id, data) => request(`/showtimes/${id}/lock-seats`, withJson('POST', data)),
    unlockSeats: (id, data) => request(`/showtimes/${id}/unlock-seats`, withJson('POST', data)),
};

export const lookupApi = {
    getAll: () => request('/lookups'),
};

export const promotionApi = {
    getAll: () => request('/promotions'),
    validate: (data) => request('/promotions/validate', withJson('POST', data)),
};

export const productApi = {
    getAll: () => request('/products'),
};

export const loyaltyApi = {
    getByUser: (userId) => request(`/loyalty/user/${userId}`),
    getByEmail: (email) => request(`/loyalty/user-by-email?email=${encodeURIComponent(email)}`),
    getTransactions: (userId) => request(`/loyalty/user/${userId}/transactions`),
    getTransactionsByEmail: (email) => request(`/loyalty/transactions-by-email?email=${encodeURIComponent(email)}`),
};

export const bookingApi = {
    getById: (id) => request(`/bookings/${id}`),
    getByUser: (userId) => request(`/bookings/user/${userId}`),
    getByEmail: (email) => request(`/bookings/user-by-email?email=${encodeURIComponent(email)}`),
    create: (data) => request('/bookings', withJson('POST', data)),
    cancel: (id, reason) => request(`/bookings/${id}/cancel`, withJson('POST', { reason })),
    addPayment: (id, data) => request(`/bookings/${id}/payments`, withJson('POST', data)),
};
