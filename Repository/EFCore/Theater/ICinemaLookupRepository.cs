using DTO.Theater;

namespace Repository.EFCore.Theater
{
    public interface ICinemaLookupRepository
    {
        Task<CinemaLookupDTO.LookupResponse> GetAllAsync();
        Task<CinemaLookupDTO.GenreResponse> CreateGenreAsync(string genreName);
    }
}
