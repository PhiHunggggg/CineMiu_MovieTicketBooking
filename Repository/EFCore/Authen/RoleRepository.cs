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
            return await (
                from user in _context.Users.AsNoTracking()
                join role in _dbSet.AsNoTracking() on user.RoleId equals role.RoleId
                where user.UserId == userId
                select role
            ).FirstOrDefaultAsync();
        }
        public async Task<Role?> GetByName(string roleName)
        {
            var role =await _dbSet.AsNoTracking().FirstOrDefaultAsync(x=>x.RoleName == roleName);
            return role;
        }
    }
}
