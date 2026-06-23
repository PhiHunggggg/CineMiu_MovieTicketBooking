using DTO.Administration;
using Entities;
using Repository.EFCore.Administration;

namespace Services.Administration;

public class AdminSystemService(IAdminSystemRepository repository) : IAdminSystemService
{
    public Task<AdminSystemDTO.SummaryResponse> GetSummaryAsync() => repository.GetSummaryAsync();
    public Task<List<AdminSystemDTO.SessionResponse>> GetSessionsAsync() => repository.GetSessionsAsync();

    public async Task<AdminSystemDTO.RoleResponse> CreateRoleAsync(AdminSystemDTO.RoleRequest request)
    {
        var name = RequireName(request.Name);
        if (await repository.RoleNameExistsAsync(name)) throw new ArgumentException("Role already exists");
        return ToResponse(await repository.CreateRoleAsync(name, request.Description?.Trim() ?? ""));
    }

    public async Task<AdminSystemDTO.RoleResponse> UpdateRoleAsync(byte id, AdminSystemDTO.RoleRequest request)
    {
        var role = await repository.GetRoleAsync(id) ?? throw new KeyNotFoundException("Role not found");
        var name = RequireName(request.Name);
        if (await repository.RoleNameExistsAsync(name, id)) throw new ArgumentException("Role already exists");
        role.RoleName = name;
        role.Description = request.Description?.Trim() ?? "";
        await repository.SaveRoleAsync(role);
        return ToResponse(role);
    }

    public async Task DeleteRoleAsync(byte id)
    {
        var role = await repository.GetRoleAsync(id) ?? throw new KeyNotFoundException("Role not found");
        if (await repository.RoleHasUsersAsync(id))
            throw new InvalidOperationException("Cannot delete role because it is assigned to users");
        await repository.DeleteRoleAsync(role);
    }

    public Task DeleteSessionAsync(string sessionId)
    {
        if (string.IsNullOrWhiteSpace(sessionId)) throw new ArgumentException("Session ID is required");
        return repository.DeleteSessionAsync(sessionId.Trim());
    }

    private static string RequireName(string? name)
    {
        if (string.IsNullOrWhiteSpace(name)) throw new ArgumentException("Role name is required");
        return name.Trim().ToLowerInvariant();
    }

    private static AdminSystemDTO.RoleResponse ToResponse(Role role) => new()
    {
        Id = role.RoleId,
        Name = role.RoleName,
        Description = role.Description
    };
}
