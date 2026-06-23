using DTO.Theater;

namespace Services.Theater
{
    public interface ICinemaLookupService
    {
        Task<CinemaLookupDTO.LookupResponse> GetAllAsync();
        Task<CinemaLookupDTO.GenreResponse> CreateGenreAsync(CinemaLookupDTO.GenreRequest request);
    }
}
