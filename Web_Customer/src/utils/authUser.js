export function getUserId(user) {
  const rawId = user?.userId ?? user?.UserId ?? user?.id ?? user?.Id;
  const numericId = Number(rawId);
  return Number.isInteger(numericId) && numericId > 0 ? numericId : null;
}

export function getUserEmail(user) {
  return user?.email ?? user?.Email ?? null;
}
