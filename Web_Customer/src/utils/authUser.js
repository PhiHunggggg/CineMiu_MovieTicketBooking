export function getUserId(user) {
    return user?.userId ?? user?.UserId ?? user?.id ?? user?.Id ?? null;
}

export function getUserEmail(user) {
    return user?.email ?? user?.Email ?? null;
}
