using DTO.Authen;

namespace Services.Authen
{
    public interface ICinemaUserService
    {
        Task<List<CinemaUserDTO.UserResponse>> GetAllAsync(string? keyword);
        Task<CinemaUserDTO.UserResponse> GetByIdAsync(int userId);
        Task<CinemaUserDTO.UserResponse> CreateAsync(CinemaUserDTO.UserRequest request);
        Task<CinemaUserDTO.UserResponse> UpdateAsync(int userId, CinemaUserDTO.UserRequest request);
        Task<CinemaUserDTO.MessageResponse> DeactivateAsync(int userId);
    }
}
