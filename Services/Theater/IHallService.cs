using DTO.Common;
using DTO.Theater;

namespace Services.Theater
{
    public interface IHallService
    {
        Task<List<HallDTO.HallTypeResponse>> GetHallTypesAsync();
        Task<List<HallDTO.SeatTypeResponse>> GetSeatTypesAsync();
        Task<Paging.PaginationResponse<HallDTO.HallResponse>> GetAllHallsAsync(string? keyword, int? cinemaId, string? status, int page = 1, int pageSize = 12);
        Task<List<HallDTO.HallResponse>> GetHallsByCinemaAsync(int cinemaId);
        Task<HallDTO.HallResponse> GetHallByIdAsync(int hallId);
        Task<List<HallDTO.SeatResponse>> GetSeatsAsync(int hallId);
        Task<List<HallDTO.SeatMapResponse>> GetSeatMapAsync(int hallId, int? showtimeId);
        Task<HallDTO.SeatResponse> UpdateSeatAsync(int seatId, HallDTO.SeatUpdateRequest seatRequest);
        Task<List<HallDTO.SeatResponse>> UpdateSeatsAsync(int hallId, HallDTO.SeatBulkUpdateRequest seatRequest);
        Task<HallDTO.SeatResponse> CreateSeatAsync(int hallId, HallDTO.SeatLayoutItemRequest seatRequest);
        Task<List<HallDTO.SeatResponse>> ReplaceSeatsAsync(int hallId, IReadOnlyList<HallDTO.SeatLayoutItemRequest> seatRequests);
        Task<HallDTO.HallResponse> CreateAsync(HallDTO.HallRequest hallRequest);
        Task<HallDTO.HallResponse> UpdateAsync(int hallId, HallDTO.HallRequest hallRequest);
        Task<HallDTO.HallStatusResponse> UpdateStatusAsync(int hallId, string status);
        Task DeleteAsync(int hallId);
    }
}
