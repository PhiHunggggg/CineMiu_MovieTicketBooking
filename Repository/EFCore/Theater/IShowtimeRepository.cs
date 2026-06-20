using DTO.Theater;

namespace Repository.EFCore.Theater
{
    public interface IShowtimeRepository
    {
        Task<List<ShowtimeDTO.ShowtimeResponse>> GetAllShowtimesAsync(string? keyword, int? movieId, int? cinemaId, int? hallId, DateTime? date, string? status);
        Task<ShowtimeDTO.ShowtimeResponse> GetShowtimeByIdAsync(int showtimeId);
        Task CreateAsync(ShowtimeDTO.ShowtimeRequest showtimeRequest);
        Task UpdateAsync(int showtimeId, ShowtimeDTO.ShowtimeRequest showtimeRequest);
        Task DeleteAsync(int showtimeId);
    }
}
