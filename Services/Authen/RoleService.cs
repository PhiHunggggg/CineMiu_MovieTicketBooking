using Repository;
using Repository.EFCore.Authen;
using Entities;
using Libs;
using System;
using System.Collections.Generic;
using System.Text;
using Libs.Auth;
using DTO.Authen;
using static DTO.Common.Paging;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore.Metadata.Internal;

namespace Services.Authen
{
    public class RoleService(IRoleRepository roleRepository) : IRoleService
    {
        public async Task<object> GetAll()
        {
            return await roleRepository.GetAllAsync();
        }
        public async Task<Role> GetById(int id)
        {
            var role =  await roleRepository.GetByIdAsync(id);
            if(role == null)
            {
                throw new KeyNotFoundException("Không tìm thấy role");
            }
            return role;
        }
        public async Task<Role> GetByName(string roleName)
        {
            var role =  await roleRepository.GetByName(roleName);
            if(role == null)
            {
                throw new KeyNotFoundException("Không tìm thấy Role");
            }
            return role;
        }
    }
}
