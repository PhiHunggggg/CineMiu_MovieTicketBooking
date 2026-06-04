using DTO.Common;
using DTO.Theater;
using Repository.EFCore.Theater;

namespace Services.Theater
{
    public class ShowtimeService(IShowtimeRepository showtimeRepository) : IShowtimeService
    {
        public async Task<Paging.PaginationResponse<ShowtimeDTO.ShowtimeResponse>> GetAllShowtimesAsync(string? keyword, int? movieId, int? cinemaId, int? hallId, DateTime? date, string? status, int page = 1, int pageSize = 12)
        {
            page = Math.Max(page, 1);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var showtimes = await showtimeRepository.GetAllShowtimesAsync(keyword, movieId, cinemaId, hallId, date, status);
            var totalCount = showtimes.Count;
            var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);
            var items = showtimes.Skip((page - 1) * pageSize).Take(pageSize).ToList();

            return new Paging.PaginationResponse<ShowtimeDTO.ShowtimeResponse>
            {
                Page = page,
                PageSize = pageSize,
                TotalCount = totalCount,
                TotalPages = totalPages,
                Items = items
            };
        }

        public async Task<ShowtimeDTO.ShowtimeResponse> GetShowtimeByIdAsync(int showtimeId)
        {
            return await showtimeRepository.GetShowtimeByIdAsync(showtimeId);
        }

        public async Task CreateAsync(ShowtimeDTO.ShowtimeRequest showtimeRequest)
        {
            await showtimeRepository.CreateAsync(showtimeRequest);
        }

        public async Task UpdateAsync(int showtimeId, ShowtimeDTO.ShowtimeRequest showtimeRequest)
        {
            await showtimeRepository.UpdateAsync(showtimeId, showtimeRequest);
        }

        public async Task DeleteAsync(int showtimeId)
        {
            await showtimeRepository.DeleteAsync(showtimeId);
        }
    }
}
