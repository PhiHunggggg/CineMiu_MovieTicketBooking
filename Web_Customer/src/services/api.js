const API_BASE = '/api';

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
    getAll: (params = {}) => request('/showtimes?${new URLSearchParams(params)}'),
}
