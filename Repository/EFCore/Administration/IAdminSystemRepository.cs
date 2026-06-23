using DTO.Administration;
using Entities;

namespace Repository.EFCore.Administration;

public interface IAdminSystemRepository
{
    Task<AdminSystemDTO.SummaryResponse> GetSummaryAsync();
    Task<List<AdminSystemDTO.SessionResponse>> GetSessionsAsync();
    Task<Role?> GetRoleAsync(byte id);
    Task<bool> RoleNameExistsAsync(string name, byte? excludeId = null);
    Task<bool> RoleHasUsersAsync(byte id);
    Task<Role> CreateRoleAsync(string name, string description);
    Task SaveRoleAsync(Role role);
    Task DeleteRoleAsync(Role role);
    Task DeleteSessionAsync(string sessionId);
}
