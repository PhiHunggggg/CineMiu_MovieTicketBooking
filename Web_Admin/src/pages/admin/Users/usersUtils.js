export const emptyUser = {
    roleId: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    avatarUrl: '',
    dateOfBirth: '',
    gender: '',
    isActive: true,
};

export const toDateInput = (value) => (value ? String(value).substring(0, 10) : '');

export const createUserFormData = (user, roles) => {
    if (!user) {
        return {
            ...emptyUser,
            roleId: roles[0]?.roleId || '',
        };
    }

    return {
        roleId: user.roleId || '',
        fullName: user.fullName || user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        password: '',
        avatarUrl: user.avatarUrl || '',
        dateOfBirth: toDateInput(user.dateOfBirth),
        gender: user.gender || '',
        isActive: user.isActive ?? true,
    };
};

export const getUserId = (user) => user.userId || user.id;

export const getUserName = (user) => user.fullName || user.name;

export const getRoleName = (roles, roleId) => {
    const role = roles.find((item) => Number(item.roleId) === Number(roleId));
    return role?.roleName || roleId;
};

export const getCustomerStats = (users) => {
    const customerUsers = users.filter((user) => Number(user.roleId) === 1);
    const activeCustomerCount = customerUsers.filter((user) => user.isActive).length;

    return {
        customerUsers,
        activeCustomerCount,
        lockedCustomerCount: customerUsers.length - activeCustomerCount,
    };
};
