using Repository;
using Repository.EFCore.Authen;
using Entities;
using Libs;
using System;
using System.Collections.Generic;
using System.Text;
using Libs.Auth;

namespace Services.Authen
{
    public class UserService(IUserRepository userRepository) : IUserService
    {
        public async Task<Users?> Authenticate(string username, string password)
        {
            if (string.IsNullOrEmpty(username) || string.IsNullOrWhiteSpace(password))
            {
                return null;
            }
            
            var user = await userRepository.GetByIndentifierAsync(username);
            if (user == null)
            {
                return null;
            }
            if(!TokenHelper.IsValidStoredPassword(password, user.PasswordHash))
            {
                return null;
            }
            user.UpdatedAt = DateTime.UtcNow;
            await userRepository.UpdateAsync(user); 
            return user;
        }
        public async Task<List<Users>> GetAllAsync()
        {
            return await userRepository.GetAllAsync();
        }
        public async Task<Users?> GetById(int id)
        {
            return await userRepository.GetByIdAsync(id);
        }
        public async Task<Users> CreateAsync(Users user, string password,byte roleid)
        {
            user.RoleId = roleid == 0 ? (byte)1 : roleid;
            user.PasswordHash = TokenHelper.HashPasswordForStorage(password);
            user.IsActive = true;
            user.CreatedAt = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;

            await userRepository.CreateAsync(user);
            return user;
        }
        public async Task UpdateAsync(Users user, string? password)
        {
            if (!string.IsNullOrWhiteSpace(password))
            {
                user.PasswordHash = TokenHelper.HashPasswordForStorage(password);
            }

            user.UpdatedAt = DateTime.UtcNow;
            await userRepository.UpdateAsync(user);
        }
        public async Task DeleteAsync(int id)
        {
            await userRepository.DeleteAsync(id);
        }
        public async Task<string?> ResolveRoleName(byte roleId)
        {
            return await userRepository.ResolveRoleName(roleId)?? "User";
        }
    }
}
