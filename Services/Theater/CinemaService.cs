using DTO.Common;
using DTO.Theater;
using Repository.EFCore.Theater;

namespace Services.Theater
{
    public class CinemaService(ICinemaRepository cinemaRepository) : ICinemaService
    {
        public async Task<List<CinemaDTO.ChainResponse>> GetChainsAsync()
        {
            return await cinemaRepository.GetChainsAsync();
        }

        public async Task<List<CinemaDTO.CinemaResponse>> GetAllAsync(string? city, bool activeOnly = true)
        {
            return await cinemaRepository.GetAllCinemasAsync(null, city, activeOnly ? true : null);
        }

        public async Task<Paging.PaginationResponse<CinemaDTO.CinemaResponse>> GetAllCinemasAsync(string? keyword, string? city, bool? isActive, int page = 1, int pageSize = 12)
        {
            page = Math.Max(page, 1);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var cinemas = await cinemaRepository.GetAllCinemasAsync(keyword, city, isActive);
            var totalCount = cinemas.Count;
            var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);
            var items = cinemas.Skip((page - 1) * pageSize).Take(pageSize).ToList();

            return new Paging.PaginationResponse<CinemaDTO.CinemaResponse>
            {
                Page = page,
                PageSize = pageSize,
                TotalCount = totalCount,
                TotalPages = totalPages,
                Items = items
            };
        }

        public Task<List<CinemaDTO.CinemaResponse>> GetAllAsync(string? city, bool activeOnly) =>
            cinemaRepository.GetAllAsync(city, activeOnly);

        public Task<List<CinemaDTO.CinemaByMovieResponse>> GetByMovieAsync(
            int movieId, DateTime? dateFrom, DateTime? dateTo)
        {
            var rangeStart = (dateFrom ?? DateTime.Today).Date;
            var rangeEndExclusive = (dateTo ?? rangeStart.AddDays(6)).Date.AddDays(1);
            if (rangeEndExclusive <= rangeStart)
            {
                throw new ArgumentException("dateTo must be on or after dateFrom");
            }

            return cinemaRepository.GetByMovieAsync(movieId, rangeStart, rangeEndExclusive);
        }

        public async Task<CinemaDTO.CinemaResponse> GetCinemaByIdAsync(int cinemaId)
        {
            return await cinemaRepository.GetCinemaByIdAsync(cinemaId);
        }

        public Task<CinemaDTO.CinemaDetailResponse> GetDetailAsync(int cinemaId) =>
            cinemaRepository.GetDetailAsync(cinemaId);

        public Task<List<CinemaDTO.HallResponse>> GetHallsAsync(int cinemaId) =>
            cinemaRepository.GetHallsAsync(cinemaId);

        public async Task<CinemaDTO.CinemaResponse> CreateAsync(CinemaDTO.CinemaRequest cinemaRequest)
        {
            NormalizeCinemaRequest(cinemaRequest);
            return await cinemaRepository.CreateAsync(cinemaRequest);
        }

        public async Task<CinemaDTO.CinemaResponse> UpdateAsync(int cinemaId, CinemaDTO.CinemaRequest cinemaRequest)
        {
            NormalizeCinemaRequest(cinemaRequest);
            return await cinemaRepository.UpdateAsync(cinemaId, cinemaRequest);
        }

        public async Task DeleteAsync(int cinemaId)
        {
            await cinemaRepository.DeleteAsync(cinemaId);
        }

        public Task<CinemaDTO.HallResponse> CreateHallAsync(int cinemaId, CinemaDTO.HallRequest request) =>
            cinemaRepository.CreateHallAsync(cinemaId, request);

        public Task<CinemaDTO.HallResponse> UpdateHallAsync(int hallId, CinemaDTO.HallRequest request) =>
            cinemaRepository.UpdateHallAsync(hallId, request);

        public Task DeleteHallAsync(int hallId) => cinemaRepository.DeleteHallAsync(hallId);

        public Task<List<CinemaDTO.SeatResponse>> GetSeatsAsync(int hallId) =>
            cinemaRepository.GetSeatsAsync(hallId);

        public Task<CinemaDTO.SeatResponse> CreateSeatAsync(int hallId, CinemaDTO.SeatRequest request)
        {
            NormalizeSeat(request);
            return cinemaRepository.CreateSeatAsync(hallId, request);
        }

        public Task<List<CinemaDTO.SeatResponse>> ReplaceSeatsAsync(
            int hallId, IReadOnlyCollection<CinemaDTO.SeatRequest> requests)
        {
            if (requests.Count == 0) throw new ArgumentException("Seats are required");
            foreach (var request in requests) NormalizeSeat(request);

            var duplicateCode = requests.GroupBy(x => x.SeatCode, StringComparer.OrdinalIgnoreCase)
                .FirstOrDefault(x => x.Count() > 1)?.Key;
            if (!string.IsNullOrWhiteSpace(duplicateCode))
                throw new ArgumentException($"Duplicate seat code: {duplicateCode}");

            return cinemaRepository.ReplaceSeatsAsync(hallId, requests);
        }

        private static void NormalizeCinemaRequest(CinemaDTO.CinemaRequest request)
        {
            request.Ward ??= request.District;
        }

        private static void NormalizeSeat(CinemaDTO.SeatRequest request)
        {
            request.RowLabel = request.RowLabel.Trim().ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(request.RowLabel) || request.ColNumber == 0)
                throw new ArgumentException("Seat row and column are required");
            request.SeatCode = string.IsNullOrWhiteSpace(request.SeatCode)
                ? $"{request.RowLabel}{request.ColNumber}"
                : request.SeatCode.Trim().ToUpperInvariant();
        }
    }
}
