using Entities;
using DTO.Authen;
using static DTO.Common.Paging;

namespace Services.Authen
{
    public interface IRoleService
    {
        Task<object> GetAll();
        Task<Role> GetById(int id);
        Task<Role> GetByName(string roleName);
    }
}
