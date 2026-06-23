import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 8000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Handle response errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authApi = {
    login: (email, password) => api.post('/auth/login', { email, password }),
    register: (data) => api.post('/auth/register', data),
    changePassword: (data) => api.put('/auth/password', data),
};

// User API
export const userApi = {
    getAll: (params) => api.get('/cinema-users', { params }),
    getById: (id) => api.get(`/cinema-users/${id}`),
    create: (data) => api.post('/cinema-users', data),
    update: (id, data) => api.put(`/cinema-users/${id}`, data),
    delete: (id) => api.delete(`/cinema-users/${id}`),
};

export const cinemaLookupApi = {
    getAll: () => api.get('/cinema-lookups'),
};

export const movieApi = {
    getAll: (params) => api.get('/movies', { params }),
    getById: (id) => api.get(`/movies/${id}`),
    create: (data) => api.post('/movies', data),
    update: (id, data) => api.put(`/movies/${id}`, data),
    delete: (id) => api.delete(`/movies/${id}`),
};

export const cinemaApi = {
    getAll: (params) => api.get('/cinemas', { params }),
    getById: (id) => api.get(`/cinemas/${id}`),
    create: (data) => api.post('/cinemas', data),
    update: (id, data) => api.put(`/cinemas/${id}`, data),
    delete: (id) => api.delete(`/cinemas/${id}`),
    getHalls: (cinemaId) => api.get(`/cinemas/${cinemaId}/halls`),
    createHall: (cinemaId, data) => api.post(`/cinemas/${cinemaId}/halls`, data),
    updateHall: (hallId, data) => api.put(`/cinemas/halls/${hallId}`, data),
    updateHallStatus: (hallId, status) => api.patch(`/cinemas/halls/${hallId}/status`, { status }),
    deleteHall: (hallId) => api.delete(`/cinemas/halls/${hallId}`),
    getHallSeats: (hallId) => api.get(`/cinemas/halls/${hallId}/seats`),
    updateHallSeats: (hallId, data) => api.put(`/cinemas/halls/${hallId}/seats`, data),
};

export const showtimeApi = {
    getAll: (params) => api.get('/showtimes', { params }),
    generate: (days = 5) => api.post('/showtimes/generate', null, { params: { days }, timeout: 30000 }),
    getById: (id) => api.get(`/showtimes/${id}`),
    create: (data) => api.post('/showtimes', data),
    update: (id, data) => api.put(`/showtimes/${id}`, data),
    delete: (id) => api.delete(`/showtimes/${id}`),
};

export const ticketPriceApi = {
    getAll: (params) => api.get('/ticket-prices', { params }),
    create: (data) => api.post('/ticket-prices', data),
    update: (id, data) => api.put(`/ticket-prices/${id}`, data),
    delete: (id) => api.delete(`/ticket-prices/${id}`),
};

export const revenueApi = {
    getRevenue: (params) => api.get('/reports/revenue', { params }),
    getSystemRevenue: (params) => api.get('/reports/revenue', { params }),
    getCinemaRevenue: (cinemaId, params) => api.get('/reports/revenue', { params: { ...params, cinemaId } }),
    getOccupancy: (params) => api.get('/reports/occupancy', { params }),
};

export const bookingAdminApi = {
    getAll: (params) => api.get('/bookings', { params }),
    getById: (id) => api.get(`/bookings/${id}`),
    getByCode: (code) => api.get(`/bookings/code/${encodeURIComponent(code)}`),
    getByUser: (userId) => api.get(`/bookings/user/${userId}`),
    cancel: (id, data) => api.post(`/bookings/${id}/cancel`, data),
    refund: (id, data) => api.post(`/bookings/${id}/refund`, data),
    checkIn: (id, data) => api.post(`/bookings/${id}/check-in`, data),
    checkInTicket: (data) => api.post('/bookings/check-in', data),
};

export const concessionApi = {
    getAll: (params) => api.get('/concessions', { params }),
    create: (data) => api.post('/concessions', data),
    update: (id, data) => api.put(`/concessions/${id}`, data),
    delete: (id) => api.delete(`/concessions/${id}`),
    getCategories: () => api.get('/concessions/categories'),
    createCategory: (data) => api.post('/concessions/categories', data),
    updateCategory: (id, data) => api.put(`/concessions/categories/${id}`, data),
    deleteCategory: (id) => api.delete(`/concessions/categories/${id}`),
};

export const promotionApi = {
    getAll: (params) => api.get('/promotions', { params }),
    getById: (id) => api.get(`/promotions/${id}`),
    getByCode: (code) => api.get(`/promotions/code/${encodeURIComponent(code)}`),
    create: (data) => api.post('/promotions', data),
    update: (id, data) => api.put(`/promotions/${id}`, data),
    delete: (id) => api.delete(`/promotions/${id}`),
};

export const reviewApi = {
    getAll: (params) => api.get('/reviews', { params }),
    updateVisibility: (id, data) => api.put(`/reviews/${id}/visibility`, data),
    reply: (id, data) => api.post(`/reviews/${id}/reply`, data),
    delete: (id) => api.delete(`/reviews/${id}`),
};

export const notificationApi = {
    getAll: (params) => api.get('/notifications', { params }),
    create: (data) => api.post('/notifications', data),
    markRead: (id, data) => api.put(`/notifications/${id}/read`, data),
    delete: (id) => api.delete(`/notifications/${id}`),
};

export const adminSystemApi = {
    getSummary: () => api.get('/admin-system/summary'),
    getSessions: () => api.get('/admin-system/sessions'),
    createRole: (data) => api.post('/admin-system/roles', data),
    updateRole: (id, data) => api.put(`/admin-system/roles/${id}`, data),
    deleteRole: (id) => api.delete(`/admin-system/roles/${id}`),
    deleteSession: (sessionId) => api.delete(`/admin-system/sessions/${encodeURIComponent(sessionId)}`),
};

// Product API
export const productApi = {
    getAll: (params) => api.get('/products', { params }),
    search: (params) => api.get('/products', { params }),
    getById: (id) => api.get(`/products/${id}`),
    create: (data) => api.post('/products', data),
    update: (id, data) => api.put(`/products/${id}`, data),
    delete: (id) => api.delete(`/products/${id}`),
};

// Category API
export const categoryApi = {
    getAll: () => api.get('/categories'),
    getById: (id) => api.get(`/categories/${id}`),
    create: (data) => api.post('/categories', data),
    update: (id, data) => api.put(`/categories/${id}`, data),
    delete: (id) => api.delete(`/categories/${id}`),
};

// Order API
export const orderApi = {
    create: (data) => api.post('/orders', data),
    getMyOrders: () => api.get('/orders'),
    getById: (id) => api.get(`/orders/${id}`),
};

export default api;
