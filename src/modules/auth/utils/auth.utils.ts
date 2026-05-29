export const sanitizeUser = (user: { password?: string }) => {
  const { password, ...safeUser } = user;
  return safeUser;
};