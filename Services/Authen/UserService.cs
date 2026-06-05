using Repository;
using Repository.EFCore.Authen;
using Entities;
using Libs;
using DTO.Authen;
using System;
using System.Collections.Generic;
using System.Text;
using Libs.Auth;
using static DTO.Common.Paging;

namespace Services.Authen
{
    public class UserService(IUserRepository userRepository) : IUserService
    {
        public async Task<PaginationResponse<UserDto.UserResponse>> GetUsersAsync(
            string? keyword,
            byte? roleId,
            bool? isActive,
            int page,
            int pageSize)
        {
            page = Math.Max(page, 1);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var users = await userRepository.SearchAsync(keyword, roleId, isActive);
            var roles = await userRepository.GetRolesAsync();
            var roleNames = roles.ToDictionary(role => role.RoleId, role => role.RoleName);

            var totalCount = users.Count;
            var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);
            var items = users
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(user => MapToResponse(user, roleNames))
                .ToList();

            return new PaginationResponse<UserDto.UserResponse>
            {
                Page = page,
                PageSize = pageSize,
                TotalCount = totalCount,
                TotalPages = totalPages,
                Items = items
            };
        }

        public async Task<UserDto.UserResponse> GetUserByIdAsync(int id)
        {
            var user = await userRepository.GetByIdAsync(id);
            if (user == null)
            {
                throw new ArgumentException("User not found");
            }

            return MapToResponse(user, await ResolveRoleName(user.RoleId));
        }

        public async Task CreateUserAsync(UserDto.UserRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Password))
            {
                throw new ArgumentException("Password is required");
            }

            if (await userRepository.EmailExistsAsync(request.Email))
            {
                throw new ArgumentException("Email already exists");
            }

            var user = new Users
            {
                RoleId = request.RoleId == 0 ? (byte)1 : request.RoleId,
                CinemaId = request.CinemaId,
                FullName = request.FullName,
                Email = request.Email,
                Phone = request.Phone,
                AvatarUrl = request.AvatarUrl,
                DateOfBirth = request.DateOfBirth,
                Gender = request.Gender,
                IsActive = request.IsActive
            };

            await CreateAsync(user, request.Password, user.RoleId);
        }

        public async Task UpdateUserAsync(int id, UserDto.UserRequest request)
        {
            var user = await userRepository.GetByIdAsync(id);
            if (user == null)
            {
                throw new ArgumentException("User not found");
            }

            if (await userRepository.EmailExistsAsync(request.Email, id))
            {
                throw new ArgumentException("Email already exists");
            }

            user.RoleId = request.RoleId == 0 ? (byte)1 : request.RoleId;
            user.CinemaId = request.CinemaId;
            user.FullName = request.FullName;
            user.Email = request.Email;
            user.Phone = request.Phone;
            user.AvatarUrl = request.AvatarUrl;
            user.DateOfBirth = request.DateOfBirth;
            user.Gender = request.Gender;
            user.IsActive = request.IsActive;

            await UpdateAsync(user, request.Password);
        }

        public async Task<List<object>> GetRolesAsync()
        {
            var roles = await userRepository.GetRolesAsync();

            return roles
                .Select(role => new
                {
                    role.RoleId,
                    role.RoleName,
                    role.Description
                })
                .Cast<object>()
                .ToList();
        }

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

        private async Task<UserDto.UserResponse> ToResponse(Users user)
        {
            return MapToResponse(user, await ResolveRoleName(user.RoleId));
        }

        private static UserDto.UserResponse MapToResponse(Users user, IReadOnlyDictionary<byte, string> roleNames)
        {
            roleNames.TryGetValue(user.RoleId, out var roleName);
            return MapToResponse(user, roleName);
        }

        private static UserDto.UserResponse MapToResponse(Users user, string? roleName)
        {
            return new UserDto.UserResponse
            {
                UserId = user.UserId,
                RoleId = user.RoleId,
                RoleName = roleName ?? "User",
                CinemaId = user.CinemaId,
                FullName = user.FullName,
                Email = user.Email,
                Phone = user.Phone,
                AvatarUrl = user.AvatarUrl,
                DateOfBirth = user.DateOfBirth,
                Gender = user.Gender,
                IsActive = user.IsActive
            };
        }
    }
}
