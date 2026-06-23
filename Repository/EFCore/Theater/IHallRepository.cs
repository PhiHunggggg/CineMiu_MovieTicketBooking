using DTO.Theater;

namespace Repository.EFCore.Theater
{
    public interface IHallRepository
    {
        Task<List<HallDTO.HallTypeResponse>> GetHallTypesAsync();
        Task<List<HallDTO.SeatTypeResponse>> GetSeatTypesAsync();
        Task<List<HallDTO.HallResponse>> GetAllHallsAsync(string? keyword, int? cinemaId, string? status);
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
