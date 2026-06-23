using DTO.Administration;

namespace Services.Administration;

public interface IAdminSystemService
{
    Task<AdminSystemDTO.SummaryResponse> GetSummaryAsync();
    Task<List<AdminSystemDTO.SessionResponse>> GetSessionsAsync();
    Task<AdminSystemDTO.RoleResponse> CreateRoleAsync(AdminSystemDTO.RoleRequest request);
    Task<AdminSystemDTO.RoleResponse> UpdateRoleAsync(byte id, AdminSystemDTO.RoleRequest request);
    Task DeleteRoleAsync(byte id);
    Task DeleteSessionAsync(string sessionId);
}
