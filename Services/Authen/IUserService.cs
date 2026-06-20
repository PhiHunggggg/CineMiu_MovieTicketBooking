using Entities;
using DTO.Authen;
using static DTO.Common.Paging;

namespace Services.Authen
{
    public interface IUserService
    {

        Task<PaginationResponse<UserDto.UserResponse>> GetUsersAsync(
            string? keyword,
            byte? roleId,
            bool? isActive,
            int page,
            int pageSize);
       
        Task<UserDto.UserResponse> GetUserByIdAsync(int id);
        Task CreateUserAsync(UserDto.UserRequest request);
        Task UpdateUserAsync(int id, UserDto.UserRequest request);
        Task<List<object>> GetRolesAsync();
        Task<Users?> Authenticate(string username, string password);
        Task<List<Users>> GetAllAsync();
        Task<Users?> GetById(int id);
        Task<Users> CreateAsync(Users user, string password, byte roleid);
        Task UpdateAsync(Users user, string? password);
        Task DeleteAsync(int id);
        Task<string?> ResolveRoleName(byte roleId);
    }
}
