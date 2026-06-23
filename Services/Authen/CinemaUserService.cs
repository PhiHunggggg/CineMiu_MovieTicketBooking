using DTO.Authen;
using Libs.Auth;
using Repository.EFCore.Authen;

namespace Services.Authen
{
    public class CinemaUserService(ICinemaUserRepository cinemaUserRepository) : ICinemaUserService
    {
        public Task<List<CinemaUserDTO.UserResponse>> GetAllAsync(string? keyword) =>
            cinemaUserRepository.GetAllAsync(keyword);

        public Task<CinemaUserDTO.UserResponse> GetByIdAsync(int userId) =>
            cinemaUserRepository.GetByIdAsync(userId);

        public async Task<CinemaUserDTO.UserResponse> CreateAsync(CinemaUserDTO.UserRequest request)
        {
            NormalizeAndValidate(request);
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
            NormalizeAndValidate(request);
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

        private static void NormalizeAndValidate(CinemaUserDTO.UserRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.FullName) || string.IsNullOrWhiteSpace(request.Email))
            {
                throw new ArgumentException("FullName and Email are required");
            }

            request.FullName = request.FullName.Trim();
            request.Email = request.Email.Trim();
            request.Phone = OptionalText(request.Phone);
            request.AvatarUrl = OptionalText(request.AvatarUrl);
            request.Gender = OptionalText(request.Gender);
        }

        private static string? OptionalText(string? value) =>
            string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
