using BaseCore.Repository.EFCore;
using Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace Repository.EFCore.Authen
{
    public interface IRoleRepository : IRepository<Role>
    {
        Task<Role?> GetByUserId(int userId);
        Task<Role?> GetByName(string roleName);
    }
}
