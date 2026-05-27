using Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace Repository.EFCore.Authen
{
    public interface IUserRepository
    {
        Task<Users?> GetByIndentifierAsync(string identifier);
        Task<Users?> GetByIdAsync(int id);
        Task<List<Users>> GetAllAsync();
        Task CreateAsync(Users user);
        Task UpdateAsync(Users user);
        Task DeleteAsync(int id);
        Task<string?> ResolveRoleName(byte roleId);
    }
}
