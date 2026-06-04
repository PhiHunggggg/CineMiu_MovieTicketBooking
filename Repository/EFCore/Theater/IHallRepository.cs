using DTO.Theater;

namespace Repository.EFCore.Theater
{
    public interface IHallRepository
    {
        Task<List<HallDTO.HallTypeResponse>> GetHallTypesAsync();
        Task<List<HallDTO.SeatTypeResponse>> GetSeatTypesAsync();
        Task<List<HallDTO.HallResponse>> GetAllHallsAsync(string? keyword, int? cinemaId, string? status);
        Task<HallDTO.HallResponse> GetHallByIdAsync(int hallId);
        Task<List<HallDTO.SeatResponse>> GetSeatsAsync(int hallId);
        Task<List<HallDTO.SeatMapResponse>> GetSeatMapAsync(int hallId, int? showtimeId);
        Task<HallDTO.SeatResponse> UpdateSeatAsync(int seatId, HallDTO.SeatUpdateRequest seatRequest);
        Task<List<HallDTO.SeatResponse>> UpdateSeatsAsync(int hallId, HallDTO.SeatBulkUpdateRequest seatRequest);
        Task CreateAsync(HallDTO.HallRequest hallRequest);
        Task UpdateAsync(int hallId, HallDTO.HallRequest hallRequest);
        Task DeleteAsync(int hallId);
    }
}
