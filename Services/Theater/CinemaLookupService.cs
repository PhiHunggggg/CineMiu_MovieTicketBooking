using DTO.Theater;
using Repository.EFCore.Theater;

namespace Services.Theater
{
    public class CinemaLookupService(ICinemaLookupRepository cinemaLookupRepository) : ICinemaLookupService
    {
        public Task<CinemaLookupDTO.LookupResponse> GetAllAsync() => cinemaLookupRepository.GetAllAsync();

        public Task<CinemaLookupDTO.GenreResponse> CreateGenreAsync(CinemaLookupDTO.GenreRequest request)
        {
            var genreName = request.GenreName.Trim();
            if (string.IsNullOrWhiteSpace(genreName))
            {
                throw new ArgumentException("Genre name is required");
            }

            return cinemaLookupRepository.CreateGenreAsync(genreName);
        }
    }
}
