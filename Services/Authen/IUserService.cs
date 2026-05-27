using Entities;

namespace Services.Authen
{
    public interface IUserService
    {
        Task<Users?> Authenticate(string username, string password);
        Task<List<Users>> GetAllAsync();
        Task<Users?> GetById(int id);
        Task<Users> CreateAsync(Users user, string password, byte roleid);
        Task UpdateAsync(Users user, string? password);
        Task DeleteAsync(int id);
        Task<string?> ResolveRoleName(byte roleId);
    }
}
