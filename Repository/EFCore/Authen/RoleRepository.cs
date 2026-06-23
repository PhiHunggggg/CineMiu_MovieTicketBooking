using System;
using System.Collections.Generic;
using System.Text;
using BaseCore.Repository.EFCore;
using Entities;
using Microsoft.EntityFrameworkCore;
namespace Repository.EFCore.Authen
{
    public class RoleRepository : Repository<Role>, IRoleRepository
    {
        public RoleRepository(SqlServerDbContext context) : base(context)
        {
        }
        public async Task<Role?> GetByUserId(int userId)
        {
            var role = await _dbSet.AsNoTracking().FirstOrDefaultAsync(x=> x.RoleId ==userId);
            return role;
        }
        public async Task<Role?> GetByName(string roleName)
        {
            var role =await _dbSet.AsNoTracking().FirstOrDefaultAsync(x=>x.RoleName == roleName);
            return role;
        }
    }
}
