using Microsoft.AspNetCore.Cryptography.KeyDerivation;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace Libs.Auth
{
    public class TokenHelper
    {
        public static bool IsValidPassword(string password, byte[] salt, string hashedParam)
        {
            var hashed = Convert.ToBase64String(KeyDerivation.Pbkdf2(
                password: password,
                salt: salt,
                prf: KeyDerivationPrf.HMACSHA1,
                iterationCount: 10000,
                numBytesRequested: 256 / 8));

            return hashed.Equals(hashedParam);
        }
        public static string HashPassword(string password, out byte[] salt)
        {
            salt = new byte[128 / 8];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(salt);
            }
            string hashed = Convert.ToBase64String(KeyDerivation.Pbkdf2(
                password: password,
                salt: salt,
                prf: KeyDerivationPrf.HMACSHA1,
                iterationCount: 10000,
                numBytesRequested: 256 / 8));

            return hashed;
        }
        public static string HashPasswordForStorage(string password)
        {
            var hash = HashPassword(password, out var salt);
            return $"{Convert.ToBase64String(salt)}:{hash}";
        }
        public static bool IsValidStoredPassword(string password, string? storedHash)
        {
            if (string.IsNullOrWhiteSpace(password) ||
                string.IsNullOrWhiteSpace(storedHash))
            {
                return false;
            }

            var parts = storedHash.Split(':', 2,
                StringSplitOptions.TrimEntries);

            if (parts.Length == 2)
            {
                try
                {
                    var salt = Convert.FromBase64String(parts[0]);

                    return IsValidPassword(
                        password,
                        salt,
                        parts[1]
                    );
                }
                catch (FormatException)
                {
                    return false;
                }
            }

            var bytes = SHA256.HashData(
                Encoding.UTF8.GetBytes(password)
            );

            return Convert.ToBase64String(bytes)
                .Equals(storedHash,
                    StringComparison.Ordinal);
        }
        public static string GenerateToken(string secretKey, int minuteExpireTime, string userId, string userName, string? roles,int? cinemaId)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(secretKey);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.Name, userName),
                new Claim(ClaimTypes.NameIdentifier, userId),
                new Claim(ClaimTypes.Role, roles ?? "User"),
            };

            // Nếu user thuộc rạp nào thì lưu vào token
            if (cinemaId.HasValue)
            {
                claims.Add(
                    new Claim("CinemaId", cinemaId.Value.ToString()));
            }

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),

                Expires = DateTime.UtcNow.AddMinutes(minuteExpireTime),

                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);

            // Phải dùng WriteToken để chuyển đối tượng SecurityToken thành chuỗi string đại diện cho JWT
            return tokenHandler.WriteToken(token);
        }
    }
}
