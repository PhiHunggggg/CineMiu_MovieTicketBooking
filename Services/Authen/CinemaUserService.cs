using DTO.Authen;
using Libs.Auth;
using Microsoft.EntityFrameworkCore;
using Repository;
using Repository.EFCore.Authen;

namespace Services.Authen
{
    public class CinemaUserService(
        ICinemaUserRepository cinemaUserRepository,
        SqlServerDbContext context) : ICinemaUserService
    {
        public Task<List<CinemaUserDTO.UserResponse>> GetAllAsync(string? keyword) =>
            cinemaUserRepository.GetAllAsync(keyword);

        public Task<CinemaUserDTO.UserResponse> GetByIdAsync(int userId) =>
            cinemaUserRepository.GetByIdAsync(userId);

        public async Task<CinemaUserDTO.UserResponse> CreateAsync(CinemaUserDTO.UserRequest request)
        {
            await NormalizeAndValidateAsync(request);
            if (await cinemaUserRepository.EmailExistsAsync(request.Email))
            {
                throw new ArgumentException("Email already exists");
            }

            if (string.IsNullOrWhiteSpace(request.Password) && string.IsNullOrWhiteSpace(request.PasswordHash))
            {
                throw new ArgumentException("Password is required");
            }

            var passwordHash = !string.IsNullOrWhiteSpace(request.PasswordHash)
                ? request.PasswordHash
                : TokenHelper.HashPasswordForStorage(request.Password!);
            return await cinemaUserRepository.CreateAsync(request, passwordHash);
        }

        public async Task<CinemaUserDTO.UserResponse> UpdateAsync(
            int userId,
            CinemaUserDTO.UserRequest request)
        {
            await NormalizeAndValidateAsync(request);
            if (await cinemaUserRepository.EmailExistsAsync(request.Email, userId))
            {
                throw new ArgumentException("Email already exists");
            }

            var passwordHash = !string.IsNullOrWhiteSpace(request.PasswordHash)
                ? request.PasswordHash
                : !string.IsNullOrWhiteSpace(request.Password)
                    ? TokenHelper.HashPasswordForStorage(request.Password)
                    : null;
            return await cinemaUserRepository.UpdateAsync(userId, request, passwordHash);
        }

        public async Task<CinemaUserDTO.MessageResponse> DeactivateAsync(int userId)
        {
            await cinemaUserRepository.DeactivateAsync(userId);
            return new CinemaUserDTO.MessageResponse { Message = "User deactivated" };
        }

        private async Task NormalizeAndValidateAsync(CinemaUserDTO.UserRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.FullName) || string.IsNullOrWhiteSpace(request.Email))
            {
                throw new ArgumentException("FullName and Email are required");
            }

            request.FullName = request.FullName.Trim();
            request.Email = request.Email.Trim().ToLowerInvariant();
            request.Phone = OptionalText(request.Phone);
            request.AvatarUrl = OptionalText(request.AvatarUrl);
            request.Gender = OptionalText(request.Gender);

            if (!request.Email.Contains('@') || !request.Email.Contains('.'))
            {
                throw new ArgumentException("Email is invalid");
            }

            if (!string.IsNullOrWhiteSpace(request.Password) && request.Password.Length < 6)
            {
                throw new ArgumentException("Password must have at least 6 characters");
            }

            var roleId = request.RoleId
                ?? throw new ArgumentException("Role is required");
            var role = await context.Roles.AsNoTracking()
                .FirstOrDefaultAsync(item => item.RoleId == roleId)
                ?? throw new ArgumentException("Selected role does not exist");
            var roleName = role.RoleName.Trim().ToLowerInvariant();
            var requiresCinema = roleName.Contains("staff") ||
                roleName.Contains("manager");

            if (requiresCinema && !request.CinemaId.HasValue)
            {
                throw new ArgumentException("Cinema is required for manager and staff accounts");
            }

            if (request.CinemaId.HasValue &&
                !await context.Cinemas.AsNoTracking().AnyAsync(item => item.CinemaId == request.CinemaId.Value))
            {
                throw new ArgumentException("Selected cinema does not exist");
            }
        }

        private static string? OptionalText(string? value) =>
            string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
