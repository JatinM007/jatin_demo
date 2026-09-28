export const ROLE_LEVEL_RANKS: Record<string, number[]> = {
  SUPER_ADMIN: [7, 8, 9],
  ADMIN:       [5, 6, 7, 8, 9],
  HR:          [4, 5, 6, 7],
  MANAGER:     [4, 5, 6, 7],
  EMPLOYEE:    [2, 3, 4, 5],
  INTERN:      [1, 2],
};

export const getLevelsForRole = <T extends { levelRank: number }>(
  roleName: string,
  levels: T[]
): T[] => {
  if (!roleName) return levels;
  const normalized = roleName.toUpperCase().replace("ROLE_", "");
  const allowedRanks = ROLE_LEVEL_RANKS[normalized];
  if (!allowedRanks) {
    return levels;
  }
  const filtered = levels.filter((l) => allowedRanks.includes(l.levelRank));
  return filtered.length > 0 ? filtered : levels;
};

