export const getUserId = (user) => Number(user?.userId || user?.id || 0) || null;
export const getUserEmail = (user) => user?.email || null;
