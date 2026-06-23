using DTO.Common;
using DTO.Theater;
using Repository.EFCore.Theater;

namespace Services.Theater
{
    public class HallService(IHallRepository hallRepository) : IHallService
    {
        public async Task<List<HallDTO.HallTypeResponse>> GetHallTypesAsync()
        {
            return await hallRepository.GetHallTypesAsync();
        }

        public async Task<List<HallDTO.SeatTypeResponse>> GetSeatTypesAsync()
        {
            return await hallRepository.GetSeatTypesAsync();
        }

        public async Task<Paging.PaginationResponse<HallDTO.HallResponse>> GetAllHallsAsync(string? keyword, int? cinemaId, string? status, int page = 1, int pageSize = 12)
        {
            page = Math.Max(page, 1);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var halls = await hallRepository.GetAllHallsAsync(keyword, cinemaId, status);
            var totalCount = halls.Count;
            var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);
            var items = halls.Skip((page - 1) * pageSize).Take(pageSize).ToList();

            return new Paging.PaginationResponse<HallDTO.HallResponse>
            {
                Page = page,
                PageSize = pageSize,
                TotalCount = totalCount,
                TotalPages = totalPages,
                Items = items
            };
        }

        public async Task<List<HallDTO.HallResponse>> GetHallsByCinemaAsync(int cinemaId)
        {
            return await hallRepository.GetHallsByCinemaAsync(cinemaId);
        }

        public async Task<HallDTO.HallResponse> GetHallByIdAsync(int hallId)
        {
            return await hallRepository.GetHallByIdAsync(hallId);
        }

        public async Task<List<HallDTO.SeatResponse>> GetSeatsAsync(int hallId)
        {
            return await hallRepository.GetSeatsAsync(hallId);
        }

        public async Task<List<HallDTO.SeatMapResponse>> GetSeatMapAsync(int hallId, int? showtimeId)
        {
            return await hallRepository.GetSeatMapAsync(hallId, showtimeId);
        }

        public async Task<HallDTO.SeatResponse> UpdateSeatAsync(int seatId, HallDTO.SeatUpdateRequest seatRequest)
        {
            return await hallRepository.UpdateSeatAsync(seatId, seatRequest);
        }

        public async Task<List<HallDTO.SeatResponse>> UpdateSeatsAsync(int hallId, HallDTO.SeatBulkUpdateRequest seatRequest)
        {
            return await hallRepository.UpdateSeatsAsync(hallId, seatRequest);
        }

        public async Task<HallDTO.SeatResponse> CreateSeatAsync(int hallId, HallDTO.SeatLayoutItemRequest seatRequest)
        {
            return await hallRepository.CreateSeatAsync(hallId, seatRequest);
        }

        public async Task<List<HallDTO.SeatResponse>> ReplaceSeatsAsync(int hallId, IReadOnlyList<HallDTO.SeatLayoutItemRequest> seatRequests)
        {
            return await hallRepository.ReplaceSeatsAsync(hallId, seatRequests);
        }

        public async Task<HallDTO.HallResponse> CreateAsync(HallDTO.HallRequest hallRequest)
        {
            return await hallRepository.CreateAsync(hallRequest);
        }

        public async Task<HallDTO.HallResponse> UpdateAsync(int hallId, HallDTO.HallRequest hallRequest)
        {
            return await hallRepository.UpdateAsync(hallId, hallRequest);
        }

        public async Task<HallDTO.HallStatusResponse> UpdateStatusAsync(int hallId, string status)
        {
            return await hallRepository.UpdateStatusAsync(hallId, status);
        }

        public async Task DeleteAsync(int hallId)
        {
            await hallRepository.DeleteAsync(hallId);
        }
    }
}
