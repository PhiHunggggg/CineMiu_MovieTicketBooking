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

namespace Services.Authen
{
    public class UserService(IUserRepository userRepository, IRoleRepository roleRepository) : IUserService
    {
        public async Task<PaginationResponse<UserDto.UserResponse>> GetUsersAsync(
            string? keyword, byte? roleId, bool? isActive, int page, int pageSize)
        {
            page = Math.Max(page, 1);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var users = await userRepository.SearchAsync(keyword, roleId, isActive);
            var totalCount = users.Count;

            var items = new List<UserDto.UserResponse>();
            var startIndex = (page - 1) * pageSize;
            var endIndex = Math.Min(startIndex + pageSize, users.Count);
            for (var index = startIndex; index < endIndex; index++)
            {
                items.Add(await ToResponse(users[index]));
            }

            return new PaginationResponse<UserDto.UserResponse>
            {
                Page = page,
                PageSize = pageSize,
                TotalCount = totalCount,
                TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
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

            return await ToResponse(user);
        }

        public async Task CreateUserAsync(UserDto.UserRequest request)
        {
            var validationError = await ValidateUserRequest(request, requirePassword: true);
            if (validationError != null)
            {
                throw new ArgumentException(validationError);
            }

            var now = DateTime.UtcNow;
            var user = new Users
            {
                RoleId = request.RoleId == 0 ? (byte)1 : request.RoleId,
                CinemaId = request.CinemaId,
                FullName = request.FullName.Trim(),
                Email = request.Email.Trim(),
                Phone = OptionalText(request.Phone),
                PasswordHash = TokenHelper.HashPasswordForStorage(request.Password!),
                AvatarUrl = OptionalText(request.AvatarUrl),
                DateOfBirth = request.DateOfBirth,
                Gender = OptionalText(request.Gender),
                IsActive = request.IsActive,
                CreatedAt = now,
                UpdatedAt = now
            };

            await userRepository.CreateAsync(user);
        }

        public async Task UpdateUserAsync(int id, UserDto.UserRequest request)
        {
            var user = await userRepository.GetByIdAsync(id);
            if (user == null)
            {
                throw new ArgumentException("User not found");
            }


            user.RoleId = request.RoleId == 0 ? (byte)1 : request.RoleId;
            user.CinemaId = request.CinemaId;
            user.FullName = request.FullName.Trim();
            user.Email = request.Email.Trim();
            user.Phone = OptionalText(request.Phone);
            user.AvatarUrl = OptionalText(request.AvatarUrl);
            user.DateOfBirth = request.DateOfBirth;
            user.Gender = OptionalText(request.Gender);
            user.IsActive = request.IsActive;
            user.UpdatedAt = DateTime.UtcNow;

            if (!string.IsNullOrWhiteSpace(request.Password))
            {
                user.PasswordHash = TokenHelper.HashPasswordForStorage(request.Password);
            }

            await userRepository.UpdateAsync(user);
        }

        public async Task<List<object>> GetRolesAsync()
        {
            var roles = await userRepository.GetRolesAsync();
            var result = new List<object>();
            foreach (var role in roles)
            {
                result.Add(new
                {
                    roleId = role.RoleId,
                    roleName = role.RoleName,
                    description = role.Description
                });
            }

            return result;
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
        public async Task<object> GetProfile(int userId)
        {
            var user = await userRepository.GetByIdAsync(userId);
            if(user == null)
            {
                throw new KeyNotFoundException("Không tìm thấy người dùng");
            }
            var role = await roleRepository.GetByUserId(userId);
            return new
            {
                user.UserId,
                user.RoleId,
                user.CinemaId,
                user.FullName,
                user.Email,
                user.Phone,
                user.AvatarUrl,
                user.DateOfBirth,
                user.Gender,
                Role = role?.RoleName ?? "customer"
            };
        }   
        private async Task<UserDto.UserResponse> ToResponse(Users user)
        {
            return new UserDto.UserResponse
            {
                UserId = user.UserId,
                RoleId = user.RoleId,
                RoleName = await ResolveRoleName(user.RoleId) ?? "User",
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

        private async Task<string?> ValidateUserRequest(UserDto.UserRequest request, bool requirePassword, int? currentUserId = null)
        {
            if (string.IsNullOrWhiteSpace(request.FullName))
            {
                return "Full name is required";
            }

            if (string.IsNullOrWhiteSpace(request.Email) || !request.Email.Contains('@') || !request.Email.Contains('.'))
            {
                return "Valid email is required";
            }

            if (requirePassword && string.IsNullOrWhiteSpace(request.Password))
            {
                return "Password is required";
            }

            if (!string.IsNullOrWhiteSpace(request.Password) && request.Password.Length < 6)
            {
                return "Password must have at least 6 characters";
            }

            var roles = await userRepository.GetRolesAsync();
            var roleId = request.RoleId == 0 ? (byte)1 : request.RoleId;
            var roleExists = false;
            foreach (var role in roles)
            {
                if (role.RoleId == roleId)
                {
                    roleExists = true;
                    break;
                }
            }

            if (!roleExists)
            {
                return "Selected role does not exist";
            }

            if (await userRepository.EmailExistsAsync(request.Email.Trim(), currentUserId))
            {
                return "Email already exists";
            }

            return null;
        }

        private static string? OptionalText(string? value)
        {
            var trimmed = (value ?? "").Trim();
            return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
        }
    }
}
