using DTO.Authen;

namespace Repository.EFCore.Authen
{
    public interface ICinemaUserRepository
    {
        Task<List<CinemaUserDTO.UserResponse>> GetAllAsync(string? keyword);
        Task<CinemaUserDTO.UserResponse> GetByIdAsync(int userId);
        Task<bool> EmailExistsAsync(string email, int? excludedUserId = null);
        Task<CinemaUserDTO.UserResponse> CreateAsync(CinemaUserDTO.UserRequest request, string passwordHash);
        Task<CinemaUserDTO.UserResponse> UpdateAsync(
            int userId,
            CinemaUserDTO.UserRequest request,
            string? passwordHash);
        Task DeactivateAsync(int userId);
    }
}
